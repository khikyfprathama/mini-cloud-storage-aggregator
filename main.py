from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  
from config.database import init_db
from routers import auth, drive

app = FastAPI(
    title="Mini Google Drive API",
    description="Backend cloud storage aggregator untuk menggabungkan beberapa akun Google Drive",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.on_event("startup")
def startup_event():
    init_db()

app.include_router(auth.router)
app.include_router(drive.router)

@app.get("/")
def root():
    return {
        "message": "Backend Mini Google Drive aktif!", 
        "documentation": "Buka URL untuk mencoba API melalui docs interaktif"
    }