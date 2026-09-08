import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Camera(Base):
    """CCTV Camera entity representing deployed camera nodes."""
    __tablename__ = "cameras"

    id = Column(String(50), primary_key=True)  # e.g., 'CAM_01_GATE'
    name = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)
    zone = Column(String(100), nullable=False)  # e.g., 'Perimeter East', 'Main Lobby'
    rtsp_url = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sightings = relationship("PersonSighting", back_populates="camera")
    events = relationship("SurveillanceEvent", back_populates="camera")
    vehicle_records = relationship("VehicleRecord", back_populates="camera")
    watchlist_hits = relationship("WatchlistHit", back_populates="camera")


class GlobalPerson(Base):
    """
    Unified global identity for a person tracked across multiple cameras (Feature 13).
    """
    __tablename__ = "global_persons"

    id = Column(String(50), primary_key=True)  # e.g., 'PERSON_001'
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    appearance_description = Column(Text, nullable=True)  # e.g., 'Wearing dark hoodie, blue jeans, white sneakers'
    best_crop_path = Column(String(255), nullable=True)
    total_sightings = Column(Integer, default=1)
    status = Column(String(50), default="active")  # 'active', 'archived', 'suspect'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sightings = relationship("PersonSighting", back_populates="global_person", order_by="PersonSighting.timestamp")
    watchlist_hits = relationship("WatchlistHit", back_populates="global_person")


class PersonSighting(Base):
    """
    Individual detection & feature extraction event of a person in a specific camera frame.
    """
    __tablename__ = "person_sightings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    global_person_id = Column(String(50), ForeignKey("global_persons.id"), nullable=False, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    bbox_x1 = Column(Float, nullable=True)
    bbox_y1 = Column(Float, nullable=True)
    bbox_x2 = Column(Float, nullable=True)
    bbox_y2 = Column(Float, nullable=True)
    detection_confidence = Column(Float, default=0.9)
    reid_similarity_score = Column(Float, default=1.0)
    crop_path = Column(String(255), nullable=True)
    zone_name = Column(String(100), nullable=True)
    embedding_json = Column(JSON, nullable=True)  # Stored Re-ID vector (512-d list)

    camera = relationship("Camera", back_populates="sightings")
    global_person = relationship("GlobalPerson", back_populates="sightings")


class SurveillanceEvent(Base):
    """
    Security events (Intrusion, Virtual Fence Violation, Loitering, Suspicious Movement).
    """
    __tablename__ = "surveillance_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(50), nullable=False, index=True)  # 'intrusion', 'loitering', 'fence_breach', 'suspicious_activity'
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    severity = Column(String(20), default="medium")  # 'low', 'medium', 'high', 'critical'
    description = Column(Text, nullable=False)
    global_person_id = Column(String(50), nullable=True)
    evidence_snapshot = Column(String(255), nullable=True)
    is_resolved = Column(Boolean, default=False)

    camera = relationship("Camera", back_populates="events")


class VehicleRecord(Base):
    """ANPR & Vehicle tracking records."""
    __tablename__ = "vehicle_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plate_number = Column(String(50), nullable=False, index=True)
    vehicle_type = Column(String(50), default="car")  # 'car', 'truck', 'bus', 'motorcycle', 'suv'
    color = Column(String(50), nullable=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    confidence = Column(Float, default=0.95)
    snapshot_path = Column(String(255), nullable=True)

    camera = relationship("Camera", back_populates="vehicle_records")


class WatchlistRecord(Base):
    """Target watchlist database for criminal intelligence & persons of interest."""
    __tablename__ = "watchlist_records"

    id = Column(String(50), primary_key=True)  # e.g., 'WL_001'
    person_name = Column(String(100), nullable=False)
    aliases = Column(String(200), nullable=True)
    reason = Column(Text, nullable=False)  # e.g., 'Wanted for facility trespassing / unauthorized entry'
    risk_level = Column(String(20), default="high")  # 'low', 'medium', 'high', 'critical'
    reference_image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    hits = relationship("WatchlistHit", back_populates="watchlist_record")


class WatchlistHit(Base):
    """Real-time alert matches when a watchlisted person is sighted."""
    __tablename__ = "watchlist_hits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    watchlist_id = Column(String(50), ForeignKey("watchlist_records.id"), nullable=False, index=True)
    global_person_id = Column(String(50), ForeignKey("global_persons.id"), nullable=True)
    camera_id = Column(String(50), ForeignKey("cameras.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    match_confidence = Column(Float, default=0.88)
    snapshot_path = Column(String(255), nullable=True)
    alert_status = Column(String(50), default="unacknowledged")  # 'unacknowledged', 'verified', 'dismissed'

    watchlist_record = relationship("WatchlistRecord", back_populates="hits")
    global_person = relationship("GlobalPerson", back_populates="watchlist_hits")
    camera = relationship("Camera", back_populates="watchlist_hits")
