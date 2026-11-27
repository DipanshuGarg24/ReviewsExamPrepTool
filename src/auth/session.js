// Student session, stored encrypted in localStorage under "cacheData"
// (same key + encryption as the main exampreptool.com site, so the session is shared).
import { encryptData, decryptData } from "./securityKey";

export const getCachedAuth = () => {
  if (typeof window === "undefined") return null;
  return decryptData(localStorage.getItem("cacheData"));
};

export const setCachedAuth = (userData) => {
  if (typeof window === "undefined") return;
  if (userData) {
    localStorage.setItem("cacheData", encryptData(userData));
  } else {
    localStorage.removeItem("cacheData");
  }
};

export const getUser = () => {
  const cached = getCachedAuth();
  if (!cached) return null;
  const student = cached.studentId && typeof cached.studentId === "object" ? cached.studentId : {};
  return {
    ...student,
    ...cached,
    _id: cached._id || student._id || cached.id || "",
    id: cached._id || student._id || cached.id || "",
    name: cached.name || student.name || "",
    email: cached.email || student.email || "",
    mobile: cached.mobile || cached.phone || student.mobile || student.phone || "",
    token: cached.token || "",
  };
};

export const setUser = (u) => {
  if (!u) {
    setCachedAuth(null);
    return;
  }
  const existing = getCachedAuth() || {};
  setCachedAuth({ ...existing, ...u });
};

export const getToken = () => getUser()?.token || "";

export const setToken = (t) => {
  const existing = getCachedAuth() || {};
  if (t) setCachedAuth({ ...existing, token: t });
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cacheData");
};
