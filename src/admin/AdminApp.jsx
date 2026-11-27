// AdminApp.jsx
import { useState, useEffect, useRef } from 'react';
import { API, loadDB } from './adminApi';
import { CONFIG } from './adminConfig';
import { getAdminToken, clearAdminToken } from './adminToken';
import '../styles/global.css';
import './admin.css';

const EMPTY_INST = {
  id: '',
  name: '',
  slug: '',
  type: 'IIT',
  location: '',
  nirf: '#10 Engineering',
  nirfNum: 10,
  est: '2005',
  fees: '₹1.5L',
  size: '250 Acres',
  highestCTC: '₹45 LPA',
  avgCTC: '₹16 LPA',
  hostels: 'Yes',
  students: '4,000+',
  img: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80',
  about: '',
  departments: 'Computer Science, Electrical Engineering, Mechanical Engineering',
  facilities: 'Library, Hostel, Sports Complex, Cafeteria',
  academicsRating: 4.5,
};

export default function AdminApp() {
  const [authRequired, setAuthRequired] = useState(() => !getAdminToken());
  const [db, setDb] = useState({ institutions: [], reviews: [], cutoffs: {}, placements: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('institutions');
  const [selectedInstId, setSelectedInstId] = useState('');
  const [searchQ, setSearchQ] = useState('');

  // Create / Edit Institution state
  const [isEditing, setIsEditing] = useState(false);
  const [instForm, setInstForm] = useState(EMPTY_INST);
  const [uploadingImg, setUploadingImg] = useState(false);
  const formFileRef = useRef(null);
  const quickFileRef = useRef(null);

  // Quick edits for selected institution
  const [newDept, setNewDept] = useState('');
  const [newFac, setNewFac] = useState('');

  // Placement & Cutoff forms for selected institution
  const [plForm, setPlForm] = useState({
    year: '2025',
    branch: 'Computer Science',
    course: 'B.Tech',
    eligible: 120,
    placed: 110,
    highCTC: '₹50 LPA',
    avgCTC: '₹22 LPA',
    medCTC: '₹18 LPA',
    intlOffers: 4,
    ppoOffers: 25,
    topRecruiters: 'Google, Microsoft, Amazon',
  });

  const [cutForm, setCutForm] = useState({
    year: '2025',
    branch: 'Computer Science',
    category: 'GEN',
    exam: 'JEE Advanced',
    openRank: 10,
    closeRank: 250,
    prevClose: 270,
  });

  const [toastMsg, setToastMsg] = useState('');
  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const handleApiError = (err) => {
    if (err?.code === 'ADMIN_AUTH_REQUIRED' || !getAdminToken()) {
      setAuthRequired(true);
      notify('Please login first');
      return true;
    }
    notify(err?.message || 'Something went wrong');
    return false;
  };

  const redirectToAdminLogin = () => {
    window.location.href = CONFIG.ADMIN_LOGIN_URL;
  };

  const refreshData = async (preferredInstId = '') => {
    setLoading(true);
    try {
      const token = getAdminToken();
      if (!token) {
        setAuthRequired(true);
        setLoading(false);
        return;
      }

      const d = await loadDB(true);
      setAuthRequired(false);
      setDb(d);

      const targetId =
        preferredInstId ||
        (d.institutions.some((i) => i.id === selectedInstId) ? selectedInstId : d.institutions[0]?.id || '');
      setSelectedInstId(targetId);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line
  }, []);

  const currentInst =
    db.institutions.find((i) => i.id === selectedInstId) || db.institutions[0] || null;

  // Keep default branch in sync when switching institutions
  useEffect(() => {
    if (currentInst?.departments?.length) {
      const firstDept = currentInst.departments[0];
      setPlForm((prev) => ({
        ...prev,
        branch: currentInst.departments.includes(prev.branch) ? prev.branch : firstDept,
      }));
      setCutForm((prev) => ({
        ...prev,
        branch: currentInst.departments.includes(prev.branch) ? prev.branch : firstDept,
      }));
    }
  }, [currentInst?.id]);

  // --- Institution Create / Update / Delete ---
  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...instForm,
        nirfNum: Number(instForm.nirfNum) || 999,
        departments:
          typeof instForm.departments === 'string'
            ? instForm.departments.split(',').map((s) => s.trim()).filter(Boolean)
            : instForm.departments,
        facilities:
          typeof instForm.facilities === 'string'
            ? instForm.facilities.split(',').map((s) => s.trim()).filter(Boolean)
            : instForm.facilities,
        ratings: { academics: Number(instForm.academicsRating) || 4.5 },
      };

      if (isEditing) {
        await API.institutions.update(payload);
        notify('Institution updated successfully');
        setIsEditing(false);
        setInstForm(EMPTY_INST);
        await refreshData(payload.id);
      } else {
        const created = await API.institutions.create(payload);
        notify('Institution created successfully');
        setInstForm(EMPTY_INST);
        await refreshData(created?._id || created?.id || '');
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  const startEditInst = (inst) => {
    setIsEditing(true);
    setSelectedInstId(inst.id);
    setInstForm({
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      type: inst.type,
      location: inst.location,
      nirf: inst.nirf,
      nirfNum: inst.nirfNum,
      est: inst.est,
      fees: inst.fees,
      size: inst.size,
      highestCTC: inst.highestCTC,
      avgCTC: inst.avgCTC,
      hostels: inst.hostels,
      students: inst.students,
      img: inst.img,
      about: inst.about,
      departments: inst.departments.join(', '),
      facilities: inst.facilities.join(', '),
      academicsRating: inst.ratings?.academics || 4.5,
    });
    setTab('institutions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteInst = async (id) => {
    if (!window.confirm('Delete this institution?')) return;
    try {
      await API.institutions.remove(id);
      notify('Institution deleted');
      await refreshData(id === selectedInstId ? '' : selectedInstId);
    } catch (err) {
      handleApiError(err);
    }
  };

  // --- Image Upload + PUT /image ---
  const handleFormImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const link = await API.uploadImage(file);
      setInstForm((prev) => ({ ...prev, img: link }));
      notify('Image uploaded & link ready');
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploadingImg(false);
      if (formFileRef.current) formFileRef.current.value = '';
    }
  };

  const handleQuickImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentInst) return;
    setUploadingImg(true);
    try {
      const link = await API.uploadImage(file);
      await API.institutions.updateImage(currentInst.id, link);
      notify('Institution image updated');
      await refreshData(currentInst.id);
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploadingImg(false);
      if (quickFileRef.current) quickFileRef.current.value = '';
    }
  };

  // --- Auth Gate (If adminToken is missing or request failed) ---
if (authRequired) {
    return (
      <div className="adm-gate-wrap">
        <div className="adm-gate-card">
          <div className="adm-logo" style={{ margin: '0 auto 14px' }}>CF</div>
          <h2 style={{ margin: '0 0 8px', fontFamily: "'Space Grotesk', sans-serif" }}>
            Please login first
          </h2>
          <p style={{ margin: '0 0 22px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            Admin session token is missing or expired. Please log in to continue.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={redirectToAdminLogin}>
            Login
          </button>
        </div>
        <div id="toast" className={toastMsg ? 'show' : ''}>
          <div className="toast-icon">!</div>
          <span>{toastMsg}</span>
        </div>
      </div>
    );
  }

  const filteredInsts = db.institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQ.toLowerCase()) ||
      i.type.toLowerCase().includes(searchQ.toLowerCase())
  );

  // Institute-wise reviews for the selected institution
  const instReviews = currentInst
    ? db.reviews.filter((r) => String(r.instId) === String(currentInst.id))
    : [];

  const instPlacements = currentInst ? db.placements[currentInst.id] || [] : [];
  const instCutoffs = currentInst ? db.cutoffs[currentInst.id] || [] : [];

  return (
    <div className="adm-page">
      {/* Top Header */}
      {/* Top Header */}
      <header className="adm-header">
        <div className="adm-brand">
          <div className="adm-logo">CF</div>
          <div>
            <b style={{ display: 'block', fontSize: 16 }}>Reviews Admin</b>
            <span style={{ fontSize: 12, color: '#64748b' }}>CampusFile Management</span>
          </div>
        </div>

        <nav className="adm-nav-strip">
          {[
            ['institutions', 'Institutions'],
            ['campus', 'Image, Depts & Facilities'],
            ['placements', 'Placements'],
            ['cutoffs', 'Cutoffs'],
            ['reviews', 'Reviews (Institute-wise)'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`adm-tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Single-Flow Vertical Content */}
      <main className="adm-container">
        {/* Shared Institution Selector for Institute-specific sections */}
        {tab !== 'institutions' && (
          <section className="adm-section-card">
            <div className="adm-section-head" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
              <div>
                <h2>Select Institution</h2>
                <p className="adm-section-sub">
                  All actions below apply to the selected institution
                </p>
              </div>
              <select
                value={currentInst?.id || ''}
                onChange={(e) => setSelectedInstId(e.target.value)}
                style={{ minWidth: 280, padding: '10px 14px', fontWeight: 600 }}
              >
                {db.institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.type})
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {loading && (
          <section className="adm-section-card">
            <p style={{ margin: 0, color: '#64748b' }}>Loading data...</p>
          </section>
        )}

        {/* ================= TAB 1: INSTITUTIONS (SINGLE FLOW) ================= */}
        {!loading && tab === 'institutions' && (
          <>
            {/* Block A: Create / Edit Form */}
            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>{isEditing ? `Edit Institution: ${instForm.name}` : 'Create New Institution'}</h2>
                  <p className="adm-section-sub">Fill in institution details and save</p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setIsEditing(false);
                      setInstForm(EMPTY_INST);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveInstitution}>
                <div className="row2">
                  <div className="field">
                    <label>Institution Name *</label>
                    <input
                      required
                      value={instForm.name}
                      onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
                      placeholder="e.g. IIT Bombay"
                    />
                  </div>
                  <div className="field">
                    <label>Slug</label>
                    <input
                      value={instForm.slug}
                      onChange={(e) => setInstForm({ ...instForm, slug: e.target.value })}
                      placeholder="iit-bombay"
                    />
                  </div>
                </div>

                <div className="row3">
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={instForm.type}
                      onChange={(e) => setInstForm({ ...instForm, type: e.target.value })}
                    >
                      {['IIT', 'NIT', 'IIIT', 'Central', 'Private'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Location</label>
                    <input
                      value={instForm.location}
                      onChange={(e) => setInstForm({ ...instForm, location: e.target.value })}
                      placeholder="Mumbai, Maharashtra"
                    />
                  </div>
                  <div className="field">
                    <label>Established Year</label>
                    <input
                      value={instForm.est}
                      onChange={(e) => setInstForm({ ...instForm, est: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row3">
                  <div className="field">
                    <label>NIRF Display</label>
                    <input
                      value={instForm.nirf}
                      onChange={(e) => setInstForm({ ...instForm, nirf: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>NIRF Rank Number</label>
                    <input
                      type="number"
                      value={instForm.nirfNum}
                      onChange={(e) => setInstForm({ ...instForm, nirfNum: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Fees / Sem</label>
                    <input
                      value={instForm.fees}
                      onChange={(e) => setInstForm({ ...instForm, fees: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row3">
                  <div className="field">
                    <label>Highest CTC</label>
                    <input
                      value={instForm.highestCTC}
                      onChange={(e) => setInstForm({ ...instForm, highestCTC: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Average CTC</label>
                    <input
                      value={instForm.avgCTC}
                      onChange={(e) => setInstForm({ ...instForm, avgCTC: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Campus Size</label>
                    <input
                      value={instForm.size}
                      onChange={(e) => setInstForm({ ...instForm, size: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row3">
                  <div className="field">
                    <label>Hostels Info</label>
                    <input
                      value={instForm.hostels}
                      onChange={(e) => setInstForm({ ...instForm, hostels: e.target.value })}
                      placeholder="e.g. Yes (18 Hostels)"
                    />
                  </div>
                  <div className="field">
                    <label>Students</label>
                    <input
                      value={instForm.students}
                      onChange={(e) => setInstForm({ ...instForm, students: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Academics Rating (1-5)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={instForm.academicsRating}
                      onChange={(e) => setInstForm({ ...instForm, academicsRating: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Image URL</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      value={instForm.img}
                      onChange={(e) => setInstForm({ ...instForm, img: e.target.value })}
                      placeholder="https://..."
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      ref={formFileRef}
                      style={{ display: 'none' }}
                      onChange={handleFormImageUpload}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={uploadingImg}
                      onClick={() => formFileRef.current?.click()}
                    >
                      {uploadingImg ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Departments (comma-separated)</label>
                  <input
                    value={instForm.departments}
                    onChange={(e) => setInstForm({ ...instForm, departments: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Facilities (comma-separated)</label>
                  <input
                    value={instForm.facilities}
                    onChange={(e) => setInstForm({ ...instForm, facilities: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>About</label>
                  <textarea
                    value={instForm.about}
                    onChange={(e) => setInstForm({ ...instForm, about: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Update Institution' : 'Create Institution'}
                </button>
              </form>
            </section>

            {/* Block B: Institutions List */}
            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Institutions ({filteredInsts.length})</h2>
                  <p className="adm-section-sub">Manage existing colleges</p>
                </div>
                <input
                  type="text"
                  placeholder="Search institution..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{ width: 260 }}
                />
              </div>

              <div className="table-scroll">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Type</th>
                      <th>NIRF</th>
                      <th>Avg CTC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInsts.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <b>{i.name}</b>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{i.location}</div>
                        </td>
                        <td><span className={`tag ${i.type}`}>{i.type}</span></td>
                        <td>{i.nirf}</td>
                        <td>{i.avgCTC}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => startEditInst(i)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => handleDeleteInst(i.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 2: IMAGE, DEPARTMENTS & FACILITIES (SINGLE FLOW) ================= */}
        {!loading && tab === 'campus' && currentInst && (
          <>
            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Campus Image — {currentInst.name}</h2>
                  <p className="adm-section-sub">Upload an image to get its link and update the institution image</p>
                </div>
              </div>

              <img
                src={currentInst.img}
                alt={currentInst.name}
                style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }}
              />

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={quickFileRef}
                  style={{ display: 'none' }}
                  onChange={handleQuickImageUpload}
                />
                <button
                  className="btn btn-primary btn-sm"
                  disabled={uploadingImg}
                  onClick={() => quickFileRef.current?.click()}
                >
                  {uploadingImg ? 'Uploading...' : 'Upload & Update Image'}
                </button>
                <span style={{ fontSize: 12.5, color: '#64748b', wordBreak: 'break-all' }}>
                  {currentInst.img}
                </span>
              </div>
            </section>

            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Departments — {currentInst.name}</h2>
                  <p className="adm-section-sub">Add or remove departments</p>
                </div>
              </div>

              <form
                style={{ display: 'flex', gap: 10 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newDept.trim()) return;
                  try {
                    await API.institutions.addDepartment(currentInst.id, newDept.trim());
                    setNewDept('');
                    notify('Department added');
                    await refreshData(currentInst.id);
                  } catch (err) {
                    handleApiError(err);
                  }
                }}
              >
                <input
                  placeholder="New department name (e.g. Data Science)"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
              </form>

              <div className="adm-chip-row">
                {currentInst.departments.map((d) => (
                  <span key={d} className="adm-pill">
                    {d}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await API.institutions.removeDepartment(currentInst.id, d);
                          notify('Department removed');
                          await refreshData(currentInst.id);
                        } catch (err) {
                          handleApiError(err);
                        }
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </section>

            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Facilities — {currentInst.name}</h2>
                  <p className="adm-section-sub">Add or remove campus facilities</p>
                </div>
              </div>

              <form
                style={{ display: 'flex', gap: 10 }}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newFac.trim()) return;
                  try {
                    await API.institutions.addFacility(currentInst.id, newFac.trim());
                    setNewFac('');
                    notify('Facility added');
                    await refreshData(currentInst.id);
                  } catch (err) {
                    handleApiError(err);
                  }
                }}
              >
                <input
                  placeholder="New facility name (e.g. Sports Complex)"
                  value={newFac}
                  onChange={(e) => setNewFac(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Add</button>
              </form>

              <div className="adm-chip-row">
                {currentInst.facilities.map((f) => (
                  <span key={f} className="adm-pill">
                    {f}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await API.institutions.removeFacility(currentInst.id, f);
                          notify('Facility removed');
                          await refreshData(currentInst.id);
                        } catch (err) {
                          handleApiError(err);
                        }
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 3: PLACEMENTS (SINGLE FLOW) ================= */}
        {!loading && tab === 'placements' && currentInst && (
          <>
            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Add Placement Record — {currentInst.name}</h2>
                </div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Year</label>
                  <input value={plForm.year} onChange={(e) => setPlForm({ ...plForm, year: e.target.value })} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <input value={plForm.branch} onChange={(e) => setPlForm({ ...plForm, branch: e.target.value })} />
                </div>
                <div className="field">
                  <label>Course</label>
                  <input value={plForm.course} onChange={(e) => setPlForm({ ...plForm, course: e.target.value })} />
                </div>
              </div>

              <div className="row2">
                <div className="field">
                  <label>Eligible</label>
                  <input type="number" value={plForm.eligible} onChange={(e) => setPlForm({ ...plForm, eligible: e.target.value })} />
                </div>
                <div className="field">
                  <label>Placed</label>
                  <input type="number" value={plForm.placed} onChange={(e) => setPlForm({ ...plForm, placed: e.target.value })} />
                </div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Highest CTC</label>
                  <input value={plForm.highCTC} onChange={(e) => setPlForm({ ...plForm, highCTC: e.target.value })} />
                </div>
                <div className="field">
                  <label>Average CTC</label>
                  <input value={plForm.avgCTC} onChange={(e) => setPlForm({ ...plForm, avgCTC: e.target.value })} />
                </div>
                <div className="field">
                  <label>Median CTC</label>
                  <input value={plForm.medCTC} onChange={(e) => setPlForm({ ...plForm, medCTC: e.target.value })} />
                </div>
              </div>

              <div className="row2">
                <div className="field">
                  <label>International Offers</label>
                  <input type="number" value={plForm.intlOffers} onChange={(e) => setPlForm({ ...plForm, intlOffers: e.target.value })} />
                </div>
                <div className="field">
                  <label>PPO Offers</label>
                  <input type="number" value={plForm.ppoOffers} onChange={(e) => setPlForm({ ...plForm, ppoOffers: e.target.value })} />
                </div>
              </div>

              <div className="field">
                <label>Top Recruiters (comma-separated)</label>
                <input value={plForm.topRecruiters} onChange={(e) => setPlForm({ ...plForm, topRecruiters: e.target.value })} />
              </div>

              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await API.placements.create({ ...plForm, instId: currentInst.id });
                    notify('Placement record added');
                    await refreshData(currentInst.id);
                  } catch (err) {
                    handleApiError(err);
                  }
                }}
              >
                Save Placement Record
              </button>
            </section>

            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Placement Records ({instPlacements.length}) — {currentInst.name}</h2>
                </div>
              </div>

              <div className="table-scroll">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Branch</th>
                      <th>Placed</th>
                      <th>Highest CTC</th>
                      <th>Avg CTC</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instPlacements.map((p) => (
                      <tr key={p._id || p.id}>
                        <td>{p.year}</td>
                        <td><b>{p.branch}</b></td>
                        <td>{p.placed} / {p.eligible}</td>
                        <td>{p.highCTC}</td>
                        <td>{p.avgCTC}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={async () => {
                              try {
                                await API.placements.remove(p._id || p.id);
                                notify('Placement deleted');
                                await refreshData(currentInst.id);
                              } catch (err) {
                                handleApiError(err);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 4: CUTOFFS (SINGLE FLOW) ================= */}
        {!loading && tab === 'cutoffs' && currentInst && (
          <>
            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Add Cutoff Entry — {currentInst.name}</h2>
                </div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Year</label>
                  <input value={cutForm.year} onChange={(e) => setCutForm({ ...cutForm, year: e.target.value })} />
                </div>
                <div className="field">
                  <label>Branch</label>
                  <input value={cutForm.branch} onChange={(e) => setCutForm({ ...cutForm, branch: e.target.value })} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <input value={cutForm.category} onChange={(e) => setCutForm({ ...cutForm, category: e.target.value })} />
                </div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Opening Rank</label>
                  <input type="number" value={cutForm.openRank} onChange={(e) => setCutForm({ ...cutForm, openRank: e.target.value })} />
                </div>
                <div className="field">
                  <label>Closing Rank</label>
                  <input type="number" value={cutForm.closeRank} onChange={(e) => setCutForm({ ...cutForm, closeRank: e.target.value })} />
                </div>
                <div className="field">
                  <label>Previous Year Close</label>
                  <input type="number" value={cutForm.prevClose} onChange={(e) => setCutForm({ ...cutForm, prevClose: e.target.value })} />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await API.cutoffs.create({ ...cutForm, instId: currentInst.id });
                    notify('Cutoff entry added');
                    await refreshData(currentInst.id);
                  } catch (err) {
                    handleApiError(err);
                  }
                }}
              >
                Save Cutoff Entry
              </button>
            </section>

            <section className="adm-section-card">
              <div className="adm-section-head">
                <div>
                  <h2>Cutoff Entries ({instCutoffs.length}) — {currentInst.name}</h2>
                </div>
              </div>

              <div className="table-scroll">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Branch</th>
                      <th>Category</th>
                      <th>Open Rank</th>
                      <th>Close Rank</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {instCutoffs.map((c) => (
                      <tr key={c._id || c.id}>
                        <td>{c.year}</td>
                        <td><b>{c.branch}</b></td>
                        <td>{c.category}</td>
                        <td>{c.openRank ?? '—'}</td>
                        <td>{c.closeRank ?? '—'}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={async () => {
                              try {
                                await API.cutoffs.remove(c._id || c.id);
                                notify('Cutoff deleted');
                                await refreshData(currentInst.id);
                              } catch (err) {
                                handleApiError(err);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ================= TAB 5: REVIEWS — INSTITUTE-WISE (SINGLE FLOW) ================= */}
        {!loading && tab === 'reviews' && currentInst && (
          <section className="adm-section-card">
            <div className="adm-section-head">
              <div>
                <h2>Reviews for {currentInst.name} ({instReviews.length})</h2>
                <p className="adm-section-sub">Showing reviews strictly for the selected institution</p>
              </div>
            </div>

            {!instReviews.length ? (
              <p style={{ color: '#64748b', margin: 0 }}>No reviews found for {currentInst.name}.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {instReviews.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 18,
                      background: '#fafbfd',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <b style={{ fontSize: 15 }}>{r.author}</b>
                        <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
                          Email: <b>{r.email || '—'}</b> · Contact: <b>{r.contact || '—'}</b>
                        </div>
                        <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                          {r.branch} · {r.course} · Batch {r.batch} · {r.exam}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`rating-badge r${r.rating}`} style={{ padding: '4px 10px', fontSize: 12 }}>
                          {r.rating}/5 ★
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#dc2626' }}
                          onClick={async () => {
                            if (!window.confirm('Delete this review?')) return;
                            try {
                              await API.reviews.remove(r.id);
                              notify('Review deleted');
                              await refreshData(currentInst.id);
                            } catch (err) {
                              handleApiError(err);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 13.5, lineHeight: 1.6 }}>
                      <div><b>Pros:</b> {r.pros}</div>
                      <div><b>Cons:</b> {r.cons}</div>
                      <div style={{ marginTop: 6 }}>{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <div id="toast" className={toastMsg ? 'show' : ''}>
        <div className="toast-icon">✓</div>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}