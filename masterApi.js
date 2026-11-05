// masterApi.js

export const CONFIG = {
  LOGIN_ENABLED: true,
  // 🔴 1. Main Institutions API Base URL
  // Local: 'http://127.0.0.1:5000/api/institutions'
  // Live:  'https://devapi.exampreptool.com/api/institution'
  BASE_URL: 'https://devapi.exampreptool.com/api/institution',
  // 🔴 2. Live Image Upload API (expects multipart/form-data with field name 'image')
  // Local dummy: 'http://127.0.0.1:5000/api/imageStore/create'
  // Live:        'https://devapi.exampreptool.com/api/imageStore/create'
  UPLOAD_URL: 'https://devapi.exampreptool.com/api/imageStore/create',
  HARDCODED_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGVwdC5jb20iLCJyb2xlIjoic3VwZXJBZG1pbiIsImlkIjoiNjU4YzZiYzIzZjQxNjdhYjRlZDEyMjU4IiwicGFzc3dvcmRVcGRhdGVkQXQiOjE3ODczNDE5OTM0MjUsImV4cCI6MTc5NjkyMjAwOSwiaWF0IjoxNzkxNzM4MDA5fQ.0trnY8vDX7zJ1w9db1QyzB7ZlfACVWm8DlfaIoOwhYg',

  // 🔴 3. CloudFront Base URL for serving uploaded images
  IMAGE_CDN_BASE: 'https://d16us3mj88z7vo.cloudfront.net/',

};

export const getToken = () => localStorage.getItem('cf_token') || CONFIG.HARDCODED_TOKEN;
export const setToken = (t) => localStorage.setItem('cf_token', t);
export const clearToken = () => localStorage.removeItem('cf_token');

const getHeaders = () => {
  const t = getToken();
  return t
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
    : { 'Content-Type': 'application/json' };
};

// Helper to convert relative image filename ("288549test.png") into full CloudFront URL
export const resolveImageUrl = (raw) => {
  if (!raw) return 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80';
  const str = String(raw).trim();
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:')) {
    return str;
  }
  return `${CONFIG.IMAGE_CDN_BASE.replace(/\/$/, '')}/${str.replace(/^\//, '')}`;
};

// Generic request builder: BASE_URL + op
export const req = async (op = '', method = 'GET', body = null) => {
  const url = `${CONFIG.BASE_URL}${op}`;
  const opts = { method, headers: getHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const d = await r.json();
  if ((!r.ok || d?.code === 201) && !d?.data && !d?.token && !d?._id) {
    throw new Error(d?.message || `Request failed (${r.status})`);
  }
  return d.data !== undefined ? d.data : d;
};


//  helper functions :)
export const getUser = () => {
  const u = localStorage.getItem('cf_user');
  try { return u ? JSON.parse(u) : null; } catch { return null; }
};

export const setUser = (u) => {
  if (u) localStorage.setItem('cf_user', JSON.stringify(u));
  else localStorage.removeItem('cf_user');
};

export const clearSession = () => {
  localStorage.removeItem('cf_token');
  localStorage.removeItem('cf_user');
};


export const API = {
  // Single-step upload:
  // POSTs { name, file } to /api/imageStore/create -> gets d.data ("288549test.png")
  // -> returns "https://d16us3mj88z7vo.cloudfront.net/288549test.png"
 // Inside export const API = { ... } in masterApi.js
  uploadImage: async (file) => {
    const cleanFileName = (file.name || 'image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `campus_${Date.now()}_${cleanFileName}`;

    const formData = new FormData();
    // 1. Append text fields FIRST so multer populates req.body.name before processing the file stream
    formData.append('name', uniqueName);
    formData.append('fileName', uniqueName);
    
    // 2. Append the binary file under 'image' (matches req.files.image) with an explicit 3rd-arg filename
    formData.append('image', file, cleanFileName);

    const t = getToken();
    // Crucial: Do NOT set 'Content-Type' here; browser must auto-attach 'multipart/form-data; boundary=...'
    const headers = t ? { Authorization: `Bearer ${t}` } : {};

    const r = await fetch(`${CONFIG.UPLOAD_URL}?name=${encodeURIComponent(uniqueName)}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const d = await r.json();

    console.log('imageStore/create response:', d);

    // If backend returns 201 soft error or !d.data
    if (d?.code === 201 || !d?.data) {
      throw new Error(d?.message || 'Image upload failed');
    }

    // d.data is "288549test.png" -> becomes "https://d16us3mj88z7vo.cloudfront.net/288549test.png"
    const fileKey = typeof d.data === 'string' ? d.data : d.data.url || d.data.file;
    return resolveImageUrl(fileKey);
  },

  auth: {
   login: async (email, password) => {
      const r = await fetch(`${CONFIG.BASE_URL.replace(/\/institution$/, '')}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.msg || 'Login failed');
      
      const userData = d.data; // { name: "Aditya", token: "...", ... }
      if (userData?.token) {
        setToken(userData.token);
        setUser(userData);
      }
      return userData;
    },
    me: async () => {
      // If you use the local stored user profile when offline/reloaded:
      const localUser = getUser();
      if (localUser) return { user: localUser };
      throw new Error('Not logged in');
    }
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
    listAdmin: () => req('/review/admin', 'GET'),
    create: (payload) => req('/review/create', 'POST', payload),
    helpful: (id) => req('/review/helpful', 'PUT', { id }),
    report: (id, reason) => req('/review/report', 'PUT', { id, reason }),
    update: (payload) => req('/review/update', 'PUT', payload),
    remove: (id) => req(`/review/remove/${id}`, 'PUT'),
  },

  placements: {
    list: () => req('/placement', 'GET'),
    create: (payload) => req('/placement/create', 'POST', payload),
    update: (payload) => req('/placement/update', 'PUT', payload),
    remove: (id) => req(`/placement/remove/${id}`, 'PUT'),
  },

  cutoffs: {
    list: () => req('/cutoff', 'GET'),
    create: (payload) => req('/cutoff/create', 'POST', payload),
    update: (payload) => req('/cutoff/update', 'PUT', payload),
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
  img: resolveImageUrl(i.img),
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
  email: r.email || '',
  contact: r.contact || '',
  flagged: Boolean(r.flagged),
  hidden: Boolean(r.hidden),
  reportReason: r.reportReason || '',
  branch: r.branch || '',
  course: r.course || '',
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

export const loadDB = async (isAdmin = false) => {
  const [instData, revData, cutData, placeData] = await Promise.all([
    API.institutions.list(),
    (isAdmin ? API.reviews.listAdmin().catch(() => API.reviews.list()) : API.reviews.list()).catch(() => []),
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