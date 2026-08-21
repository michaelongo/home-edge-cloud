from pydantic import BaseModel, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=72)

class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    quota: int
    used_storage: int
    remaining_storage: int

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class DeviceCreate(BaseModel):
    device_name: str = Field(min_length=1, max_length=100)
    device_type: str = Field(min_length=1, max_length=50)
    device_identifier: str = Field(min_length=10, max_length=200)