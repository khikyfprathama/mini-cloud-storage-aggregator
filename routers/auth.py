from fastapi import APIRouter, HTTPException
from config.database import get_db_connection
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

router = APIRouter(prefix="/auth", tags=["Authentication"])

SCOPES = ['https://www.googleapis.com/auth/drive']
CLIENT_SECRETS_FILE = "credentials/credentials.json"

# URL Callback setelah login sukses di Google (sesuaikan port jika berbeda)
REDIRECT_URI = "http://127.0.0.1:2387/auth/callback"

@router.get("/login-url")
def get_login_url(account_name: str):
    """
    Mengenerate URL Google Login untuk mendaftarkan akun baru.
    Contoh request: /auth/login-url?account_name=DriveUtama
    """
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    
    # 'state' dipakai untuk menyelipkan nama alias akun ke sistem Google 
    # agar bisa kita tangkap kembali saat callback
    auth_url, state = flow.authorization_url(
        access_type='offline', 
        include_granted_scopes='true',
        prompt='consent',  # Memaksa Google memunculkan layar persetujuan agar refresh_token selalu keluar
        state=account_name
    )
    return {"login_url": auth_url}

@router.get("/callback")
def auth_callback(code: str, state: str):
    """
    Endpoint otomatis yang dipanggil oleh Google setelah user sukses login.
    """
    account_name = state  # Mengambil kembali nama alias dari state
    
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
    )
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    # Ambil refresh token
    refresh_token = credentials.refresh_token

    # Ambil info email akun menggunakan service sementara
    service = build('drive', 'v3', credentials=credentials)
    about = service.about().get(fields="user").execute()
    email = about.get('user', {}).get('emailAddress')

    if not refresh_token:
        raise HTTPException(
            status_code=400, 
            detail="Gagal mendapatkan Refresh Token. Silakan hapus akses aplikasi ini di pengaturan Google Akun Anda, lalu coba lagi."
        )

    # Simpan atau update informasi ke database MySQL
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
        INSERT INTO accounts (account_name, email, refresh_token) 
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE account_name=%s, refresh_token=%s
        """
        cursor.execute(query, (account_name, email, refresh_token, account_name, refresh_token))
        conn.commit()
        return {"status": "success", "message": f"Akun {email} ({account_name}) berhasil dihubungkan!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        cursor.close()
        conn.close()