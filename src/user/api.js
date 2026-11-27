// Public API for the reviews portal (read data + students writing reviews).
// Admin operations live in src/admin and are NOT available here.
import { CONFIG } from "./config";
import { getToken } from "../auth/session";
import { normalizeInstitution, normalizeReview } from "./normalizers";

const getHeaders = () => {
  const t = getToken();
  return t
    ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
    : { "Content-Type": "application/json" };
};

const req = async (op = "", method = "GET", body = null) => {
  const url = `${CONFIG.BASE_URL}${op}`;
  const opts = { method, headers: getHeaders() };
  if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const d = await r.json();
  if ((!r.ok || d?.code === 201 || d?.success === false) && d?.data === undefined && !d?.token && !d?._id) {
    throw new Error(d?.message || d?.msg || `Request failed (${r.status})`);
  }
  return d.data !== undefined ? d.data : d;
};

export const API = {
  institutions: {
    list: (query = "") => req(query ? `?${query}` : "", "GET"),
  },
  reviews: {
    list: () => req("/review", "GET"),
    create: (payload) => req("/review/create", "POST", payload),
    helpful: (id) => req("/review/helpful", "PUT", { id }),
    report: (id, reason) => req("/review/report", "PUT", { id, reason }),
  },
  placements: {
    list: () => req("/placement", "GET"),
  },
  cutoffs: {
    list: () => req("/cutoff", "GET"),
  },
};

export const loadDB = async () => {
  const [instData, revData, cutData, placeData] = await Promise.all([
    API.institutions.list(),
    API.reviews.list().catch(() => []),
    API.cutoffs.list().catch(() => []),
    API.placements.list().catch(() => []),
  ]);

  const institutions = (Array.isArray(instData) ? instData : []).map(normalizeInstitution);
  const reviews = (Array.isArray(revData) ? revData : []).map(normalizeReview);

  const cutoffs = {};
  (Array.isArray(cutData) ? cutData : []).forEach((c) => {
    const key = String(c.instId || "");
    if (!cutoffs[key]) cutoffs[key] = [];
    cutoffs[key].push(c);
  });

  const placements = {};
  (Array.isArray(placeData) ? placeData : []).forEach((p) => {
    const key = String(p.instId || "");
    if (!placements[key]) placements[key] = [];
    placements[key].push(p);
  });

  return { institutions, reviews, cutoffs, placements };
};
