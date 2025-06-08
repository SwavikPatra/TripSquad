from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.api.schemas.poll import PollCreate, UserVoteCreate
from app.models.poll_models import Poll, PollOption, UserVote
from app.models.group_models import GroupMember, MembershipRole, Group
from app.models.user_models import User
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
        db: Session,
        poll_id: UUID,
    ):
        try:
            print(f"type: {type(db)}")
            print(f'inside poll function 78: {poll_id}')
            poll = db.query(Poll).filter(Poll.id == poll_id).first()
            print('inside poll function 80')
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
            current_user_id: UUID,
            skip: int = 0, 
            limit: int = 100,
        ):
            try:
                # Check if current user is admin of the group
                user_membership = db.query(GroupMember)\
                    .filter(GroupMember.group_id == group_id)\
                    .filter(GroupMember.user_id == current_user_id)\
                    .first()
                
                is_admin = user_membership and user_membership.role == MembershipRole.ADMIN
                
                # Get polls with options
                polls = db.query(Poll)\
                    .options(joinedload(Poll.options))\
                    .filter(Poll.group_id == group_id)\
                    .offset(skip)\
                    .limit(limit)\
                    .all()
                
                # Calculate vote counts and map field names for each option
                for poll in polls:
                    # Check if current user can delete this poll
                    poll.can_delete = (poll.created_by == current_user_id) or is_admin
                    
                    for option in poll.options:
                        # Calculate vote count
                        vote_count = db.query(func.count(UserVote.id))\
                            .filter(UserVote.option_id == option.id)\
                            .scalar()
                        option.vote_count = vote_count or 0
                        
                        # Map field name for Pydantic model
                        option.option_text = option.text
                
                return polls
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error while fetching polls by group: {str(e)}"
                )
    
    def create_or_update_vote(
        self,
        db: Session,
        vote: UserVoteCreate,
        current_user_id: UUID,
    ):
        # For single choice polls, delete existing votes first
        poll = db.query(Poll).filter(Poll.id == vote.poll_id).first()
        
        if poll and poll.poll_type == "single_choice":
            db.query(UserVote).filter(
                UserVote.poll_id == vote.poll_id,
                UserVote.user_id == current_user_id
            ).delete()
        print('inside create vote 111')
        
        # Check if this vote already exists
        existing_vote = db.query(UserVote).filter(
            UserVote.poll_id == vote.poll_id,
            UserVote.user_id == current_user_id,
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
            user_id=current_user_id,
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
        poll_id: UUID,
        option_id: UUID = None
    ):
        query = db.query(User).join(UserVote, User.id == UserVote.user_id).filter(
            UserVote.poll_id == poll_id
        )
        
        if option_id:
            query = query.filter(UserVote.option_id == option_id)
        
        voters_info = query.all()
        return voters_info
    
    def update_poll_status(self, db: Session, poll_id: str, is_active: bool):
        db_poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if db_poll:
            db_poll.is_active = is_active
            db.commit()
            db.refresh(db_poll)
        return db_poll
    def verify_option(self, db: Session, option_id : UUID, poll_id: UUID):
        try:
            option = db.query(PollOption).filter(
                PollOption.id == option_id,
                PollOption.poll_id == poll_id
            ).first()
            return option
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error while verifing the options : {str(e)}"
            )
    
    def delete_poll(
            self,
            db: Session,
            poll_id: str,
            current_user_id: UUID,
        ):
            try:
                # Get the poll with group membership check
                poll = db.query(Poll)\
                    .join(Group, Poll.group_id == Group.id)\
                    .join(GroupMember, Group.id == GroupMember.group_id)\
                    .filter(Poll.id == poll_id)\
                    .filter(GroupMember.user_id == current_user_id)\
                    .first()
                
                if not poll:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Poll not found or you don't have access to this group"
                    )
                
                # Check if user can delete the poll
                user_membership = db.query(GroupMember)\
                    .filter(GroupMember.group_id == poll.group_id)\
                    .filter(GroupMember.user_id == current_user_id)\
                    .first()
                
                is_admin = user_membership and user_membership.role == MembershipRole.ADMIN
                can_delete = (poll.created_by == current_user_id) or is_admin
                
                if not can_delete:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have permission to delete this poll"
                    )
                
                # Delete the poll (cascade will handle options and votes)
                db.delete(poll)
                db.commit()
                
                return {"message": "Poll deleted successfully"}
                
            except HTTPException:
                raise
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error while deleting poll: {str(e)}"
                )

pollrepo = PollRepo()