import React from "react";
import {
  CloudLightning,
  HardDrive,
  FolderOpen,
  Menu,
  X,
  Bug,
  Sun,
  Moon,
} from "lucide-react";
export default function Sidebar({
  isOpen,
  setIsOpen,
  activePage,
  setActivePage,
  darkMode,
  setDarkMode,
}) {
  return (
    <div
      style={{
        ...styles.sidebar,
        width: isOpen ? "var(--sidebar-width)" : "70px",
      }}
    >
      {}
      <div>
        <div style={styles.brandContainer}>
          {isOpen ? (
            <div style={styles.brand}>
              <CloudLightning size={26} color="var(--primary)" />
              <span style={styles.brandName}>Mini Drive</span>
            </div>
          ) : (
            <CloudLightning
              size={26}
              color="var(--primary)"
              style={{ margin: "0 auto" }}
            />
          )}
          <button onClick={() => setIsOpen(!isOpen)} style={styles.toggleBtn}>
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <nav style={styles.nav}>
          <button
            onClick={() => setActivePage("dashboard")}
            style={{
              ...styles.menuItem,
              backgroundColor:
                activePage === "dashboard"
                  ? "rgba(59, 130, 246, 0.1)"
                  : "transparent",
              color:
                activePage === "dashboard"
                  ? "var(--primary)"
                  : "var(--text-muted)",
            }}
          >
            <HardDrive
              size={20}
              color={
                activePage === "dashboard"
                  ? "var(--primary)"
                  : "var(--text-muted)"
              }
            />
            {isOpen && <span style={styles.menuText}>Dashboard</span>}
          </button>
          <button
            onClick={() => setActivePage("files")}
            style={{
              ...styles.menuItem,
              backgroundColor:
                activePage === "files"
                  ? "rgba(59, 130, 246, 0.1)"
                  : "transparent",
              color:
                activePage === "files" ? "var(--primary)" : "var(--text-muted)",
            }}
          >
            <FolderOpen
              size={20}
              color={
                activePage === "files" ? "var(--primary)" : "var(--text-muted)"
              }
            />
            {isOpen && <span style={styles.menuText}>Semua File</span>}
          </button>
        </nav>
      </div>
      {}
      <div>
        {}
        <div
          style={{ padding: "10px", display: "flex", justifyContent: "center" }}
        >
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={styles.themeToggleBtn}
          >
            {darkMode ? (
              <Sun size={18} color="#f59e0b" />
            ) : (
              <Moon size={18} color="#475569" />
            )}
            {isOpen && (
              <span style={{ fontSize: "13px", fontWeight: "600" }}>
                {darkMode ? "Mode Terang" : "Mode Malam"}
              </span>
            )}
          </button>
        </div>
        {}
        <div
          style={{
            ...styles.footer,
            justifyContent: isOpen ? "flex-start" : "center",
            padding: isOpen ? "15px 20px" : "15px 0",
          }}
        >
          <Bug
            size={16}
            color={isOpen ? "#ef4444" : "var(--text-muted)"}
            className={isOpen ? "spin-slow" : ""}
          />
          {isOpen && (
            <div style={styles.footerTextContainer}>
              <p style={styles.versionText}>Gara-gara Bug v1.0</p>
              <p style={styles.copyrightText}>© 2026 Dev Edition</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const styles = {
  sidebar: {
    height: "100vh",
    backgroundColor: "var(--bg-card)",
    borderRight: "1px solid var(--border-color)",
    position: "fixed",
    top: 0,
    left: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    zIndex: 100,
    overflow: "hidden",
  },
  brandContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 15px",
    height: "70px",
    borderBottom: "1px solid var(--border-color)",
  },
  brand: { display: "flex", alignItems: "center", gap: "10px" },
  brandName: { fontWeight: "700", fontSize: "18px", color: "var(--text-main)" },
  toggleBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: "5px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-primary)",
  },
  nav: {
    padding: "15px 10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  menuText: { whiteSpace: "nowrap" },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderTop: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-card)",
    transition: "all 0.3s ease",
  },
  footerTextContainer: { display: "flex", flexDirection: "column" },
  versionText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-main)",
    margin: 0,
  },
  copyrightText: {
    fontSize: "10px",
    color: "var(--text-muted)",
    margin: "2px 0 0 0",
  },
  themeToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "1px solid var(--border-color)",
    backgroundColor: "var(--bg-primary)",
    color: "var(--text-main)",
    cursor: "pointer",
  },
};
