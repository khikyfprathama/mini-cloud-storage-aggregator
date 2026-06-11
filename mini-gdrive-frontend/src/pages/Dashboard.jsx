import React, { useState } from "react";
import { HardDrive, Upload, RefreshCw, AlertCircle } from "lucide-react";
import ProgressBar from "../components/ProgressBar";
export default function Dashboard({
  storageData,
  loading,
  fetchStorageSummary,
  error,
  uploading,
  uploadMessage,
  handleFileUpload,
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fakeEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      };
      handleFileUpload(fakeEvent);
    }
  };
  return (
    <div style={styles.page}>
      {}
      <div style={styles.topbar}>
        <h2 style={styles.pageTitle}>Overview Storage</h2>
        <button onClick={fetchStorageSummary} style={styles.refreshBtn}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>
      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      <div style={styles.grid}>
        {}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div
              style={{
                ...styles.iconWrapper,
                backgroundColor: "rgba(59, 130, 246, 0.1)",
              }}
            >
              <HardDrive size={20} color="var(--primary)" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Kapasitas Agregat</h3>
              <p style={styles.cardSub}>Total dari semua akun terhubung</p>
            </div>
          </div>
          {storageData?.total_combined_space_gb ? (
            <div style={{ marginTop: "15px" }}>
              <div style={styles.metaRow}>
                <span style={styles.bigNumber}>
                  {storageData.total_combined_used_gb} GB{" "}
                  <span
                    style={{ fontSize: "14px", color: "var(--text-muted)" }}
                  >
                    terpakai
                  </span>
                </span>
                <span style={styles.totalText}>
                  Limit: {storageData.total_combined_space_gb} GB
                </span>
              </div>
              <ProgressBar
                used={storageData.total_combined_used_gb}
                total={storageData.total_combined_space_gb}
              />
              <p style={styles.infoText}>
                Sisa kuota bersih:{" "}
                <strong>{storageData.total_combined_available_gb} GB</strong>
              </p>
            </div>
          ) : (
            <p style={styles.infoText}>Memuat data...</p>
          )}
        </div>
        {}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div
              style={{
                ...styles.iconWrapper,
                backgroundColor: "rgba(34, 197, 94, 0.1)",
              }}
            >
              <Upload size={20} color="#22c55e" />
            </div>
            <div>
              <h3 style={styles.cardTitle}>Smart Drop Zone</h3>
              <p style={styles.cardSub}>Otomatis memilih akun paling longgar</p>
            </div>
          </div>
          {}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              ...styles.uploadContainer,
              borderColor: isDragActive
                ? "var(--primary)"
                : "var(--border-color)",
              backgroundColor: isDragActive
                ? "rgba(59, 130, 246, 0.05)"
                : "var(--bg-primary)",
            }}
          >
            <input
              type="file"
              id="dashboardFile"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
            <label
              htmlFor="dashboardFile"
              style={uploading ? styles.labelDisabled : styles.labelEnabled}
            >
              {uploading ? (
                <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                  Mengunggah ke Cloud...
                </span>
              ) : isDragActive ? (
                <span
                  style={{
                    color: "var(--primary)",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}
                >
                  Lepaskan file di sini sekarang!
                </span>
              ) : (
                <div>
                  <p style={styles.dragTextMain}>Seret & Taruh file ke sini</p>
                  <p style={styles.dragTextSub}>
                    atau klik untuk memilih file manual
                  </p>
                </div>
              )}
            </label>
          </div>
          {uploadMessage && <p style={styles.uploadStatus}>{uploadMessage}</p>}
        </div>
      </div>
      {}
      {storageData?.accounts_detail && (
        <div style={{ ...styles.card, marginTop: "25px" }}>
          <h3 style={{ ...styles.cardTitle, marginBottom: "15px" }}>
            Rincian Akun Google Drive
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Alias Akun</th>
                  <th style={styles.th}>Email Google</th>
                  <th style={styles.th}>Total Kuota</th>
                  <th style={styles.th}>Terpakai</th>
                  <th style={styles.th}>Sisa</th>
                </tr>
              </thead>
              <tbody>
                {storageData.accounts_detail.map((acc, i) => (
                  <tr key={i} style={styles.tdRow}>
                    <td style={{ ...styles.td, fontWeight: "600" }}>
                      {acc.account_name}
                    </td>
                    <td style={styles.td}>{acc.email}</td>
                    <td style={styles.td}>{acc.total_space_gb} GB</td>
                    <td style={styles.td}>{acc.used_space_gb} GB</td>
                    <td style={styles.td}>{acc.available_space_gb} GB</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    backgroundColor: "var(--bg-card)",
    cursor: "pointer",
    fontWeight: "500",
    fontSize: "14px",
    color: "var(--text-muted)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },
  card: {
    backgroundColor: "var(--bg-card)",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid var(--border-color)",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.02)",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: "14px" },
  iconWrapper: {
    padding: "10px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: "16px", fontWeight: "600", color: "var(--text-main)" },
  cardSub: { fontSize: "13px", color: "var(--text-muted)" },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  bigNumber: { fontSize: "24px", fontWeight: "700", color: "var(--text-main)" },
  totalText: {
    fontSize: "13px",
    color: "var(--text-muted)",
    fontWeight: "500",
  },
  infoText: { fontSize: "13px", color: "var(--text-muted)" },
  uploadContainer: {
    marginTop: "20px",
    border: "2px dashed var(--border-color)",
    borderRadius: "12px",
    padding: "35px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  labelEnabled: {
    display: "block",
    cursor: "pointer",
    width: "100%",
    height: "100%",
  },
  labelDisabled: { display: "block", cursor: "not-allowed", opacity: 0.6 },
  dragTextMain: {
    margin: 0,
    fontWeight: "600",
    color: "var(--text-main)",
    fontSize: "14px",
  },
  dragTextSub: {
    margin: "6px 0 0 0",
    fontSize: "12px",
    color: "var(--text-muted)",
  },
  uploadStatus: {
    fontSize: "13px",
    color: "#16a34a",
    marginTop: "10px",
    fontWeight: "500",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
    textAlign: "left",
  },
  thRow: { borderBottom: "1px solid var(--border-color)" },
  th: {
    padding: "12px 8px",
    color: "var(--text-muted)",
    fontWeight: "600",
    fontSize: "13px",
  },
  tdRow: { borderBottom: "1px solid var(--border-color)" },
  td: { padding: "14px 8px", color: "var(--text-main)" },
};
