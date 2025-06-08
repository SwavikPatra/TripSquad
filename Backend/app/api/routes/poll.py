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
    UserVoteCreate,
    PollOptionWithCount,
    PollResponse, 
    VotersResponse
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
        poll = pollrepo.get_poll_info(db, poll_id)
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        raw_options = pollrepo.get_all_options(poll_id, db)
        raw_votes = pollrepo.get_all_votes(poll_id, db)
            
        # ✅ Convert ORM -> Pydantic models
        base_options = [PollOption.model_validate(opt, from_attributes=True) for opt in raw_options]
        votes = [UserVote.model_validate(v, from_attributes=True) for v in raw_votes]
        
        # ✅ Calculate vote counts for each option
        options_with_counts = []
        for option in base_options:
            vote_count = sum(1 for vote in votes if vote.option_id == option.id)
            option_with_count = PollOptionWithCount(
                id=option.id,
                text=option.text,
                poll_id=option.poll_id,
                created_at=option.created_at,
                vote_count=vote_count
            )
            options_with_counts.append(option_with_count)
        
        print(f"Options with counts: {[(opt.text, opt.vote_count) for opt in options_with_counts]}")
        print(f"Total votes: {len(votes)}")

        return PollWithOptions(
            id=poll.id,
            question=poll.question,
            poll_type=poll.poll_type,
            group_id=poll.group_id,
            is_active=poll.is_active,
            created_at=poll.created_at,
            updated_at=poll.updated_at,
            options=options_with_counts,  # Now includes vote_count
            user_votes=votes
        )
    except Exception as e:
        print("Error in read_poll endpoint")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error while fetching poll: {str(e)}"
        )


@router.get("/{group_id}/polls", response_model=List[PollResponse])
def read_group_polls(group_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    polls = pollrepo.get_polls_by_group(db, group_id, current_user.id, skip=skip, limit=limit)
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
    print('inside poll api 108')
    print(f"id: {vote.option_id}, poll_id: {vote.poll_id}")
    
    # Verify the option exists
    option = pollrepo.verify_option(db, vote.option_id, vote.poll_id)
    print(f"inside poll api 116, option: {option.id}")
    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Option not found in this poll")
    
    return pollrepo.create_or_update_vote(db, vote, current_user.id) 

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

@router.get("/{poll_id}/voters", response_model=List[VotersResponse])
def get_poll_voters(poll_id: str,
    option_id: UUID = None,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
    ):
        poll = pollrepo.get_poll_info(db, poll_id)
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        return pollrepo.get_poll_voters(db, poll_id, option_id)

@router.patch("/{poll_id}/status")
def update_poll_status(poll_id: UUID, is_active: bool, db: Session = Depends(get_db)):
    poll = pollrepo.update_poll_status(db, poll_id, is_active)
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    return poll

@router.delete("/{poll_id}")
async def delete_poll(
    poll_id: str,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Delete a poll if user is the creator or admin of the group
    """
    result = pollrepo.delete_poll(
        db=db,
        poll_id=poll_id,
        current_user_id=current_user.id
    )
    return result
