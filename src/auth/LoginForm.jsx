// The login form itself (Mobile OTP / Email & Password / Google).
// Used by both the /login page and the popup modal.
import { useEffect, useState } from "react";
import { AUTH_CONFIG } from "./authConfig";
import {
  sendLoginOtp,
  verifyLoginOtp,
  loginWithEmailPassword,
  loginWithGoogleAccessToken,
  saveLoginPayload,
  loadGoogleScript,
} from "./authApi";

// onSuccess(user, rawResponse) is called after the session has been saved.
export default function LoginForm({ onSuccess, notify }) {
  const [mode, setMode] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  const toast = (msg) => {
    if (typeof notify === "function") notify(msg);
  };

  // Preload Google's script so the popup opens straight from the click (avoids popup blockers)
  useEffect(() => {
    if (!AUTH_CONFIG.GOOGLE_AUTH_ENABLED) return;
    loadGoogleScript()
      .then(() => setGoogleReady(true))
      .catch((err) => setErrMsg(err.message));
  }, []);

  const finishLogin = (raw) => {
    const user = saveLoginPayload(raw);
    toast(`Welcome, ${user?.name || "User"}!`);
    setOtpSent(false);
    setOtp("");
    setErrMsg("");
    if (typeof onSuccess === "function") onSuccess(user, raw);
  };

  // shared busy / error handling
  const run = async (fn, onOk) => {
    setErrMsg("");
    setBusy(true);
    try {
      onOk(await fn());
    } catch (err) {
      setErrMsg(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    const cleanMobile = mobile.trim();
    if (!cleanMobile) return setErrMsg("Please enter your mobile number.");
    run(() => sendLoginOtp(cleanMobile), () => {
      setOtpSent(true);
      toast("OTP sent successfully!");
    });
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (!otp.trim()) return setErrMsg("Please enter the OTP.");
    run(() => verifyLoginOtp(mobile.trim(), otp.trim()), finishLogin);
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return setErrMsg("Please enter email and password.");
    run(() => loginWithEmailPassword(email.trim(), password), finishLogin);
  };

  const handleGoogleLogin = () => {
    setErrMsg("");
    if (!AUTH_CONFIG.GOOGLE_AUTH_ENABLED) return;
    if (!googleReady || !window.google?.accounts?.oauth2) {
      return setErrMsg("Google is still loading, try again in a moment.");
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: AUTH_CONFIG.GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (resp) => {
        if (resp?.error || !resp?.access_token) {
          return setErrMsg(resp?.error_description || resp?.error || "Google sign-in was cancelled.");
        }
        run(() => loginWithGoogleAccessToken(resp.access_token), finishLogin);
      },
      error_callback: (err) => setErrMsg(err?.message || "Google sign-in failed."),
    });
    client.requestAccessToken();
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={`btn btn-sm ${mode === "mobile" ? "btn-primary" : "btn-ghost"}`}
          style={{ flex: 1 }}
          onClick={() => {
            setMode("mobile");
            setErrMsg("");
          }}
        >
          Mobile OTP
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "email" ? "btn-primary" : "btn-ghost"}`}
          style={{ flex: 1 }}
          onClick={() => {
            setMode("email");
            setErrMsg("");
          }}
        >
          Email & Password
        </button>
      </div>

      {errMsg && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{errMsg}</div>}

      {mode === "mobile" && !otpSent && (
        <form onSubmit={handleSendOtp}>
          <div className="field">
            <label>Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Enter mobile number"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      )}

      {mode === "mobile" && otpSent && (
        <form onSubmit={handleVerifyOtp}>
          <div className="field">
            <label>OTP sent to {mobile}</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              required
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
              }}
            >
              Change
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={busy}>
              {busy ? "Verifying..." : "Verify & Login"}
            </button>
          </div>
        </form>
      )}

      {mode === "email" && (
        <form onSubmit={handleEmailLogin}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student4@gmail.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "Signing in..." : "Login with Email"}
          </button>
        </form>
      )}

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: "100%", opacity: AUTH_CONFIG.GOOGLE_AUTH_ENABLED ? 1 : 0.6 }}
          disabled={!AUTH_CONFIG.GOOGLE_AUTH_ENABLED || busy}
          onClick={handleGoogleLogin}
        >
          {AUTH_CONFIG.GOOGLE_AUTH_ENABLED ? "Continue with Google" : "Continue with Google (Disabled on Local)"}
        </button>
      </div>
    </>
  );
}
