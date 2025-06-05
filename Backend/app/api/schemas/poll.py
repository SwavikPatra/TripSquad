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

class UserVoteBase(BaseModel):
    user_id: UUID
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

class PollWithOptions(Poll):
    options: List[PollOption]
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