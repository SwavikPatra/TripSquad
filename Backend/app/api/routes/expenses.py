from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from uuid import UUID
import uuid
from datetime import datetime

from app.models.expense_models import Expense, ExpenseSplit, UserBalance, SplitType, Attachment
from app.api.schemas.expenses import ExpenseCreate, SettlementsListResponse, SettlementResponse
from app.core.database import get_db
from app.core.auth import get_current_user
from app.api.schemas.auth import UserData

# You'll need this model to fetch group members:
from app.models.group_models import GroupMember  # Assuming this exists
from app.repository.expense import expenserepo
from app.core.aws import upload_file_to_s3, delete_file_from_s3, generate_presigned_url
from app.api.schemas.expenses import ExpenseResponse, ExpenseUpdateRequest, SettlementCreate
from typing import Optional, List, Text

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/{group_id}/expenses", status_code=status.HTTP_201_CREATED)
def create_expense(
    group_id: UUID,
    payload: ExpenseCreate,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validation (unchanged)
    if payload.split_type == SplitType.CUSTOM:
        if not payload.splits or len(payload.splits) == 0:
            raise HTTPException(status_code=400, detail="Custom split requires non-empty splits list.")
        total_split = round(sum(split.amount for split in payload.splits), 2)
        if total_split != round(payload.total_amount, 2):
            raise HTTPException(
                status_code=400,
                detail=f"Custom split total ({total_split}) does not match total amount ({payload.total_amount})"
            )

    # Create Expense (unchanged)
    expense = Expense(
        group_id=group_id,
        created_by=current_user.id,
        title=payload.title,
        description=payload.description,
        total_amount=payload.total_amount,
        split_type=payload.split_type,
        created_at=datetime.utcnow()
    )
    db.add(expense)
    db.flush()

    # Prepare splits - KEY CHANGE: Include payer but with their actual calculated share
    splits = []
    if payload.split_type == SplitType.EQUAL:
        # Get ALL group members including payer
        group_users = db.query(GroupMember.user_id).filter_by(group_id=group_id).all()
        user_ids = [user_id for (user_id,) in group_users]
        
        if len(user_ids) < 2:
            raise HTTPException(status_code=400, detail="Not enough users in the group to split with.")

        share = round(payload.total_amount / len(user_ids), 2)
        splits = [
            ExpenseSplit(
                expense_id=expense.id,
                user_id=user_id,
                amount=share  # Payer gets their calculated share too
            )
            for user_id in user_ids
        ]
    else:  # Custom split
        splits = [
            ExpenseSplit(
                expense_id=expense.id,
                user_id=split.user_id,
                amount=split.amount
            )
            for split in payload.splits
            # Don't filter out payer - include all specified splits
        ]

    db.add_all(splits)
    db.flush()

    # Update balances - KEY CHANGE: Skip payer's entry
    for split in splits:
        if split.user_id == current_user.id:
            continue  # Skip balance update for payer

        balance = db.query(UserBalance).filter_by(
            debtor_id=split.user_id,
            creditor_id=current_user.id,
            group_id=group_id
        ).first()

        if balance:
            balance.amount += split.amount
        else:
            balance = UserBalance(
                debtor_id=split.user_id,
                creditor_id=current_user.id,
                group_id=group_id,
                amount=split.amount
            )
            db.add(balance)

    db.commit()

    return {"message": "Expense created successfully", "expense_id": str(expense.id)}


# File upload to aws s3

@router.post("/{expense_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachments(
    expense_id: UUID,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    saved_files = []

    for file in files:
        # Get original filename and file content
        original_filename = file.filename
        file_content = await file.read()
        
        # Upload to S3 and get file URL
        try:
            file_name, file_url = upload_file_to_s3(file_content, original_filename, file.content_type)
            
            # Save file info in the database with a generated UUID
            attachment = Attachment(
                id=uuid.uuid4(),  # Generate a UUID for the attachment
                expense_id=expense.id,
                original_filename=original_filename,
                file_url=file_url,
                uploaded_at=datetime.utcnow()
            )
            db.add(attachment)
            saved_files.append({
                "attachment_id": attachment.id,
                "original_filename": original_filename,
                "file_url": file_url
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

    db.commit()
    return {"message": "Files uploaded successfully", "files": saved_files}

# Get all attachments for a expense

@router.get("/{expense_id}/attachments", response_model=list[dict])
def get_attachments(
    expense_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Fetch all attachments for this expense
    attachments = db.query(Attachment).filter_by(expense_id=expense_id).all()
    if not attachments:
        raise HTTPException(status_code=404, detail="No attachments found for this expense")

    # Return attachment details (without needing to call S3)
    files_info = [
        {
            "attachment_id": attachment.id,
            "original_filename": attachment.original_filename,
            "file_url": attachment.file_url,
            "can_delete": attachment.uploaded_by == current_user.id
        }
        for attachment in attachments
    ]

    return files_info

# Get a specific expense

@router.get("/{expense_id}/attachments/{attachment_id}", response_model=dict)
def get_attachment(
    expense_id: UUID,
    attachment_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    attachment = db.query(Attachment).filter_by(id=attachment_id, expense_id=expense_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Generate pre-signed URL from S3
    presigned_url = generate_presigned_url(attachment.file_url.split("/")[-1])

    return {
        "attachment_id": attachment.id,
        "original_filename": attachment.original_filename,
        "presigned_url": presigned_url,
        "can_delete": attachment.uploaded_by == current_user.id
    }

# Delete an attachment

@router.delete("/{expense_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    expense_id: UUID,
    attachment_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter_by(id=expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    attachment = db.query(Attachment).filter_by(id=attachment_id, expense_id=expense_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if current_user.id != expense.created_by:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this expense"
        )

    try:
        # Delete file from S3
        delete_file_from_s3(attachment.file_url.split("/")[-1])
        
        # Delete from database
        db.delete(attachment)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

    return {"message": "Attachment deleted successfully"}

@router.delete("/group/{group_id}/expense/{expense_id}")
async def delete_expense(
    group_id: UUID,
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    try:
        deleted = expenserepo.delete_expense(db, group_id, expense_id, current_user.id) 
        return JSONResponse(
            status_code=200,
            content={"message": "Expense deleted"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error while deleting expense: {str(e)}"
        )

@router.get("/group/{group_id}/expenses/", response_model=List[ExpenseResponse])
async def list_group_expenses(
    group_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    created_by: Optional[UUID] = Query(None),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    """
    List all expenses in a group with optional filtering
    - Pagination via skip/limit
    - Filter by creator using created_by
    - Filter by amount range using min_amount/max_amount
    """
    try:
        expenses = expenserepo.get_group_expenses(
            db=db,
            group_id=group_id,
            skip=skip,
            limit=limit,
            created_by=created_by,
            min_amount=min_amount,
            max_amount=max_amount
        )
        print(f"expenses: {expenses}")
        
        return expenses
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching expenses: {str(e)}"
        )

@router.get("/{expense_id}")
def get_expense(
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Get expense details with can_edit flag
    - Returns 404 if expense not found
    """
    try:
        result = expenserepo.get_expense_with_attachments(db, expense_id)
        expense = result["expense"]
        
        return {
            "id": str(expense.id),
            "title": expense.title,
            "description": expense.description,
            "total_amount": expense.total_amount,
            "created_by": str(expense.created_by),
            "created_at": expense.created_at,
            "split_type": expense.split_type.value,
            "can_edit": str(expense.created_by) == str(current_user.id),
            "attachments": result["attachments"]
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching expense: {str(e)}"
        )

@router.put("/{expense_id}")
def update_expense(
    expense_id: UUID,
    update_data: ExpenseUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """
    Update an expense
    - Returns 403 if user is not the creator
    - Returns 404 if expense not found
    """
    try:
        # First check permissions
        expense = expenserepo.get_expense_by_id(db, expense_id)
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )
            
        if str(expense.created_by) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only expense creator can edit"
            )

        # Perform update
        updated_expense = expenserepo.update_expense(
            db,
            expense_id,
            update_data.dict(exclude_unset=True)
        )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "message": "Expense updated",
                "data": {
                    "expense_id": str(updated_expense.id)
                }
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating expense: {str(e)}"
        )

@router.get("/group/{group_id}/settlements", response_model=SettlementsListResponse)
def list_all_settlements(
    group_id: UUID,
    paid_by: Optional[UUID] = None,
    paid_to: Optional[UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    """ List all the settlements in a group"""
    try:
        settlements = expenserepo.get_settlements(
            group_id = group_id,
            paid_by = paid_by,
            paid_to = paid_to,
            skip = skip,
            limit = limit,
            db = db,
            current_user = current_user.id,
        )
        
        settlement_responses = [
            SettlementResponse(
                id=str(s.id),
                paid_by=str(s.paid_by),
                paid_to=str(s.paid_to),
                amount=s.amount,
                settled_at=s.settled_at,
                note=s.note,
                can_delete=s.paid_by == current_user.id
            ) for s in settlements
        ]
        
        return SettlementsListResponse(
            status="Success",
            message="All settlements retrieved successfully.",
            data=settlement_responses
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail= f"Failed to retrieve settlements: {str(e)}"
        )

@router.get("/group/{group_id}/settlement/{settlement_id}")
def get_settlement(
    settlement_id: UUID,
    db: Session = Depends(get_db),
    current_user : UserData = Depends(get_current_user)
):
    "Get a single settlement using settlement id."
    try:
        settlement = expenserepo.get_settlement(
            settlement_id = settlement_id,
            db = db,
        )
        settlement_data = {
            "id": str(settlement.id),
            "paid_by": str(settlement.paid_by),
            "paid_to": str(settlement.paid_to),
            "amount": settlement.amount,
            "settled_date": settlement.settled_at.isoformat(),
            "note": settlement.note,
            "can_edit" : str(settlement.paid_by) == str(current_user.id)
        }
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "Success",
                "message" : "Settlement retrived successfully.",
                "data": settlement_data
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error while fetching settlement : {settlement_id}, error : {str(e)}"
        )

@router.get("/expense/{expense_id}/splits")
def get_expense_splits(
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserData = Depends(get_current_user)
):
    expense_splits = expenserepo.get_expense_splits(
        expense_id,
        db,
        current_user.id,
    )
    return expense_splits

@router.get("/group/{group_id}/user/{user_id}/splits")
async def get_user_splits_in_group(
    group_id: UUID,
    user_id: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all expense splits for a specific user in a specific group.
    
    Returns:
    - List of ExpenseSplit objects where:
      - The user is a participant (owes money)
      - OR the user created the expense (paid money)
    - Includes expense details for each split
    """
    
    # Query splits where user is a participant (owes money)
    participant_splits, creator_expenses = expenserepo.get_user_splits_in_group(
        group_id,
        user_id,
        db
    ) 
    
    # Convert creator expenses to split-like objects
    creator_splits = []
    for expense in creator_expenses:
        creator_splits.append(ExpenseSplit(
            id=expense.id,  # Using expense ID as a placeholder
            expense_id=expense.id,
            user_id=user_id,
            amount=-expense.total_amount  # Negative amount indicates payment
        ))
    
    # Combine both lists
    all_splits = participant_splits + creator_splits
    
    if not all_splits:
        return []
    
    return all_splits

@router.post('/group/user/settlement', status_code=201)
def create_user_settlement(
    settlement_data: SettlementCreate,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group_id = settlement_data.group_id
    paid_to = settlement_data.paid_to
    amount = settlement_data.amount
    note = settlement_data.note
    if current_user.id == paid_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User can't pay himself."
        )
    if amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement amount can't be negetive"
        )
    expenserepo.create_user_settlement(
        group_id = group_id,
        paid_by = current_user.id,
        paid_to = paid_to,
        amount = amount,
        note = note,
        db = db
    )
    return

@router.delete('/group/user/settlement', status_code=204)
def delete_user_settlement(
    settlement_id: UUID,
    group_id: UUID,
    current_user: UserData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expenserepo.delete_user_settlement(
        settlement_id = settlement_id,
        group_id = group_id,
        user_id = current_user.id,
        db = db,
    )
    return
        