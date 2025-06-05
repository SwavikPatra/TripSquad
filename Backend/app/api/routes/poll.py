from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.database import get_db
from app.core.auth import get_current_user
from app.repository.poll import pollrepo
from logger import logger
from app.api.schemas.poll import (
    Poll,
    PollBase,
    PollCreate,
    PollOption,
    PollOptionBase,
    PollOptionCreate,
    PollSummary,
    PollType,
    OptionResult,
    PollWithOptions,
    PollResults,
    UserVote,
    UserVoteBase,
    UserVoteCreate
)
from app.api.schemas.auth import UserData
from typing import List

router = APIRouter(prefix="/polls")

@router.post("/", response_model=Poll)
def create_poll(
    request: Request,
    poll_data: PollCreate,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log_data = {
        "source": request.url.path,
        "clientip": request.client.host,
        "username": current_user.email,
        "data": {"poll_data": poll_data.model_dump()}
    }
    logger.log_message("INFO", "Processing request", log_data, "my_app")
    return pollrepo.create_poll(db, current_user.id, poll_data)

@router.get("/{poll_id}", response_model=PollWithOptions)
def read_poll(
    poll_id: UUID,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        poll = pollrepo.get_poll_info(poll_id, db)
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        raw_options = pollrepo.get_all_options(poll_id, db)
        raw_votes = pollrepo.get_all_votes(poll_id, db)
            
        # ✅ Convert ORM -> Pydantic models
        options = [PollOption.model_validate(opt, from_attributes=True) for opt in raw_options]
        votes = [UserVote.model_validate(v, from_attributes=True) for v in raw_votes]

        
        # print(f"poll: id: {poll.id}, question: {poll.question}, poll_type: {poll.poll_type}, group_id: {poll.group_id}, is_active: {poll.is_active}, created_at: {poll.created_at}, updated_at: {poll.updated_at}, options: {options}, votes: {votes}")

        return PollWithOptions(
            id=poll.id,
            question=poll.question,
            poll_type=poll.poll_type,
            group_id=poll.group_id,
            is_active=poll.is_active,
            created_at=poll.created_at,
            updated_at=poll.updated_at,
            options=options,  # Must be list of PollOption ORM models
            user_votes=votes  # Must be list of UserVote ORM models
        )
    except Exception as e:
        print("working till 71")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error while fetching poll: {str(e)}"
        )


@router.get("/{group_id}/polls", response_model=List[Poll])
def read_group_polls(group_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    polls = pollrepo.get_polls_by_group(db, group_id, skip=skip, limit=limit)
    return polls  

@router.post("/vote", response_model=UserVote)
def vote_poll(
    vote: UserVoteCreate,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the poll exists and is active
    poll = pollrepo.get_poll_info(db, vote.poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if not poll.is_active:
        raise HTTPException(status_code=400, detail="Poll is not active")
    
    # Verify the option exists
    option = db.query(PollOption).filter(
        PollOption.id == vote.option_id,
        PollOption.poll_id == vote.poll_id
    ).first()
    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Option not found in this poll")
    
    return pollrepo.create_or_update_vote(db, vote) 

@router.get("/{poll_id}/results", response_model=PollResults)
def get_poll_results(poll_id: str, db: Session = Depends(get_db)):
    try:
        # Get basic poll info using PollRepo
        poll = pollrepo.get_poll_info(poll_id, db)
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        # Get all options using PollRepo
        options = pollrepo.get_all_options(poll_id, db)

        # Get all votes using PollRepo
        votes = pollrepo.get_all_votes(poll_id, db)

        # Calculate total votes
        total_votes = len(votes)

        # Structure option results with voters and counts
        option_results = []
        for option in options:
            option_voters = [
                vote.user_id for vote in votes 
                if vote.option_id == option.id
            ]
            option_results.append({
                "option_id": option.id,
                "text": option.text,
                "vote_count": len(option_voters),
                "voters": option_voters
            })

        return {
            "poll_id": poll.id,
            "question": poll.question,
            "poll_type": poll.poll_type,
            "options": option_results,
            "total_votes": total_votes,
            "all_voters": list({vote.user_id for vote in votes})  # Unique voters
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching poll results: {str(e)}"
        )

@router.get("/{poll_id}/voters")
def get_poll_voters(poll_id: str,
    option_id: str = None,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
    ):
        poll = pollrepo.get_poll_info(db, poll_id)
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        voters = pollrepo.get_poll_voters(db, poll_id, option_id)
        return voters

@router.patch("/{poll_id}/status")
def update_poll_status(poll_id: str, is_active: bool, db: Session = Depends(get_db)):
    poll = pollrepo.update_poll_status(db, poll_id, is_active)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll
