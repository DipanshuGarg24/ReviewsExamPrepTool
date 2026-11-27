// Admin API. Self-contained: does not import anything from the public portal or student login.
import { CONFIG } from "./adminConfig";
import { getAdminToken } from "./adminToken";
import { normalizeInstitution, normalizeReview, resolveImageUrl } from "./adminData";

const getHeaders = (useAdmin = false) => {
  const t = useAdmin ? getAdminToken() : "";
  return t
    ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` }
    : { "Content-Type": "application/json" };
};

// useAdmin: true -> sends the admin token. Plain GET lists are public.
const req = async (op = "", method = "GET", body = null, { useAdmin = false } = {}) => {
  const url = `${CONFIG.BASE_URL}${op}`;
  const opts = { method, headers: getHeaders(useAdmin) };
  if (body !== null && body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const d = await r.json();
  if ((!r.ok || d?.code === 201 || d?.success === false) && d?.data === undefined && !d?.token && !d?._id) {
    throw new Error(d?.message || d?.msg || `Request failed (${r.status})`);
  }
  return d.data !== undefined ? d.data : d;
};

export const API = {
  uploadImage: async (file) => {
    const cleanFileName = (file.name || "image.png").replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueName = `campus_${Date.now()}_${cleanFileName}`;
    const formData = new FormData();
    formData.append("name", uniqueName);
    formData.append("fileName", uniqueName);
    formData.append("image", file, cleanFileName);

    const token = getAdminToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(`${CONFIG.UPLOAD_URL}?name=${encodeURIComponent(uniqueName)}`, {
      method: "POST",
      headers,
      body: formData,
    });
    const d = await r.json();
    if (d?.code === 201 || d?.success === false || !d?.data) {
      throw new Error(d?.message || "Image upload failed");
    }
    const fileKey = typeof d.data === "string" ? d.data : d.data.url || d.data.file;
    return resolveImageUrl(fileKey);
  },
  institutions: {
    list: (query = "") => req(query ? `?${query}` : "", "GET"),
    create: (payload) => req("/create", "POST", payload, { useAdmin: true }),
    update: (payload) => req("/update", "PUT", payload, { useAdmin: true }),
    remove: (id) => req(`/remove/${id}`, "PUT", null, { useAdmin: true }),
    updateImage: (id, img) => req("/image", "PUT", { id, img }, { useAdmin: true }),
    addDepartment: (id, name) => req("/department/add", "PUT", { id, name }, { useAdmin: true }),
    removeDepartment: (id, name) => req("/department/remove", "PUT", { id, name }, { useAdmin: true }),
    addFacility: (id, name) => req("/facility/add", "PUT", { id, name }, { useAdmin: true }),
    removeFacility: (id, name) => req("/facility/remove", "PUT", { id, name }, { useAdmin: true }),
  },
  reviews: {
    listAdmin: (instId = "") =>
      req(instId ? `/review/admin?instId=${encodeURIComponent(instId)}` : "/review/admin", "GET", null, { useAdmin: true }),
    update: (payload) => req("/review/update", "PUT", payload, { useAdmin: true }),
    remove: (id) => req(`/review/remove/${id}`, "PUT", null, { useAdmin: true }),
  },
  placements: {
    list: () => req("/placement", "GET"),
    create: (payload) => req("/placement/create", "POST", payload, { useAdmin: true }),
    update: (payload) => req("/placement/update", "PUT", payload, { useAdmin: true }),
    remove: (id) => req(`/placement/remove/${id}`, "PUT", null, { useAdmin: true }),
  },
  cutoffs: {
    list: () => req("/cutoff", "GET"),
    create: (payload) => req("/cutoff/create", "POST", payload, { useAdmin: true }),
    update: (payload) => req("/cutoff/update", "PUT", payload, { useAdmin: true }),
    remove: (id) => req(`/cutoff/remove/${id}`, "PUT", null, { useAdmin: true }),
  },
};

// Loads everything the admin dashboard needs (admin review list included).
export const loadDB = async () => {
  const [instData, revData, cutData, placeData] = await Promise.all([
    API.institutions.list(),
    API.reviews.listAdmin().catch(() => []),
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
