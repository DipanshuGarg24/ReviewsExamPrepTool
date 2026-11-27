// Remembers which reviews this student already marked as helpful (per user, in localStorage).
import { getUser } from "../auth/session";

const getHelpfulStorageKey = () => {
  const u = getUser();
  const uid = u?._id || u?.id || u?.email;
  return uid ? `cf_helpful_${uid}` : "cf_helpful_guest";
};

export const getHelpfulIds = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getHelpfulStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const addHelpfulId = (reviewId) => {
  if (typeof window === "undefined") return;
  const idStr = String(reviewId);
  const current = getHelpfulIds();
  if (!current.includes(idStr)) {
    localStorage.setItem(getHelpfulStorageKey(), JSON.stringify([...current, idStr]));
  }
};

export const hasMarkedHelpful = (reviewId) => getHelpfulIds().includes(String(reviewId));
