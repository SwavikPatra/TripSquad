from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, LargeBinary, Integer, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from enum import Enum as PyEnum

# Enum must be defined first
class MembershipRole(str, PyEnum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"

class AttachmentType(str, PyEnum):
    DOCUMENT = "document"
    MEDIA = "media"

class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    members = relationship("GroupMember", back_populates="group")
    itinerary_entries = relationship("ItineraryEntry", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    # Primary key columns must be explicitly defined
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete= "CASCADE"), primary_key=True)
    
    role = Column(Enum(MembershipRole), default=MembershipRole.MEMBER)
    joined_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    group = relationship("Group", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

class GroupAttachment(Base):
    __tablename__ = "group_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    original_filename = Column(String(255), nullable=False)
    file_url = Column(String, nullable=False)  # Full S3 path or pre-signed URL
    attachment_type = Column(Enum(AttachmentType), nullable=False)
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (optional, in case you want to access them easily)
    group = relationship("Group", backref="attachments")

