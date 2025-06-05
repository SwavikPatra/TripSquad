from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String,Column
from sqlalchemy.orm import Mapped, mapped_column, relationship, relationship
from app.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String) 
    

    # Relationships
    created_polls = relationship("Poll", back_populates="creator")
    poll_votes = relationship("UserVote", back_populates="user")
    group_memberships = relationship("GroupMember", back_populates="user")
    join_requests = relationship("JoinRequest", foreign_keys="[JoinRequest.user_id]", back_populates="user")
    processed_requests = relationship("JoinRequest", foreign_keys="[JoinRequest.processed_by]", back_populates="processor")