import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..config import settings
from .models import Base, Camera

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={'check_same_thread': False} if 'sqlite' in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    seed_default_cameras()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_default_cameras():
    db = SessionLocal()
    count = db.query(Camera).count()
    if count == 0:
        cameras = [
            Camera(id='cam-01', name='Sector 4 Perimeter Fence', location='Border Line Alpha', zone='Perimeter North', stream_url='/recordings/cam-01.mp4'),
            Camera(id='cam-02', name='Main Checkpoint & ANPR Gate', location='Access Road Gate 1', zone='Vehicle Checkpoint', stream_url='/recordings/cam-02.mp4'),
            Camera(id='cam-03', name='Low-Light Night Sentry', location='Outpost Bravo', zone='Night Sentry Sector', stream_url='/recordings/cam-03.mp4'),
            Camera(id='cam-04', name='Virtual Fence Intrusion Zone', location='Forward Watchtower 3', zone='Buffer Zone', stream_url='/recordings/cam-04.mp4'),
            Camera(id='cam-05', name='Acoustic-Optical Drone Sentry', location='Border Sector Echo', zone='Airspace Sentry', stream_url='/recordings/cam-05.mp4'),
            Camera(id='cam-06', name='Live Facial Recognition Terminal', location='Command Post Entry', zone='Facial Recognition Gate', stream_url='webcam'),
            Camera(id='CAM_01_PLAZA', name='Central Plaza (Wide View)', location='Campus Courtyard', zone='Central Plaza', stream_url='/recordings/cam1.mp4'),
            Camera(id='CAM_02_STEPS', name='Plaza Entrance & Steps', location='Staircase Entrance', zone='Plaza Steps & Entrance', stream_url='/recordings/cam2.mp4')
        ]
        for c in cameras:
            db.add(c)
        db.commit()
    db.close()
