import mysql.connector
from mysql.connector import pooling

db_config = {
    "host": "192.168.1.17",
    "user": "root",       
    "password": "123",       
    "database": "mini_gdrive"
}

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="gdrive_pool",
        pool_size=5,
        **db_config
    )
    print("Database connection pool berhasil dibuat.")
except mysql.connector.Error as err:
    print(f"Error saat membuat pool database: {err}")

def get_db_connection():
    """Fungsi untuk mengambil satu koneksi dari pool"""
    return connection_pool.get_connection()

def init_db():
    """Fungsi untuk menginisialisasi tabel-tabel jika belum ada"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        refresh_token TEXT NOT NULL,
        total_space BIGINT DEFAULT 0,
        used_space BIGINT DEFAULT 0
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_id INT,
        gdrive_file_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT DEFAULT 0,
        mime_type VARCHAR(100),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    print("Database & Tabel berhasil diinisialisasi!")