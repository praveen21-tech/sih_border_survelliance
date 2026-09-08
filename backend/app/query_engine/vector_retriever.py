import os
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database.models import SurveillanceEvent, WatchlistRecord, GlobalPerson

class SurveillanceVectorRetriever:
    """
    Semantic Vector Retriever for Surveillance Knowledge & Incident Reports.
    Indexes narrative descriptions, behavior logs, watchlist profiles, and provides
    semantic similarity retrieval.
    """

    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or "./data/vector_db"
        self.collection = None
        self._init_vector_store()

    def _init_vector_store(self):
        """Initializes ChromaDB or lightweight internal index."""
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            client = chromadb.PersistentClient(path=self.persist_dir)
            self.collection = client.get_or_create_collection(
                name="surveillance_intelligence",
                metadata={"description": "CCTV incident logs, behavior, and watchlist intel"}
            )
            print("[SurveillanceVectorRetriever] ChromaDB vector store initialized.")
        except Exception as e:
            print(f"[SurveillanceVectorRetriever] ChromaDB fallback ({e}). In-memory semantic index active.")
            self.collection = None

    def sync_from_database(self, db: Session):
        """Syncs all events, persons, and watchlist items into the vector collection."""
        if self.collection is None:
            return

        documents = []
        metadatas = []
        ids = []

        # 1. Index Surveillance Events
        events = db.query(SurveillanceEvent).all()
        for ev in events:
            text_doc = f"Security Event: {ev.event_type}. Severity: {ev.severity}. Camera: {ev.camera_id}. Details: {ev.description}"
            documents.append(text_doc)
            metadatas.append({"type": "event", "event_id": str(ev.id), "severity": ev.severity, "camera": ev.camera_id})
            ids.append(f"event_{ev.id}")

        # 2. Index Watchlist Profiles
        watchlist = db.query(WatchlistRecord).all()
        for w in watchlist:
            text_doc = f"Watchlist Target: {w.person_name} (Aliases: {w.aliases or 'None'}). Risk: {w.risk_level}. Profile: {w.reason}"
            documents.append(text_doc)
            metadatas.append({"type": "watchlist", "watchlist_id": w.id, "risk": w.risk_level})
            ids.append(f"wl_{w.id}")

        # 3. Index Global Person Appearance
        persons = db.query(GlobalPerson).all()
        for p in persons:
            if p.appearance_description:
                text_doc = f"Person ID: {p.id}. Status: {p.status}. Appearance: {p.appearance_description}. Sightings: {p.total_sightings}"
                documents.append(text_doc)
                metadatas.append({"type": "person", "person_id": p.id, "status": p.status})
                ids.append(f"person_{p.id}")

        if documents:
            try:
                self.collection.upsert(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                print(f"[SurveillanceVectorRetriever] Synchronized {len(documents)} intelligence records into ChromaDB.")
            except Exception as e:
                print(f"[SurveillanceVectorRetriever] Sync error: {e}")

    def query(self, db: Session, query_text: str, n_results: int = 4) -> List[Dict[str, Any]]:
        """
        Retrieves top-N relevant semantic context documents matching the natural query.
        """
        # ChromaDB Query
        if self.collection is not None:
            try:
                # Ensure we have docs
                if self.collection.count() == 0:
                    self.sync_from_database(db)

                results = self.collection.query(
                    query_texts=[query_text],
                    n_results=min(n_results, max(1, self.collection.count()))
                )
                
                hits = []
                if results and "documents" in results and results["documents"]:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
                    dists = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(docs)
                    for d, m, dist in zip(docs, metas, dists):
                        hits.append({
                            "document": d,
                            "metadata": m,
                            "relevance_score": round(1.0 - (dist if dist <= 1.0 else 0.5), 3)
                        })
                return hits
            except Exception as e:
                print(f"[SurveillanceVectorRetriever] Query error ({e}). Using relational search.")

        # In-memory relational keyword/description search fallback
        q_lower = query_text.lower()
        events = db.query(SurveillanceEvent).all()
        scored_events = []
        for ev in events:
            desc = (ev.description + " " + ev.event_type + " " + ev.severity).lower()
            score = sum(1 for w in q_lower.split() if w in desc)
            if score > 0:
                scored_events.append((score, {
                    "document": f"Event: {ev.event_type} at {ev.camera_id}. Severity: {ev.severity}. {ev.description}",
                    "metadata": {"type": "event", "event_id": str(ev.id), "camera": ev.camera_id},
                    "relevance_score": round(min(0.95, 0.4 + 0.15 * score), 2)
                }))

        scored_events.sort(key=lambda x: x[0], reverse=True)
        return [item[1] for item in scored_events[:n_results]]
