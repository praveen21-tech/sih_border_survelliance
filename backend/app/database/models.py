import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Camera(Base):
    __tablename__ = 'cameras'

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location = Column(String(256), nullable=False)
    zone = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    stream_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sightings = relationship('PersonSighting', back_populates='camera', cascade='all, delete-orphan')
    events = relationship('SurveillanceEvent', back_populates='camera', cascade='all, delete-orphan')

class GlobalPerson(Base):
    __tablename__ = 'global_persons'

    id = Column(String(64), primary_key=True, index=True)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    appearance_description = Column(Text, nullable=True)
    best_crop_path = Column(String(512), nullable=True)
    total_sightings = Column(Integer, default=1)
    status = Column(String(32), default='active')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sightings = relationship('PersonSighting', back_populates='global_person', cascade='all, delete-orphan')

class PersonSighting(Base):
    __tablename__ = 'person_sightings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    global_person_id = Column(String(64), ForeignKey('global_persons.id'), nullable=False, index=True)
    camera_id = Column(String(64), ForeignKey('cameras.id'), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    bbox_x1 = Column(Float, nullable=False)
    bbox_y1 = Column(Float, nullable=False)
    bbox_x2 = Column(Float, nullable=False)
    bbox_y2 = Column(Float, nullable=False)
    detection_confidence = Column(Float, nullable=False)
    reid_similarity_score = Column(Float, nullable=True)
    zone_name = Column(String(128), nullable=True)
    crop_path = Column(String(512), nullable=True)
    embedding_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    global_person = relationship('GlobalPerson', back_populates='sightings')
    camera = relationship('Camera', back_populates='sightings')

class SurveillanceEvent(Base):
    __tablename__ = 'surveillance_events'

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), ForeignKey('cameras.id'), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), default='medium', index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    description = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    camera = relationship('Camera', back_populates='events')

class VehicleRecord(Base):
    __tablename__ = 'vehicle_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), ForeignKey('cameras.id'), nullable=False)
    license_plate = Column(String(32), index=True, nullable=True)
    vehicle_type = Column(String(64), nullable=True)
    color = Column(String(64), nullable=True)
    speed_kmh = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    crop_path = Column(String(512), nullable=True)

class WatchlistRecord(Base):
    __tablename__ = 'watchlist_records'

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    reason = Column(String(256), nullable=False)
    threat_level = Column(String(32), default='high')
    added_at = Column(DateTime, default=datetime.datetime.utcnow)
    reference_image_path = Column(String(512), nullable=True)
    embedding_json = Column(JSON, nullable=True)

class AudioAlertRecord(Base):
    __tablename__ = 'audio_alerts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    sector = Column(String(64), index=True)
    post_id = Column(String(64))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    category = Column(String(64), index=True)
    event_label = Column(String(128))
    threat_level = Column(String(32), default='MEDIUM')
    confidence = Column(Float, default=0.0)
    transcript = Column(Text, nullable=True)
    audio_path = Column(String(512), nullable=True)
    sha256_hash = Column(String(64), nullable=True)
    acknowledged = Column(Boolean, default=False)

class DroneTrackRecord(Base):
    __tablename__ = 'drone_tracks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    track_id = Column(String(64), index=True)
    sector = Column(String(64))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    threat_type = Column(String(64))
    confidence = Column(Float, default=0.0)
    bpf_hz = Column(Float, nullable=True)
    rpm = Column(Float, nullable=True)
    distance_estimate_m = Column(Float, nullable=True)
    visual_confirmed = Column(Boolean, default=False)
