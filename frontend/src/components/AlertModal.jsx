export default function AlertModal({ isOpen, type = "error", title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(6, 11, 25, 0.8)",
      backdropFilter: "blur(8px)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      animation: "fadeIn 0.2s ease"
    }}>
      <div style={{
        backgroundColor: "#0f1c36",
        border: `1px solid ${type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
        borderRadius: "16px",
        padding: "24px",
        width: "min(400px, 90%)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
        textAlign: "center",
        animation: "scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }}>
        <div style={{
          fontSize: "2.5rem",
          marginBottom: "12px",
          color: type === "error" ? "#f87171" : "#34d399"
        }}>
          {type === "error" ? "❌" : "✅"}
        </div>
        
        <h3 style={{
          color: "#ffffff",
          margin: "0 0 10px 0",
          fontSize: "1.25rem",
          fontWeight: 700
        }}>
          {title || (type === "error" ? "Error" : "Success")}
        </h3>
        
        <p style={{
          color: "#94a3b8",
          fontSize: "0.95rem",
          lineHeight: 1.5,
          margin: "0 0 24px 0"
        }}>
          {message}
        </p>
        
        <button 
          onClick={onClose}
          style={{
            backgroundColor: type === "error" ? "#ef4444" : "#10b981",
            color: "#ffffff",
            border: "none",
            padding: "10px 24px",
            borderRadius: "10px",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            transition: "opacity 0.2s"
          }}
          onMouseOver={(e) => e.target.style.opacity = 0.9}
          onMouseOut={(e) => e.target.style.opacity = 1}
        >
          OK
        </button>
      </div>
    </div>
  );
}
