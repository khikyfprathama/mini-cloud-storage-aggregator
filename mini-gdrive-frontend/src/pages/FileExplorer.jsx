import React, { useState, useEffect } from "react";
import {
  Folder,
  File,
  ArrowLeft,
  Plus,
  Download,
  Trash2,
  Loader2,
  Image,
  Eye,
} from "lucide-react";

const BACKEND_URL = "http://localhost:2387";

export default function FileExplorer() {
  const [items, setItems] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [accountId, setAccountId] = useState(null);
  const [folderHistory, setFolderHistory] = useState([]); // Untuk mencatat jejak back button
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // State pop-up gambar

  const loadFolderContent = async (folderId = null) => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/drive/list-folder`;
      if (folderId) url += `?folder_id=${folderId}&account_id=${accountId}`;

      const response = await fetch(url);
      const res = await response.json();

      if (response.ok && res.status === "success") {
        setItems(res.items);
        setCurrentFolderId(res.current_folder_id);
        setAccountId(res.account_id);
      }
    } catch (err) {
      console.error("Gagal load folder", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolderContent();
  }, []);

  // Masuk ke dalam folder (Nested Folder Click)
  const handleFolderClick = (folderId, folderName) => {
    setFolderHistory([
      ...folderHistory,
      { id: currentFolderId, name: folderName },
    ]);
    loadFolderContent(folderId);
  };

  // Kembali ke folder sebelumnya (Back Button)
  const handleBackClick = () => {
    const historyCopy = [...folderHistory];
    const previousFolder = historyCopy.pop(); // Ambil folder terakhir
    setFolderHistory(historyCopy);
    loadFolderContent(previousFolder ? previousFolder.id : null);
  };

  // Membuat folder baru
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/drive/create-folder?name=${newFolderName}&parent_folder_id=${currentFolderId}&account_id=${accountId}`,
        {
          method: "POST",
        },
      );
      if (response.ok) {
        setNewFolderName("");
        setShowFolderForm(false);
        loadFolderContent(currentFolderId); // Reload isi folder
      }
    } catch (err) {
      alert("Gagal membuat folder.");
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "-";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div style={styles.page}>
      {/* Tombol Aksi Atas */}
      <div style={styles.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {folderHistory.length > 0 && (
            <button onClick={handleBackClick} style={styles.backBtn}>
              <ArrowLeft size={16} />
            </button>
          )}
          <h2 style={styles.pageTitle}>
            {folderHistory.length === 0
              ? "Root Application Folder"
              : folderHistory[folderHistory.length - 1].name}
          </h2>
        </div>

        <button
          onClick={() => setShowFolderForm(!showFolderForm)}
          style={styles.newFolderBtn}
        >
          <Plus size={16} />
          <span>Folder Baru</span>
        </button>
      </div>

      {/* Form Pembuatan Folder Baru */}
      {showFolderForm && (
        <form onSubmit={handleCreateFolder} style={styles.folderForm}>
          <input
            type="text"
            placeholder="Masukkan nama folder..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.submitBtn}>
            Buat
          </button>
          <button
            type="button"
            onClick={() => setShowFolderForm(false)}
            style={styles.cancelBtn}
          >
            Batal
          </button>
        </form>
      )}

      {/* Tampilan Grid/Tabel Item */}
      <div style={styles.card}>
        {loading ? (
          <div style={styles.center}>
            <Loader2 size={32} className="spin" color="var(--primary)" />
            <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>
              Membaca isi Google Drive...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div style={styles.center}>
            <Folder size={48} color="#cbd5e1" />
            <p style={{ marginTop: "10px", color: "var(--text-muted)" }}>
              Folder ini masih kosong.
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {items.map((item) => {
              const isFolder =
                item.mimeType === "application/vnd.google-apps.folder";
              const isImage = item.mimeType.startsWith("image/");

              return (
                <div key={item.id} style={styles.itemCard}>
                  {/* Bagian Visual/Preview Atas */}
                  <div style={styles.previewArea}>
                    {isFolder ? (
                      <Folder
                        size={50}
                        color="#eab308"
                        style={{ fill: "#fef08a" }}
                      />
                    ) : isImage && item.thumbnailLink ? (
                      <img
                        src={item.thumbnailLink}
                        alt={item.name}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <File size={50} color="#94a3b8" />
                    )}
                  </div>

                  {/* Detil Info Bawah */}
                  <div style={styles.itemInfo}>
                    <p style={styles.itemName} title={item.name}>
                      {item.name}
                    </p>
                    <p style={styles.itemSize}>
                      {isFolder ? "Folder" : formatBytes(item.size)}
                    </p>
                  </div>

                  {/* Tombol Aksi Hover/Bawah */}
                  <div style={styles.actions}>
                    {isFolder ? (
                      <button
                        onClick={() => handleFolderClick(item.id, item.name)}
                        style={styles.openBtn}
                      >
                        Buka Folder
                      </button>
                    ) : (
                      <div
                        style={{ display: "flex", gap: "5px", width: "100%" }}
                      >
                        {isImage && item.thumbnailLink && (
                          <button
                            onClick={() =>
                              setPreviewUrl(
                                item.thumbnailLink.replace("=s220", "=s800"),
                              )
                            }
                            style={{
                              ...styles.actionIcon,
                              backgroundColor: "#f0fdf4",
                              color: "#16a34a",
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <a
                          href={`${BACKEND_URL}/drive/download/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            ...styles.actionIcon,
                            backgroundColor: "#eff6ff",
                            color: "var(--primary)",
                            textDecoration: "none",
                            display: "flex",
                            flex: 1,
                          }}
                        >
                          <Download size={14} style={{ marginRight: "5px" }} />{" "}
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL POP-UP UNTUK PREVIEW GAMBAR BESAR */}
      {previewUrl && (
        <div style={styles.modalOverlay} onClick={() => setPreviewUrl(null)}>
          <div style={styles.modalContent}>
            <img src={previewUrl} alt="Preview" style={styles.largeImage} />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: "5px 10px" },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },
  pageTitle: { fontSize: "22px", fontWeight: "700", color: "var(--text-main)" },
  backBtn: {
    background: "#fff",
    border: "1px solid var(--border-color)",
    padding: "8px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  newFolderBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "var(--primary)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "opacity 0.2s",
  },
  folderForm: {
    display: "flex",
    gap: "10px",
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "12px",
    border: "1px solid var(--border-color)",
    marginBottom: "20px",
  },
  input: {
    border: "1px solid var(--border-color)",
    outline: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    flex: 1,
  },
  submitBtn: {
    backgroundColor: "var(--primary)",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    color: "var(--text-muted)",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  card: {
    backgroundColor: "var(--bg-card)",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid var(--border-color)",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: "20px",
  },
  itemCard: {
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#fff",
    position: "relative",
    transition: "transform 0.2s",
  },
  previewArea: {
    height: "80px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: "10px",
  },
  thumbnail: {
    height: "100%",
    width: "100%",
    objectFit: "cover",
    borderRadius: "6px",
  },
  itemInfo: { textAlign: "center", width: "100%", marginBottom: "12px" },
  itemName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--text-main)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: 0,
  },
  itemSize: {
    fontSize: "11px",
    color: "var(--text-muted)",
    marginTop: "2px",
    margin: 0,
  },
  actions: { width: "100%", display: "flex", gap: "5px" },
  openBtn: {
    width: "100%",
    backgroundColor: "#f8fafc",
    border: "1px solid var(--border-color)",
    padding: "6px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    color: "var(--text-main)",
  },
  actionIcon: {
    padding: "6px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: "10px",
    borderRadius: "12px",
    maxWidth: "90%",
    maxHeight: "90%",
  },
  largeImage: {
    maxWidth: "100%",
    maxHeight: "75vh",
    borderRadius: "8px",
    display: "block",
  },
};
