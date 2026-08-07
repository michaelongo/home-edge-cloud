from sqlalchemy import Column, Integer, String

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, nullable=False)

    password_hash = Column(String, nullable=False)

    quota = Column(Integer, default=200)

    used_storage = Column(Integer, default=0)

    remaining_storage = Column(Integer, default=200)