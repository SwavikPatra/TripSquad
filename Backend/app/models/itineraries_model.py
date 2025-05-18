from sqlalchemy import Column, String, UUID, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class ItineraryEntry(Base):
    __tablename__ = 'itinerary_entries'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('groups.id'), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Core fields
    title = Column(String(100), nullable=False)
    description = Column(Text)
    day_number = Column(Integer, nullable=True)
    
    # Google Maps location (simple string link)
    google_maps_link = Column(String(500))  # Stores full Google Maps URLs like "https://goo.gl/maps/..."
    
    # Relationships
    group = relationship("Group", back_populates="itinerary_entries")
    creator = relationship("User")
    attachments = relationship("ItineraryAttachment", back_populates="entry", cascade="all, delete-orphan")

class ItineraryAttachment(Base):
    __tablename__ = 'itinerary_attachments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id = Column(UUID(as_uuid=True), ForeignKey('itinerary_entries.id'), nullable=False)
    original_filename = Column(String(255))
    file_url = Column(String, nullable=False)
    file_type = Column(String(50))
    
    entry = relationship("ItineraryEntry", back_populates="attachments")