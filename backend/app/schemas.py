from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50
    )

    password: str = Field(
        min_length=8,
        max_length=72
    )


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):

    id: int

    username: str

    used_storage: int

    remaining_storage: int

    model_config = {
        "from_attributes": True
    }
class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class DeviceCreate(BaseModel):
    device_name: str
    device_type: str
    device_identifier: str


class DeviceResponse(BaseModel):
    id: int
    device_name: str
    device_type: str
    device_identifier: str
    trusted: bool
    vault_enabled: bool

    class Config:
        from_attributes = True