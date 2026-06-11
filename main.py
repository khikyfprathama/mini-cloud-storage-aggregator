from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # PENTING: Jangan sampai baris import ini terlewat!
from config.database import init_db
from routers import auth, drive

app = FastAPI(
    title="Mini Google Drive API",
    description="Backend cloud storage aggregator untuk menggabungkan beberapa akun Google Drive",
    version="1.0.0"
)

# --- KONFIGURASI CORS MIDDLEWARE ---
# Mengizinkan aplikasi frontend (React) untuk mengakses API backend meskipun berbeda port/domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Saat tahap development ini diatur '*', nanti jika sudah produksi ganti dengan URL spesifik React kamu (misal: http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],  # Mengizinkan semua jenis HTTP Method (GET, POST, PUT, DELETE, dll)
    allow_headers=["*"],  # Mengizinkan semua HTTP Headers
)

# Menjalankan pembuatan tabel saat aplikasi FastAPI pertama kali dinyalakan
@app.on_event("startup")
def startup_event():
    init_db()

# Mendaftarkan router (endpoint) dari folder routers
app.include_router(auth.router)
app.include_router(drive.router)

@app.get("/")
def root():
    return {
        "message": "Backend Mini Google Drive aktif!", 
        "documentation": "Buka URL untuk mencoba API melalui docs interaktif"
    }