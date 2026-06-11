from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from config.database import get_db_connection
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import io
import json

router = APIRouter(prefix="/drive", tags=["Drive Operations"])

SCOPES = ['https://www.googleapis.com/auth/drive']
CLIENT_SECRETS_FILE = "credentials/credentials.json"

def get_gdrive_service(refresh_token: str):
    """Fungsi pembantu untuk membuat Google Drive Service secara instan menggunakan Refresh Token"""
    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token"
    )
    
    # Memasukkan client_id & client_secret dari credentials.json ke objek creds
    with open(CLIENT_SECRETS_FILE, 'r') as f:
        data = json.load(f)
        web_data = data.get('web', data.get('installed', {}))
        creds._client_id = web_data.get('client_id')
        creds._client_secret = web_data.get('client_secret')

    # Segarkan token untuk mendapatkan access token baru yang valid
    creds.refresh(Request())
    return build('drive', 'v3', credentials=creds)


# --- FITUR 1: MONITORING TOTAL GABUNGAN SPACE ---
@router.get("/storage-summary")
def get_storage_summary():
    """Mengambil kuota dari semua akun, menjumlahkannya, dan mengupdate DB lokal"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT id, account_name, email, refresh_token FROM accounts")
        accounts = cursor.fetchall()
        
        if not accounts:
            return {"message": "Belum ada akun Google Drive yang terhubung.", "data": []}
        
        total_global_limit = 0
        total_global_usage = 0
        summary_per_account = []

        for acc in accounts:
            try:
                service = get_gdrive_service(acc['refresh_token'])
                about_info = service.about().get(fields="storageQuota").execute()
                quota = about_info.get('storageQuota', {})
                
                limit = int(quota.get('limit', 0))
                usage = int(quota.get('usage', 0))
                
                total_global_limit += limit
                total_global_usage += usage
                
                # Caching: Update data kapasitas ke database lokal
                cursor.execute(
                    "UPDATE accounts SET total_space = %s, used_space = %s WHERE id = %s",
                    (limit, usage, acc['id'])
                )
                
                summary_per_account.append({
                    "account_name": acc['account_name'],
                    "email": acc['email'],
                    "total_space_gb": round(limit / (1024 ** 3), 2),
                    "used_space_gb": round(usage / (1024 ** 3), 2),
                    "available_space_gb": round((limit - usage) / (1024 ** 3), 2)
                })
            except Exception as api_err:
                summary_per_account.append({
                    "account_name": acc['account_name'],
                    "email": acc['email'],
                    "status": f"Error: Gagal memuat data ({str(api_err)})"
                })
        
        conn.commit()
        
        global_available = total_global_limit - total_global_usage
        return {
            "total_combined_space_gb": round(total_global_limit / (1024 ** 3), 2),
            "total_combined_used_gb": round(total_global_usage / (1024 ** 3), 2),
            "total_combined_available_gb": round(global_available / (1024 ** 3), 2),
            "accounts_detail": summary_per_account
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# --- FITUR 2: SMART UPLOAD (MENCARI AKUN PALING SENGGANG + AUTO FOLDER) ---
@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Otomatis mendeteksi akun paling kosong, membuat folder aplikasi, lalu mengunggah file ke dalam folder tersebut"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Cari akun dengan sisa storage paling banyak
        query_find_best_account = """
        SELECT id, refresh_token, (total_space - used_space) as available_space 
        FROM accounts 
        ORDER BY available_space DESC 
        LIMIT 1
        """
        cursor.execute(query_find_best_account)
        best_account = cursor.fetchone()
        
        if not best_account:
            raise HTTPException(status_code=400, detail="Tidak ada akun Google Drive yang siap digunakan.")
            
        account_id = best_account['id']
        refresh_token = best_account['refresh_token']
        
        # 2. Bangun service Google Drive
        service = get_gdrive_service(refresh_token)
        
        # 3. KREASI FOLDER OTOMATIS: Cek apakah folder "Mini GDrive App" sudah ada di akun ini
        folder_name = "Mini GDrive App"
        query_check_folder = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        folder_search = service.files().list(q=query_check_folder, fields="files(id)").execute()
        folders = folder_search.get('files', [])
        
        if folders:
            # Jika folder sudah ada, ambil ID-nya
            folder_id = folders[0]['id']
        else:
            # Jika folder belum ada, buat folder baru di root My Drive
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            new_folder = service.files().create(body=folder_metadata, fields='id').execute()
            folder_id = new_folder.get('id')

        # 4. Siapkan metadata file dan masukkan folder_id sebagai 'parents'
        file_metadata = {
            'name': file.filename,
            'parents': [folder_id] # <--- Ini baris sakti yang memasukkan file ke dalam folder khusus!
        }
        
        file_content = await file.read()
        media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype=file.content_type, resumable=True)
        
        # 5. Eksekusi upload ke Google Drive
        gdrive_file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        gdrive_file_id = gdrive_file.get('id')
        
        # 6. Simpan rekam jejak lokasi file ke database lokal
        query_insert_file = """
        INSERT INTO files (account_id, gdrive_file_id, file_name, file_size, mime_type)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query_insert_file, (
            account_id, gdrive_file_id, file.filename, len(file_content), file.content_type
        ))
        
        # Perbarui data cache used_space di DB lokal
        cursor.execute(
            "UPDATE accounts SET used_space = used_space + %s WHERE id = %s",
            (len(file_content), account_id)
        )
        
        conn.commit()
        return {
            "status": "success",
            "message": f"File '{file.filename}' berhasil masuk ke folder '{folder_name}'!",
            "gdrive_file_id": gdrive_file_id,
            "saved_in_account_id": account_id
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# --- FITUR 3: DOWNLOAD FILE PINTAR ---
@router.get("/download/{file_id}")
def download_file(file_id: int):
    """
    Mengunduh file berdasarkan ID database (Primary Key tabel files).
    Sistem akan otomatis mencari di akun mana file itu berada, mengambil tokennya,
    lalu mendownload data biner asli dari Google Drive untuk diteruskan ke browser user.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Cari data file di database lokal berdasarkan ID database kita
        query_find_file = """
        SELECT f.gdrive_file_id, f.file_name, f.mime_type, a.refresh_token 
        FROM files f
        JOIN accounts a ON f.account_id = a.id
        WHERE f.id = %s
        """
        cursor.execute(query_find_file, (file_id,))
        file_data = cursor.fetchone()
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File tidak ditemukan di database lokal.")
            
        gdrive_file_id = file_data['gdrive_file_id']
        file_name = file_data['file_name']
        mime_type = file_data['mime_type']
        refresh_token = file_data['refresh_token']
        
        # 2. Bangun service Google Drive menggunakan akun pemilik file tersebut
        service = get_gdrive_service(refresh_token)
        
        # 3. Request ke Google Drive API untuk mendownload media biner file
        request = service.files().get_media(fileId=gdrive_file_id)
        file_stream = io.BytesIO()
        
        downloader = MediaIoBaseDownload(file_stream, request)
        
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            
        # Pindahkan pointer stream kembali ke awal agar bisa dibaca dari awal oleh FastAPI
        file_stream.seek(0)
        
        # 4. Kirim balik file sebagai data streaming biner ke browser user
        return StreamingResponse(
            file_stream, 
            media_type=mime_type, 
            headers={"Content-Disposition": f"attachment; filename=\"{file_name}\""}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
        
        # --- FITUR 4: AMBIL DAFTAR SEMUA FILE (FOR FILE EXPLORER) ---
@router.get("/files")
def get_all_files():
    """Mengambil daftar semua file dari database gabungan beserta info nama akunnya"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
        SELECT f.id, f.file_name, f.file_size, f.mime_type, a.account_name, a.email
        FROM files f
        JOIN accounts a ON f.account_id = a.id
        ORDER BY f.id DESC
        """
        cursor.execute(query)
        files = cursor.fetchall()
        return {"status": "success", "data": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# --- FITUR 5: HAPUS FILE (SMART DELETE) ---
@router.delete("/file/{file_id}")
def delete_file(file_id: int):
    """Menghapus file dari Google Drive asli sekaligus dari rekam jejak database lokal"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Cari detail file dan token akun pemiliknya
        query_find = """
        SELECT f.gdrive_file_id, f.file_size, f.account_id, a.refresh_token 
        FROM files f
        JOIN accounts a ON f.account_id = a.id
        WHERE f.id = %s
        """
        cursor.execute(query_find, (file_id,))
        file_data = cursor.fetchone()
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File tidak ditemukan di database.")
            
        gdrive_file_id = file_data['gdrive_file_id']
        file_size = file_data['file_size']
        account_id = file_data['account_id']
        refresh_token = file_data['refresh_token']
        
        # 2. Hapus file dari server Google Drive asli
        try:
            service = get_gdrive_service(refresh_token)
            service.files().delete(fileId=gdrive_file_id).execute()
        except Exception as g_err:
            # Jika file sudah dihapus manual di GDrive, tetap lanjutkan hapus di DB lokal
            print(f"File mungkin sudah tidak ada di GDrive: {g_err}")

        # 3. Hapus rekam jejak file dari database lokal
        cursor.execute("DELETE FROM files WHERE id = %s", (file_id,))
        
        # 4. Kembalikan/Kurangi hitungan used_space di cache database lokal
        cursor.execute(
            "UPDATE accounts SET used_space = GREATEST(0, used_space - %s) WHERE id = %s",
            (file_size, account_id)
        )
        
        conn.commit()
        return {"status": "success", "message": "File berhasil dihapus dari cloud aggregator!"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
        
# --- FITUR 6: LIHAT ISI FOLDER SECARA REAL-TIME ---
@router.get("/list-folder")
def list_folder_content(folder_id: str = None, account_id: int = None):
    """
    Membaca isi file dan sub-folder dari Google Drive secara langsung (real-time).
    Jika folder_id kosong, sistem akan otomatis mencari folder 'Mini GDrive App' pada akun pertama.
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # 1. Jika akun belum ditentukan, pilih akun pertama yang ada di database
        if not account_id:
            cursor.execute("SELECT id, refresh_token FROM accounts LIMIT 1")
            acc = cursor.fetchone()
            if not acc:
                return {"status": "error", "message": "Belum ada akun terhubung."}
            account_id = acc['id']
            refresh_token = acc['refresh_token']
        else:
            cursor.execute("SELECT refresh_token FROM accounts WHERE id = %s", (account_id,))
            refresh_token = cursor.fetchone()['refresh_token']
            
        service = get_gdrive_service(refresh_token)
        
        # 2. Jika folder_id kosong, cari atau buat folder utama "Mini GDrive App"
        if not folder_id:
            query_main_folder = "name = 'Mini GDrive App' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            search = service.files().list(q=query_main_folder, fields="files(id)").execute()
            folders = search.get('files', [])
            if folders:
                folder_id = folders[0]['id']
            else:
                # Buat baru jika belum ada
                meta = {'name': 'Mini GDrive App', 'mimeType': 'application/vnd.google-apps.folder'}
                new_f = service.files().create(body=meta, fields='id').execute()
                folder_id = new_f.get('id')
        
        # 3. Tarik isi di dalam folder tersebut (baik file maupun sub-folder)
        query_content = f"'{folder_id}' in parents and trashed = false"
        # Ambil field thumbnailLink untuk fitur preview gambar/video nantinya
        results = service.files().list(
            q=query_content, 
            fields="files(id, name, mimeType, size, thumbnailLink)",
            orderBy="folder,name"
        ).execute()
        
        return {
            "status": "success", 
            "current_folder_id": folder_id,
            "account_id": account_id,
            "items": results.get('files', [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# --- FITUR 7: BUAT SUB-FOLDER BARU ---
@router.post("/create-folder")
def create_sub_folder(name: str, parent_folder_id: str, account_id: int):
    """Membuat folder baru di dalam folder yang sedang dibuka"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT refresh_token FROM accounts WHERE id = %s", (account_id,))
        refresh_token = cursor.fetchone()['refresh_token']
        
        service = get_gdrive_service(refresh_token)
        folder_metadata = {
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_folder_id]
        }
        
        folder = service.files().create(body=folder_metadata, fields='id').execute()
        return {"status": "success", "folder_id": folder.get('id')}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()