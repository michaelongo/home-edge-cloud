from fastapi import FastAPI

from app.database import Base, engine
from app import models


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