from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum
from uuid import UUID

class PollType(str, Enum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"

class PollBase(BaseModel):
    question: str
    poll_type: PollType
    group_id: UUID
    is_active: bool = True

class PollCreate(PollBase):
    options: List[str]

class VotersResponse(BaseModel):
    id: UUID
    username: str
    email: str

    class Config:
        from_attributes = True 

class PollOptionResponse(BaseModel):
    id: UUID
    option_text: str  # Directly map to what React expects (will be set from 'text' field)
    poll_id: UUID
    created_at: datetime
    vote_count: int = 0  # Will be calculated and set manually in repository
    
    class Config:
        from_attributes = True

class PollResponse(BaseModel):
    id: UUID
    question: str
    poll_type: str
    group_id: UUID
    created_by: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    options: List[PollOptionResponse] = []
    can_delete: bool = False  
    
    class Config:
        from_attributes = True

class Poll(PollBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class PollOptionBase(BaseModel):
    text: str
    poll_id: UUID

class PollOptionCreate(PollOptionBase):
    pass

class PollOption(PollOptionBase):
    id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# NEW: PollOption with vote count
class PollOptionWithCount(PollOption):
    vote_count: int

class UserVoteBase(BaseModel):
    poll_id: UUID
    option_id: UUID

class UserVoteCreate(UserVoteBase):
    pass

class UserVote(UserVoteBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# UPDATED: Use PollOptionWithCount instead of PollOption
class PollWithOptions(Poll):
    options: List[PollOptionWithCount]
    user_votes: Optional[List[UserVote]] = None

class PollSummary(BaseModel):
    poll: Poll
    options: List[dict]  # {option: PollOption, count: int}
    total_votes: int
    user_vote: Optional[List[str]] = None  # option IDs the current user selected

class OptionResult(BaseModel):
    option_id: UUID
    text: str
    vote_count: int
    voters: List[str]

class PollResults(BaseModel):
    poll_id: UUID
    question: str
    poll_type: PollType
    options: List[OptionResult]
    total_votes: int
    all_voters: List[str]