import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import FileExplorer from "./pages/FileExplorer";

const BACKEND_URL = "http://localhost:2387";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false); // State baru untuk Dark Mode

  // Efek samping untuk menyuntikkan class tema ke tag HTML utama
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [darkMode]);

  // State Data global backend
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const fetchStorageSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/drive/storage-summary`);
      const data = await response.json();
      if (response.ok) {
        setStorageData(data);
      } else {
        setError(data.detail || "Gagal mengambil data.");
      }
    } catch (err) {
      setError("Tidak dapat terhubung ke server backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageSummary();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${BACKEND_URL}/drive/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        setUploadMessage(`Sukses! ${data.message}`);
        fetchStorageSummary();
      } else {
        setUploadMessage(`Gagal: ${data.detail}`);
      }
    } catch (err) {
      setUploadMessage("Error: Gagal mengunggah file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Komponen Navigasi Samping */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        activePage={activePage}
        setActivePage={setActivePage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* Container Halaman Utama Konten */}
      <div
        style={{
          ...styles.contentContainer,
          marginLeft: sidebarOpen ? "var(--sidebar-width)" : "70px",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        {activePage === "dashboard" ? (
          <Dashboard
            storageData={storageData}
            loading={loading}
            fetchStorageSummary={fetchStorageSummary}
            error={error}
            uploading={uploading}
            uploadMessage={uploadMessage}
            handleFileUpload={handleFileUpload}
          />
        ) : (
          <FileExplorer />
        )}
      </div>
    </div>
  );
}

const styles = {
  contentContainer: {
    flex: 1,
    padding: "30px",
    minHeight: "100vh",
    transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};
