from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, LargeBinary, Integer, Enum, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
import secrets
import string
from enum import Enum as PyEnum
from datetime import timedelta

# Enum must be defined first

class MembershipRole(str, PyEnum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"

class AttachmentType(str, PyEnum):
    DOCUMENT = "document"
    MEDIA = "media"

class InviteStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

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
    invites = relationship("GroupInvite", back_populates="group", cascade="all, delete-orphan")
    polls = relationship("Poll", back_populates="group", cascade="all, delete-orphan")
    creator = relationship("User")
    
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
    s3_key = Column(String, nullable=False)
    attachment_type = Column(Enum(AttachmentType), nullable=False)
    
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships (optional, in case you want to access them easily)
    group = relationship("Group", backref="attachments")

class GroupInvite(Base):
    __tablename__ = "group_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    secret_code = Column(String(8), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    last_refreshed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    group = relationship("Group", back_populates="invites")
    requests = relationship("JoinRequest", back_populates="invite", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.secret_code = self._generate_code()
        self.expires_at = func.now() + timedelta(days=1)
    
    @staticmethod
    def _generate_code(length=8):
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def refresh_code(self):
        for request in self.requests:
            request.status = InviteStatus.REJECTED
        self.secret_code = self._generate_code()
        self.last_refreshed_at = func.now()
        self.expires_at = func.now() + timedelta(days=1)

class JoinRequest(Base):
    __tablename__ = "join_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invite_id = Column(String(8), ForeignKey("group_invites.secret_code", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Relationships
    invite = relationship("GroupInvite", back_populates="requests")
    user = relationship("User", foreign_keys=[user_id])
    processor = relationship("User", foreign_keys=[processed_by])
    
    __table_args__ = (
        UniqueConstraint('invite_id', 'user_id', name='_invite_user_uc'),
    )
