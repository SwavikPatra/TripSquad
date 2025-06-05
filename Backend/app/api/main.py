from fastapi import APIRouter

from app.api.routes import(
    auth,
    group,
    expenses,
    test,
    itineraries,
    user,
    poll
)

api_router = APIRouter()

api_router.include_router(auth.router, tags=['Auth'])
api_router.include_router(group.router, tags=['Group'])
api_router.include_router(expenses.router, tags=['Expenses'])
api_router.include_router(itineraries.router, tags=['Itineraries'])
api_router.include_router(test.router, tags=['aws-s3'])
api_router.include_router(user.router, tags=['user'])
api_router.include_router(poll.router, tags=['poll'])