from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app import models
from app.schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
)
from app.crud import (
    get_user_by_username,
    create_user,
)
from app.security import (
    verify_password,
    create_access_token,
)


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Home Edge Cloud API",
    version="1.0.0"
)


@app.get("/")
def root():

    return {
        "message": "Home Edge Cloud API Running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserRegister,
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_username(
        db,
        user.username
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    new_user = create_user(
        db,
        user.username,
        user.password
    )

    return new_user


@app.post(
    "/login",
    response_model=TokenResponse
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_username(
        db,
        user.username
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token(
        existing_user.id
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }