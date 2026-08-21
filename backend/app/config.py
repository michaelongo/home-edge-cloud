from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

    STORAGE_SSD_PATH: str
    STORAGE_HDD_PATH: str

    SECRET_KEY: str

    class Config:
        env_file = ".env"


settings = Settings()