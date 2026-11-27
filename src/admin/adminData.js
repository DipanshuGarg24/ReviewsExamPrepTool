// Data helpers for the admin portal: image url, formatting and normalizers.
import { CONFIG } from "./adminConfig";

export const resolveImageUrl = (raw) => {
  if (!raw) return "https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80";
  const str = String(raw).trim();
  if (str.startsWith("http://") || str.startsWith("https://") || str.startsWith("data:")) {
    return str;
  }
  return `${CONFIG.IMAGE_CDN_BASE.replace(/\/$/, "")}/${str.replace(/^\//, "")}`;
};

const fmtMoney = (val) => {
  if (typeof val === "number") {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString("en-IN")}`;
  }
  return val || "—";
};

export const normalizeInstitution = (i) => ({
  id: i._id || i.id,
  name: i.name,
  slug: i.slug || (i.name || "").toLowerCase().replace(/\s+/g, "-"),
  type: ["IIT", "NIT", "IIIT", "Central", "Private"].includes(i.type) ? i.type : "Private",
  location: i.location || "India",
  nirf: i.nirf ? (String(i.nirf).startsWith("#") ? i.nirf : `#${i.nirf}`) : "Unranked",
  nirfNum: Number(i.nirfNum) || 999,
  est: i.est || "—",
  fees: fmtMoney(i.fees),
  size: typeof i.size === "number" ? `${i.size} Acres` : i.size || "—",
  highestCTC: fmtMoney(i.highestCTC),
  avgCTC: fmtMoney(i.avgCTC),
  hostels: typeof i.hostels === "boolean" ? (i.hostels ? "Available" : "No") : i.hostels || "Available",
  students: typeof i.students === "number" ? i.students.toLocaleString("en-IN") : i.students || "—",
  img: resolveImageUrl(i.img),
  about: i.about || "",
  departments: Array.isArray(i.departments)
    ? i.departments
    : typeof i.departments === "string"
    ? i.departments.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
  facilities: Array.isArray(i.facilities)
    ? i.facilities
    : typeof i.facilities === "string"
    ? i.facilities.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
  ratings: {
    academics: 4.5,
    faculty: 4.4,
    placements: 4.5,
    campus: 4.4,
    hostel: 4.2,
    sports: 4.3,
    ...(i.ratings || {}),
  },
});

export const normalizeReview = (r) => ({
  id: r._id || r.id,
  instId: String(r.instId || ""),
  author: r.author || "Anonymous",
  email: r.email || "",
  contact: r.contact || "",
  flagged: Boolean(r.flagged),
  hidden: Boolean(r.hidden),
  reportReason: r.reportReason || "",
  branch: r.branch || "",
  course: r.course || "",
  batch: r.batch || "",
  exam: r.exam || "",
  rating: Number(r.rating) || 0,
  pros: r.pros || "",
  cons: r.cons || "",
  body: r.body || "",
  date: r.createdAt || new Date().toISOString(),
  helpful: r.helpful || 0,
  colorIdx: Math.floor(Math.random() * 6),
  rank: r.rank,
  score: r.score,
  cgpa: r.cgpa,
});
