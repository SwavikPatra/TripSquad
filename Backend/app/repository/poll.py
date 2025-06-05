from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.api.schemas.poll import PollCreate, UserVoteCreate
from app.models.poll_models import Poll, PollOption, UserVote
import datetime
from uuid import UUID
import uuid

class PollRepo():
    def create_poll(
        self,
        db: Session,
        current_user_id: UUID,
        poll_data: PollCreate
    ):
        try:
            db_poll = Poll(
                id=uuid.uuid4(),
                question=poll_data.question,
                poll_type=poll_data.poll_type,
                group_id=poll_data.group_id,
                created_by=current_user_id,
                is_active=poll_data.is_active
            )
            db.add(db_poll)
            for option_text in poll_data.options:
                db_poll_option = PollOption(
                    id = uuid.uuid4(),
                    text = option_text,
                    poll_id = db_poll.id,
                )
                db.add(db_poll_option)
            db.commit()
            db.refresh(db_poll)
            return db_poll

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while creating poll: {str(e)}"
            )
    def get_all_options(
        self, 
        poll_id: UUID,
        db: Session
    ):
        try:
            options = db.query(
                PollOption
            ).filter(PollOption.poll_id == poll_id).all()
            return options
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while fetching options for the poll: {str(e)}"
            )
    def get_all_votes(
        self,
        poll_id:UUID,
        db=Session
    ):
        try:
            votes = db.query(
                UserVote
            ).filter(UserVote.poll_id == poll_id).all()
            return votes
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while fetching votes: {str(e)}"
            )
    def get_poll_info(
        self, 
        poll_id: UUID,
        db: Session,
    ):
        try:
            poll = db.query(Poll).filter(Poll.id == poll_id).first()
            return poll
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while fetching poll info: {str(e)}"
            )
    
    def get_polls_by_group(
        self,
        db: Session,
        group_id: str,
        skip: int = 0, 
        limit: int = 100
    ):
        try:
            return db.query(Poll).filter(Poll.group_id == group_id).offset(skip).limit(limit).all()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while fetching polls by group: {str(e)}"
            )
    
    def create_or_update_vote(
        db: Session,
        vote: UserVoteCreate,
    ):
        # For single choice polls, delete existing votes first
        poll = db.query(Poll).filter(Poll.id == vote.poll_id).first()
        
        if poll and poll.poll_type == "single_choice":
            db.query(UserVote).filter(
                UserVote.poll_id == vote.poll_id,
                UserVote.user_id == vote.user_id
            ).delete()
        
        # Check if this vote already exists
        existing_vote = db.query(UserVote).filter(
            UserVote.poll_id == vote.poll_id,
            UserVote.user_id == vote.user_id,
            UserVote.option_id == vote.option_id
        ).first()
        
        if existing_vote:
            existing_vote.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing_vote)
            return existing_vote
        
        # Create new vote
        db_vote = UserVote(
            id=str(uuid.uuid4()),
            user_id=vote.user_id,
            poll_id=vote.poll_id,
            option_id=vote.option_id
        )
        db.add(db_vote)
        db.commit()
        db.refresh(db_vote)
        return db_vote
    def get_poll_voters(
        self,
        db: Session,
        poll_id: str,
        option_id: str = None
    ):
        query = db.query(UserVote).filter(
            UserVote.poll_id == poll_id
        )
        
        if option_id:
            query = query.filter(UserVote.option_id == option_id)
        
        return query.all()
    
    def update_poll_status(db: Session, poll_id: str, is_active: bool):
        db_poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if db_poll:
            db_poll.is_active = is_active
            db.commit()
            db.refresh(db_poll)
        return db_poll
pollrepo = PollRepo()