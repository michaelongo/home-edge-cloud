from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    BigInteger,
)

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String,
        nullable=False
    )

    quota = Column(
        BigInteger,
        default=214748364800,
        nullable=False
    )

    used_storage = Column(
        BigInteger,
        default=0,
        nullable=False
    )

    remaining_storage = Column(
        BigInteger,
        default=214748364800,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class TrustedDevice(Base):
    __tablename__ = "trusted_devices"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    device_name = Column(
        String,
        nullable=False
    )

    device_type = Column(
        String,
        nullable=False
    )

    device_identifier = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    trusted = Column(
        Boolean,
        default=True,
        nullable=False
    )

    vault_enabled = Column(
        Boolean,
        default=True,
        nullable=False
    )

    last_seen = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class File(Base):
    __tablename__ = "files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    filename = Column(
        String,
        nullable=False
    )

    size = Column(
        BigInteger,
        nullable=False
    )

    file_hash = Column(
        String,
        nullable=True
    )

    storage_class = Column(
        String,
        default="STANDARD",
        nullable=False
    )

    status = Column(
        String,
        default="STORED",
        nullable=False
    )

    storage_path = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class QueueItem(Base):
    __tablename__ = "queue_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    device_id = Column(
        Integer,
        ForeignKey("trusted_devices.id"),
        nullable=False
    )

    filename = Column(
        String,
        nullable=False
    )

    size = Column(
        BigInteger,
        nullable=False
    )

    priority = Column(
        Integer,
        default=1,
        nullable=False
    )

    status = Column(
        String,
        default="PENDING",
        nullable=False
    )

    retry_count = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class VaultItem(Base):
    __tablename__ = "vault_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    device_id = Column(
        Integer,
        ForeignKey("trusted_devices.id"),
        nullable=False
    )

    file_id = Column(
        Integer,
        ForeignKey("files.id"),
        nullable=False
    )

    encrypted_size = Column(
        BigInteger,
        nullable=False
    )

    version = Column(
        Integer,
        default=1,
        nullable=False
    )

    status = Column(
        String,
        default="SYNCED",
        nullable=False
    )

    last_synced = Column(
        DateTime,
        nullable=True
    )


class StorageNode(Base):
    __tablename__ = "storage_nodes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    status = Column(
        String,
        default="OFFLINE",
        nullable=False
    )

    total_hdd_space = Column(
        BigInteger,
        default=0
    )

    available_hdd_space = Column(
        BigInteger,
        default=0
    )

    total_ssd_space = Column(
        BigInteger,
        default=0
    )

    available_ssd_space = Column(
        BigInteger,
        default=0
    )

    last_seen = Column(
        DateTime,
        nullable=True
    )