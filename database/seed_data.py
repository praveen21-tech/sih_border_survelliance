import datetime
import random
import numpy as np
from database.db_session import SessionLocal, init_db
from database.models import (
    Camera,
    GlobalPerson,
    PersonSighting,
    SurveillanceEvent,
    VehicleRecord,
    WatchlistRecord,
    WatchlistHit,
)

def generate_mock_embedding(seed_val: int = 0, dim: int = 512):
    """Generates a deterministic normalized unit vector for mock Re-ID embeddings."""
    rng = np.random.RandomState(seed_val)
    vec = rng.randn(dim)
    norm = np.linalg.norm(vec)
    return (vec / norm).tolist()

def seed_surveillance_database():
    """Seeds the database with cameras, person tracks, watchlist items, events, and vehicles."""
    init_db()
    db = SessionLocal()

    # Check if database already has cameras
    if db.query(Camera).first():
        print("Database already contains records. Skipping seed.")
        db.close()
        return

    print("Seeding database with surveillance intelligence...")
    now = datetime.datetime.utcnow()

    # 1. Cameras across surveillance zones
    cameras = [
        Camera(
            id="CAM_01_GATE_NORTH",
            name="Main North Gate Entry",
            location="Perimeter North Gate",
            zone="Perimeter Access",
            latitude=28.6139,
            longitude=77.2090,
            is_active=True
        ),
        Camera(
            id="CAM_02_LOBBY",
            name="Building A Main Lobby",
            location="Building A Ground Floor",
            zone="Reception Area",
            latitude=28.6141,
            longitude=77.2092,
            is_active=True
        ),
        Camera(
            id="CAM_03_CORRIDOR_1F",
            name="Floor 1 East Corridor",
            location="Building A Level 1",
            zone="Executive Wing",
            latitude=28.6142,
            longitude=77.2094,
            is_active=True
        ),
        Camera(
            id="CAM_04_SERVER_ROOM",
            name="Data Center & Server Vault",
            location="Building B Basement 1",
            zone="Restricted Security Zone",
            latitude=28.6138,
            longitude=77.2088,
            is_active=True
        ),
        Camera(
            id="CAM_05_PARKING_WEST",
            name="West Parking Lot & ANPR",
            location="Outdoor West Sector",
            zone="Parking & Perimeter",
            latitude=28.6135,
            longitude=77.2085,
            is_active=True
        )
    ]
    db.add_all(cameras)
    db.commit()

    # 2. Watchlist records
    watchlist = [
        WatchlistRecord(
            id="WL_101",
            person_name="Vikram Singh",
            aliases="Vicky, Phantom",
            reason="Wanted for corporate espionage and unauthorized server room breach",
            risk_level="critical",
            reference_image="data/crops/watchlist_vikram.jpg",
            is_active=True,
            added_at=now - datetime.timedelta(days=10)
        ),
        WatchlistRecord(
            id="WL_102",
            person_name="Marcus Vance",
            aliases="Red Mask",
            reason="Repeated perimeter fence climbing and vehicle theft suspect",
            risk_level="high",
            reference_image="data/crops/watchlist_marcus.jpg",
            is_active=True,
            added_at=now - datetime.timedelta(days=5)
        )
    ]
    db.add_all(watchlist)
    db.commit()

    # 3. Global Persons with Cross-Camera Tracks (Feature 13 Demonstration)
    # Person 1: Suspect moving through Gate -> Lobby -> Corridor -> Server Room
    p1_emb = generate_mock_embedding(seed_val=101)
    person1 = GlobalPerson(
        id="PERSON_001",
        first_seen=now - datetime.timedelta(minutes=45),
        last_seen=now - datetime.timedelta(minutes=5),
        appearance_description="Male in black hoodie, gray backpack, dark jeans, white sneakers",
        best_crop_path="data/crops/person_001_best.jpg",
        total_sightings=4,
        status="suspect"
    )
    db.add(person1)

    # Sightings for Person 1
    p1_sightings = [
        PersonSighting(
            global_person_id="PERSON_001",
            camera_id="CAM_01_GATE_NORTH",
            timestamp=now - datetime.timedelta(minutes=45),
            bbox_x1=120.0, bbox_y1=180.0, bbox_x2=340.0, bbox_y2=600.0,
            detection_confidence=0.96,
            reid_similarity_score=1.0,
            zone_name="Perimeter Access",
            crop_path="data/crops/p1_cam1.jpg",
            embedding_json=p1_emb
        ),
        PersonSighting(
            global_person_id="PERSON_001",
            camera_id="CAM_02_LOBBY",
            timestamp=now - datetime.timedelta(minutes=32),
            bbox_x1=450.0, bbox_y1=120.0, bbox_x2=620.0, bbox_y2=580.0,
            detection_confidence=0.94,
            reid_similarity_score=0.89,
            zone_name="Reception Area",
            crop_path="data/crops/p1_cam2.jpg",
            embedding_json=p1_emb
        ),
        PersonSighting(
            global_person_id="PERSON_001",
            camera_id="CAM_03_CORRIDOR_1F",
            timestamp=now - datetime.timedelta(minutes=20),
            bbox_x1=200.0, bbox_y1=150.0, bbox_x2=380.0, bbox_y2=590.0,
            detection_confidence=0.91,
            reid_similarity_score=0.86,
            zone_name="Executive Wing",
            crop_path="data/crops/p1_cam3.jpg",
            embedding_json=p1_emb
        ),
        PersonSighting(
            global_person_id="PERSON_001",
            camera_id="CAM_04_SERVER_ROOM",
            timestamp=now - datetime.timedelta(minutes=5),
            bbox_x1=180.0, bbox_y1=140.0, bbox_x2=350.0, bbox_y2=610.0,
            detection_confidence=0.95,
            reid_similarity_score=0.92,
            zone_name="Restricted Security Zone",
            crop_path="data/crops/p1_cam4.jpg",
            embedding_json=p1_emb
        )
    ]
    db.add_all(p1_sightings)

    # Person 2: Authorized Staff
    p2_emb = generate_mock_embedding(seed_val=202)
    person2 = GlobalPerson(
        id="PERSON_002",
        first_seen=now - datetime.timedelta(hours=2),
        last_seen=now - datetime.timedelta(hours=1, minutes=10),
        appearance_description="Female wearing blue blazer, white shirt, black trousers",
        best_crop_path="data/crops/person_002_best.jpg",
        total_sightings=2,
        status="active"
    )
    db.add(person2)

    p2_sightings = [
        PersonSighting(
            global_person_id="PERSON_002",
            camera_id="CAM_01_GATE_NORTH",
            timestamp=now - datetime.timedelta(hours=2),
            bbox_x1=300.0, bbox_y1=150.0, bbox_x2=480.0, bbox_y2=580.0,
            detection_confidence=0.98,
            reid_similarity_score=1.0,
            zone_name="Perimeter Access",
            crop_path="data/crops/p2_cam1.jpg",
            embedding_json=p2_emb
        ),
        PersonSighting(
            global_person_id="PERSON_002",
            camera_id="CAM_02_LOBBY",
            timestamp=now - datetime.timedelta(hours=1, minutes=50),
            bbox_x1=150.0, bbox_y1=160.0, bbox_x2=320.0, bbox_y2=590.0,
            detection_confidence=0.95,
            reid_similarity_score=0.91,
            zone_name="Reception Area",
            crop_path="data/crops/p2_cam2.jpg",
            embedding_json=p2_emb
        )
    ]
    db.add_all(p2_sightings)

    # 4. Surveillance Events (Intrusions, Loitering, Fence breach)
    events = [
        SurveillanceEvent(
            event_type="intrusion",
            camera_id="CAM_04_SERVER_ROOM",
            timestamp=now - datetime.timedelta(minutes=5),
            severity="critical",
            description="Unauthorized person entry detected in Server Room vault after business hours.",
            global_person_id="PERSON_001",
            evidence_snapshot="data/crops/event_intrusion_cam4.jpg",
            is_resolved=False
        ),
        SurveillanceEvent(
            event_type="loitering",
            camera_id="CAM_03_CORRIDOR_1F",
            timestamp=now - datetime.timedelta(minutes=22),
            severity="medium",
            description="Person remained stationary near the Executive Boardroom door for more than 4 minutes.",
            global_person_id="PERSON_001",
            evidence_snapshot="data/crops/event_loitering_cam3.jpg",
            is_resolved=False
        ),
        SurveillanceEvent(
            event_type="fence_breach",
            camera_id="CAM_05_PARKING_WEST",
            timestamp=now - datetime.timedelta(hours=3),
            severity="high",
            description="Boundary tripwire breached at West Parking fence perimeter.",
            evidence_snapshot="data/crops/event_fence_cam5.jpg",
            is_resolved=True
        ),
        SurveillanceEvent(
            event_type="night_movement",
            camera_id="CAM_01_GATE_NORTH",
            timestamp=now - datetime.timedelta(hours=6),
            severity="low",
            description="Low-light movement detected near delivery bay gate.",
            evidence_snapshot="data/crops/event_night_cam1.jpg",
            is_resolved=True
        )
    ]
    db.add_all(events)

    # 5. Vehicle Records (ANPR)
    vehicles = [
        VehicleRecord(
            plate_number="DL-01-AB-1234",
            vehicle_type="suv",
            color="black",
            camera_id="CAM_05_PARKING_WEST",
            timestamp=now - datetime.timedelta(minutes=50),
            confidence=0.98,
            snapshot_path="data/crops/veh_plate_1234.jpg"
        ),
        VehicleRecord(
            plate_number="MH-12-DE-5678",
            vehicle_type="truck",
            color="white",
            camera_id="CAM_01_GATE_NORTH",
            timestamp=now - datetime.timedelta(hours=1, minutes=30),
            confidence=0.94,
            snapshot_path="data/crops/veh_plate_5678.jpg"
        ),
        VehicleRecord(
            plate_number="KA-05-XY-9999",
            vehicle_type="motorcycle",
            color="red",
            camera_id="CAM_05_PARKING_WEST",
            timestamp=now - datetime.timedelta(hours=4),
            confidence=0.91,
            snapshot_path="data/crops/veh_plate_9999.jpg"
        )
    ]
    db.add_all(vehicles)

    # 6. Watchlist Alert Hit
    watchlist_hit = WatchlistHit(
        watchlist_id="WL_101",
        global_person_id="PERSON_001",
        camera_id="CAM_04_SERVER_ROOM",
        timestamp=now - datetime.timedelta(minutes=5),
        match_confidence=0.93,
        snapshot_path="data/crops/hit_vikram_cam4.jpg",
        alert_status="unacknowledged"
    )
    db.add(watchlist_hit)

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_surveillance_database()
