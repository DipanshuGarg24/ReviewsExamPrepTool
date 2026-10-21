// masterApi.js

export const CONFIG = {
  LOGIN_ENABLED: true,
  // 🔴 1. Main Institutions API Base URL
  BASE_URL: 'http://127.0.0.1:5000/api/institutions',
  // 🔴 2. Separate Image Upload API URL (Change to your real image upload endpoint when ready)
  UPLOAD_URL: 'http://127.0.0.1:5000/api/upload',
};

export const getToken = () => localStorage.getItem('cf_token');
export const setToken = (t) => localStorage.setItem('cf_token', t);
export const clearToken = () => localStorage.removeItem('cf_token');

const getHeaders = () => {
  const t = getToken();
  return t
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    : { 'Content-Type': 'application/json' };
};

// Generic request builder: BASE_URL + op
export const req = async (op = '', method = 'GET', body = null) => {
  const url = `${CONFIG.BASE_URL}${op}`;
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const d = await r.json();
  if (!r.ok && !d.success && !d.token && !d._id) {
    throw new Error(d.message || `Request failed (${r.status})`);
  }
  return d.data !== undefined ? d.data : d;
};

export const API = {
  // Dedicated Image Upload helper -> sends file to UPLOAD_URL and returns the link string
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('image', file); // sends both common field names for compatibility

    const t = getToken();
    const headers = t ? { Authorization: `Bearer ${t}` } : {};

    const r = await fetch(CONFIG.UPLOAD_URL, {
      method: 'POST',
      headers,
      body: formData,
    });
    const d = await r.json();
    const link = d.url || d.img || d.link || d?.data?.url || d?.data?.img;
    if (!r.ok || !link) {
      throw new Error(d.message || 'Image upload failed');
    }
    return link;
  },

  auth: {
    login: async (email, password) => {
      const r = await fetch(`${CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!d.success && !d.token) throw new Error(d.message || 'Login failed');
      return d.data || d;
    },
    me: () => req('/auth/me', 'GET'),
  },

  institutions: {
    list: (query = '') => req(query ? `?${query}` : '', 'GET'),
    create: (payload) => req('/create', 'POST', payload),
    update: (payload) => req('/update', 'PUT', payload),
    remove: (id) => req(`/remove/${id}`, 'PUT'),
    updateImage: (id, img) => req('/image', 'PUT', { id, img }),
    addDepartment: (id, name) => req('/department/add', 'PUT', { id, name }),
    removeDepartment: (id, name) => req('/department/remove', 'PUT', { id, name }),
    addFacility: (id, name) => req('/facility/add', 'PUT', { id, name }),
    removeFacility: (id, name) => req('/facility/remove', 'PUT', { id, name }),
  },

  reviews: {
    list: () => req('/review', 'GET'),
    create: (payload) => req('/review/create', 'POST', payload),
    helpful: (id) => req('/review/helpful', 'PUT', { id }),
    report: (id, reason) => req('/review/report', 'PUT', { id, reason }),
    remove: (id) => req(`/review/remove/${id}`, 'PUT'),
  },

  placements: {
    list: () => req('/placement', 'GET'),
    create: (payload) => req('/placement/create', 'POST', payload),
    remove: (id) => req(`/placement/remove/${id}`, 'PUT'),
  },

  cutoffs: {
    list: () => req('/cutoff', 'GET'),
    create: (payload) => req('/cutoff/create', 'POST', payload),
    remove: (id) => req(`/cutoff/remove/${id}`, 'PUT'),
  },
};

const fmtMoney = (val) => {
  if (typeof val === 'number') {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  }
  return val || '—';
};

export const normalizeInstitution = (i) => ({
  id: i._id || i.id,
  name: i.name,
  slug: i.slug || (i.name || '').toLowerCase().replace(/\s+/g, '-'),
  type: ['IIT', 'NIT', 'IIIT', 'Central', 'Private'].includes(i.type) ? i.type : 'Private',
  location: i.location || 'India',
  nirf: i.nirf ? (String(i.nirf).startsWith('#') ? i.nirf : `#${i.nirf}`) : 'Unranked',
  nirfNum: Number(i.nirfNum) || 999,
  est: i.est || '—',
  fees: fmtMoney(i.fees),
  size: typeof i.size === 'number' ? `${i.size} Acres` : i.size || '—',
  highestCTC: fmtMoney(i.highestCTC),
  avgCTC: fmtMoney(i.avgCTC),
  hostels: typeof i.hostels === 'boolean' ? (i.hostels ? 'Available' : 'No') : i.hostels || 'Available',
  students: typeof i.students === 'number' ? i.students.toLocaleString('en-IN') : i.students || '—',
  img: i.img || 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80',
  about: i.about || '',
  departments: Array.isArray(i.departments)
    ? i.departments
    : typeof i.departments === 'string'
    ? i.departments.split(',').map((s) => s.trim()).filter(Boolean)
    : [],
  facilities: Array.isArray(i.facilities)
    ? i.facilities
    : typeof i.facilities === 'string'
    ? i.facilities.split(',').map((s) => s.trim()).filter(Boolean)
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
  instId: r.instId,
  author: r.author || 'Anonymous',
  branch: r.branch || '',
  batch: r.batch || '',
  exam: r.exam || '',
  rating: Number(r.rating) || 0,
  pros: r.pros || '',
  cons: r.cons || '',
  body: r.body || '',
  date: r.createdAt || new Date().toISOString(),
  helpful: r.helpful || 0,
  colorIdx: Math.floor(Math.random() * 6),
  rank: r.rank,
  score: r.score,
  cgpa: r.cgpa,
});

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
    if (!cutoffs[c.instId]) cutoffs[c.instId] = [];
    cutoffs[c.instId].push(c);
  });

  const placements = {};
  (Array.isArray(placeData) ? placeData : []).forEach((p) => {
    if (!placements[p.instId]) placements[p.instId] = [];
    placements[p.instId].push(p);
  });

  return { institutions, reviews, cutoffs, placements };
};