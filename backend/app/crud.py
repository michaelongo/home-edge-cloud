from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password


DEFAULT_QUOTA = 214748364800


def get_user_by_username(
    db: Session,
    username: str
):
    return (
        db.query(User)
        .filter(User.username == username)
        .first()
    )


def get_user_by_id(
    db: Session,
    user_id: int
):
    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


def create_user(
    db: Session,
    username: str,
    password: str
):

    password_hash = hash_password(password)

    user = User(
        username=username,
        password_hash=password_hash,
        quota=DEFAULT_QUOTA,
        used_storage=0,
        remaining_storage=DEFAULT_QUOTA
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user