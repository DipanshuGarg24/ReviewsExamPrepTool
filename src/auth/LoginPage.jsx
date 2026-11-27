// Full page login:  /reviews/login
// After a successful login it shows the raw login data (for testing) and a link back to the reviews.
import { useState } from "react";
import LoginForm from "./LoginForm";
import { getCachedAuth, getUser, clearSession } from "./session";
import "../styles/global.css";
import "./login.css";

const homePath = () => (window.location.pathname.startsWith("/reviews") ? "/reviews" : "/");

export default function LoginPage() {
  // if a session already exists (e.g. logged in on the main site), show it
  const [result, setResult] = useState(() => {
    const existing = getCachedAuth();
    return existing ? { user: getUser(), raw: existing, restored: true } : null;
  });

  const logout = () => {
    clearSession();
    setResult(null);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {!result ? (
          <>
            <h2>Student Login</h2>
            <p className="login-sub">Log in to write reviews and mark them helpful.</p>
            <LoginForm onSuccess={(user, raw) => setResult({ user, raw, restored: false })} />
          </>
        ) : (
          <>
            <h2>{result.restored ? "Already logged in" : "Login successful"}</h2>
            <p className="login-sub">
              {result.user?.name || result.user?.email || result.user?.mobile || "Student"}
            </p>
            <pre className="login-raw">{JSON.stringify(result.raw, null, 2)}</pre>
            <div className="login-actions">
              <a className="btn btn-primary" href={homePath()}>
                Continue to reviews
              </a>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
