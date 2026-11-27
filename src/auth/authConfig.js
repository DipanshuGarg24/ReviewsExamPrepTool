// Student login configuration.
const API_ROOT = "https://devapi.exampreptool.com/api";

export const AUTH_CONFIG = {
  // Google button is enabled automatically once a client ID is provided (see .env.example)
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1076003373824-9dg9tkr3ceka154g3mkr5smpn8j9el42.apps.googleusercontent.com",
  GOOGLE_AUTH_ENABLED: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
  GOOGLE_LOGIN_URL: `${API_ROOT}/user/google-login`,
  SEND_OTP_URL: `${API_ROOT}/user/login-mobile/sendOTP`,
  VERIFY_OTP_URL: `${API_ROOT}/user/mobile-login`,
  EMAIL_LOGIN_URL: `${API_ROOT}/user/login`,
};
