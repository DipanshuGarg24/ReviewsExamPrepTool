// Popup version of the login (used inside the reviews pages).
import LoginForm from "./LoginForm";

export default function LoginModal({ open, onClose, onSuccess, notify }) {
  if (!open) return null;

  return (
    <div className="scrim open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <h2>Student Login</h2>
          <p>Log in to write reviews and mark them helpful.</p>
        </div>

        <div className="modal-body">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ position: "absolute", top: 16, right: 18, border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "#64748b" }}
          >
            ✕
          </button>
          <LoginForm
            notify={notify}
            onSuccess={(user, raw) => {
              if (typeof onSuccess === "function") onSuccess(user, raw);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
