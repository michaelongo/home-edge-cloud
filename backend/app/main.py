import os
import uuid
from pathlib import Path

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File as FastAPIFile,
)

from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app import models

from app.schemas import (
    UserRegister,
    UserResponse,
    TokenResponse,
    DeviceCreate,
    DeviceResponse,
)

from app.crud import (
    get_user_by_username,
    get_user_by_id,
    create_user,
)

from app.security import (
    verify_password,
    create_access_token,
    get_current_user_id,
)

from app.config import settings

from app.storage import (
    ensure_storage_directories,
    calculate_hash,
    get_storage_status,
    select_storage_location,
)


# ==================================================
# DATABASE INITIALIZATION
# ==================================================

Base.metadata.create_all(bind=engine)


# ==================================================
# STORAGE INITIALIZATION
# ==================================================

ensure_storage_directories(
    settings.STORAGE_SSD_PATH,
    settings.STORAGE_HDD_PATH
)


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="Home Edge Cloud API",
    version="1.0.0"
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():

    return {
        "message": "Home Edge Cloud API Running"
    }


# ==================================================
# HEALTH
# ==================================================

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


# ==================================================
# REGISTER
# ==================================================

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


# ==================================================
# LOGIN
# ==================================================

@app.post(
    "/login",
    response_model=TokenResponse
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_username(
        db,
        form_data.username
    )

    if not existing_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        form_data.password,
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


# ==================================================
# OAUTH2 TOKEN ENDPOINT
# Used by Swagger Authorize
# ==================================================

@app.post(
    "/token",
    response_model=TokenResponse
)
def token_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    existing_user = get_user_by_username(
        db,
        form_data.username
    )

    if not existing_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        form_data.password,
        existing_user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    access_token = create_access_token(
        existing_user.id
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ==================================================
# CURRENT USER
# ==================================================

@app.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    user = get_user_by_id(
        db,
        user_id
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# ==================================================
# TRUSTED DEVICES
# ==================================================

@app.post(
    "/devices",
    response_model=DeviceResponse
)
def add_device(
    device: DeviceCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    existing_devices = (
        db.query(models.TrustedDevice)
        .filter(
            models.TrustedDevice.user_id == user_id
        )
        .count()
    )

    if existing_devices >= 5:

        raise HTTPException(
            status_code=400,
            detail="Maximum of 5 trusted devices allowed"
        )

    existing_identifier = (
        db.query(models.TrustedDevice)
        .filter(
            models.TrustedDevice.device_identifier
            == device.device_identifier
        )
        .first()
    )

    if existing_identifier:

        raise HTTPException(
            status_code=400,
            detail="Device already registered"
        )

    new_device = models.TrustedDevice(
        user_id=user_id,
        device_name=device.device_name,
        device_type=device.device_type,
        device_identifier=device.device_identifier,
        trusted=True,
        vault_enabled=True
    )

    db.add(new_device)

    db.commit()

    db.refresh(new_device)

    return new_device


# ==================================================
# GET TRUSTED DEVICES
# ==================================================

@app.get(
    "/devices",
    response_model=list[DeviceResponse]
)
def get_devices(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    return (
        db.query(models.TrustedDevice)
        .filter(
            models.TrustedDevice.user_id == user_id
        )
        .all()
    )


# ==================================================
# STORAGE STATUS
# ==================================================

@app.get("/storage/status")
def storage_status():

    return get_storage_status(
        settings.STORAGE_SSD_PATH,
        settings.STORAGE_HDD_PATH
    )


# ==================================================
# UPLOAD FILE
# ==================================================

@app.post("/files/upload")
async def upload_file(
    upload: UploadFile = FastAPIFile(...),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    # ----------------------------------------------
    # READ FILE
    # ----------------------------------------------

    contents = await upload.read()

    file_size = len(contents)


    # ----------------------------------------------
    # FIND USER
    # ----------------------------------------------

    user = get_user_by_id(
        db,
        user_id
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    # ----------------------------------------------
    # CHECK USER QUOTA
    # ----------------------------------------------

    if file_size > user.remaining_storage:

        raise HTTPException(
            status_code=400,
            detail="Storage quota exceeded"
        )


    # ----------------------------------------------
    # CREATE SAFE UNIQUE FILE NAME
    # ----------------------------------------------

    safe_name = (
        f"{uuid.uuid4().hex}_"
        f"{Path(upload.filename).name}"
    )


    # ----------------------------------------------
    # SELECT STORAGE LOCATION
    #
    # Policy:
    # 1. Prefer SSD
    # 2. Fall back to HDD
    # 3. Fail if neither is available
    # ----------------------------------------------

    storage_location = select_storage_location(
        file_size,
        settings.STORAGE_SSD_PATH,
        settings.STORAGE_HDD_PATH
    )


    if storage_location is None:

        raise HTTPException(
            status_code=507,
            detail="No storage location has enough free space"
        )


    storage_class = storage_location["location"]

    storage_directory = storage_location["path"]


    stored_file = (
        storage_directory /
        safe_name
    )


    # ----------------------------------------------
    # WRITE FILE
    # ----------------------------------------------

    try:

        with open(
            stored_file,
            "wb"
        ) as file:

            file.write(contents)

    except OSError as error:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to write file: {error}"
        )


    # ----------------------------------------------
    # CALCULATE SHA-256
    # ----------------------------------------------

    file_hash = calculate_hash(
        str(stored_file)
    )


    # ----------------------------------------------
    # CREATE DATABASE RECORD
    # ----------------------------------------------

    new_file = models.File(
        owner_id=user_id,
        filename=upload.filename,
        size=file_size,
        file_hash=file_hash,
        storage_class=storage_class,
        status="STORED",
        storage_path=str(stored_file)
    )


    db.add(new_file)


    # ----------------------------------------------
    # UPDATE USER STORAGE
    # ----------------------------------------------

    user.used_storage += file_size

    user.remaining_storage -= file_size


    # ----------------------------------------------
    # SAVE DATABASE
    # ----------------------------------------------

    db.commit()

    db.refresh(new_file)


    # ----------------------------------------------
    # RESPONSE
    # ----------------------------------------------

    return {

        "message":
            "File uploaded successfully",

        "file_id":
            new_file.id,

        "filename":
            new_file.filename,

        "size":
            new_file.size,

        "storage_class":
            new_file.storage_class,

        "storage_path":
            new_file.storage_path,

        "sha256":
            file_hash
    }


# ==================================================
# LIST FILES
# ==================================================

@app.get("/files")
def list_files(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    files = (
        db.query(models.File)
        .filter(
            models.File.owner_id == user_id
        )
        .all()
    )


    return [

        {
            "id":
                file.id,

            "filename":
                file.filename,

            "size":
                file.size,

            "storage_class":
                file.storage_class,

            "status":
                file.status,

            "created_at":
                file.created_at
        }

        for file in files

    ]


# ==================================================
# DOWNLOAD FILE
# ==================================================

@app.get(
    "/files/{file_id}/download"
)
def download_file(
    file_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    file = (
        db.query(models.File)
        .filter(
            models.File.id == file_id,
            models.File.owner_id == user_id
        )
        .first()
    )


    if not file:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    if not file.storage_path:

        raise HTTPException(
            status_code=404,
            detail="Storage path unavailable"
        )


    if not os.path.exists(
        file.storage_path
    ):

        raise HTTPException(
            status_code=404,
            detail="Physical file not found"
        )


    return FileResponse(
        path=file.storage_path,
        filename=file.filename
    )


# ==================================================
# DELETE FILE
# ==================================================

@app.delete(
    "/files/{file_id}"
)
def delete_file(
    file_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    file = (
        db.query(models.File)
        .filter(
            models.File.id == file_id,
            models.File.owner_id == user_id
        )
        .first()
    )


    if not file:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    # ----------------------------------------------
    # DELETE PHYSICAL FILE
    # ----------------------------------------------

    if (
        file.storage_path
        and
        os.path.exists(file.storage_path)
    ):

        os.remove(
            file.storage_path
        )


    # ----------------------------------------------
    # UPDATE USER QUOTA
    # ----------------------------------------------

    user = get_user_by_id(
        db,
        user_id
    )


    if user:

        user.used_storage = max(
            0,
            user.used_storage - file.size
        )

        user.remaining_storage += file.size


    # ----------------------------------------------
    # DELETE DATABASE RECORD
    # ----------------------------------------------

    db.delete(file)

    db.commit()


    return {
        "message":
            "File deleted successfully"
    }