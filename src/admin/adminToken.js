// Admin token (set by the main admin dashboard login, read here from localStorage).
export const getAdminToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("adminToken") || "";
};

export const clearAdminToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("adminToken");
};
