// Student login API calls: mobile OTP, email + password, Google.
// Every request function returns the RAW API response (already checked for errors).
// Call saveLoginPayload(raw) to store the session and get the normalized user.
import { AUTH_CONFIG } from "./authConfig";
import { setCachedAuth, getUser } from "./session";

// This backend reports errors as success:false, body code 201, or HTTP 201/202.
const isFailure = (res, data) =>
  !res.ok || res.status === 201 || res.status === 202 || data?.success === false || data?.code === 201;

async function postJson(url, body, fallbackMsg) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`${fallbackMsg} (HTTP ${res.status})`);
  }
  if (isFailure(res, data)) {
    throw new Error(data?.msg || data?.message || fallbackMsg);
  }
  return data;
}

export const sendLoginOtp = (mobile) =>
  postJson(AUTH_CONFIG.SEND_OTP_URL, { mobile }, "Failed to send OTP");

export const verifyLoginOtp = (mobile, otp) =>
  postJson(AUTH_CONFIG.VERIFY_OTP_URL, { mobile, otp }, "Invalid OTP");

export const loginWithEmailPassword = (email, password) =>
  postJson(AUTH_CONFIG.EMAIL_LOGIN_URL, { email, password }, "Invalid email or password");

export const loginWithGoogleAccessToken = async (accessToken) => {
  if (!AUTH_CONFIG.GOOGLE_AUTH_ENABLED) throw new Error("Google login is disabled right now.");
  if (!accessToken) throw new Error("Missing Google access token.");
  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const googleUser = await infoRes.json();
  if (!googleUser?.email) throw new Error("Could not fetch Google account email.");
  return postJson(AUTH_CONFIG.GOOGLE_LOGIN_URL, { email: googleUser.email }, "Google login failed");
};

// Stores the session (encrypted) and returns the normalized user.
export const saveLoginPayload = (rawResponse) => {
  const inner = rawResponse?.data && typeof rawResponse.data === "object" ? rawResponse.data : rawResponse;
  const userData = { ...inner };
  // some responses carry the token beside "data" instead of inside it
  if (!userData.token && rawResponse?.token) userData.token = rawResponse.token;
  if (!userData._id && !userData.token && !userData.email && !userData.mobile) {
    throw new Error(rawResponse?.msg || rawResponse?.message || "Invalid login response");
  }
  setCachedAuth(userData);
  return getUser();
};

/* ---------- Google Identity Services script ---------- */
const GSI_SRC = "https://accounts.google.com/gsi/client";

export const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    let el = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (!el) {
      el = document.createElement("script");
      el.src = GSI_SRC;
      el.async = true;
      document.head.appendChild(el);
    }
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => reject(new Error("Could not load Google script.")));
  });
