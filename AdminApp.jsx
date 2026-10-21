// AdminApp.jsx
import { useState, useEffect, useRef } from 'react';
import { API, loadDB, getToken, setToken, clearToken } from './masterApi';
import './styles.css';
import './admin.css';

const EMPTY_INST = {
  id: '',
  name: '',
  slug: '',
  type: 'IIT',
  location: '',
  nirf: '#10 Engineering',
  nirfNum: 10,
  est: 2005,
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
  const [user, setUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: 'admin@campusfile.in', password: 'admin' });
  const [db, setDb] = useState({ institutions: [], reviews: [], cutoffs: {}, placements: {} });
  const [tab, setTab] = useState('institutions');
  const [searchQ, setSearchQ] = useState('');
  const [selectedInstId, setSelectedInstId] = useState('');

  // Slide-over Drawer state for Create/Edit Institution
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [instForm, setInstForm] = useState(EMPTY_INST);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Quick Workspace states (Image, Dept, Facility)
  const [newDept, setNewDept] = useState('');
  const [newFac, setNewFac] = useState('');
  const quickFileRef = useRef(null);
  const formFileRef = useRef(null);

  // Placement & Cutoff forms
  const [plForm, setPlForm] = useState({
    year: 2025, branch: 'Computer Science', course: 'B.Tech',
    eligible: 120, placed: 110, highCTC: '₹50 LPA', avgCTC: '₹22 LPA', medCTC: '₹18 LPA',
    intlOffers: 4, ppoOffers: 25, topRecruiters: 'Google, Microsoft, Amazon',
  });
  const [cutForm, setCutForm] = useState({
    year: 2025, branch: 'Computer Science', category: 'GEN', exam: 'JEE Advanced',
    openRank: 10, closeRank: 250, prevClose: 270,
  });

  const [toastMsg, setToastMsg] = useState('');
  const notify = (m) => {
    setToastMsg(m);
    setTimeout(() => setToastMsg(''), 3200);
  };

  const refreshData = async () => {
    try {
      const d = await loadDB();
      setDb(d);
      if (!selectedInstId && d.institutions.length > 0) {
        setSelectedInstId(d.institutions[0].id);
      }
    } catch (e) {
      notify('Error loading data: ' + e.message);
    }
  };

  useEffect(() => {
    if (getToken()) {
      API.auth.me()
        .then((u) => {
          setUser(u.user || u);
          refreshData();
        })
        .catch(() => clearToken());
    }
    // eslint-disable-next-line
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.auth.login(loginForm.email, loginForm.password);
      setToken(res.token);
      setUser(res.user);
      notify('Welcome back, ' + res.user.name);
      refreshData();
    } catch (err) {
      notify(err.message);
    }
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

  // --- TWO-STEP IMAGE UPLOAD FLOW ---
  // 1. Send image file to API.uploadImage(file) -> returns hosted URL
  // 2. Either set it in the Create/Edit form OR immediately call PUT /api/institutions/image
  const handleFileUploadForForm = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const generatedLink = await API.uploadImage(file);
      setInstForm((prev) => ({ ...prev, img: generatedLink }));
      notify('Image uploaded & link generated!');
    } catch (err) {
      notify('Upload failed: ' + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleQuickImageUpdate = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentInst) return;
    setUploadingImg(true);
    try {
      // Step 1: Upload binary file to Upload API & get URL back
      const generatedLink = await API.uploadImage(file);
      // Step 2: Send returned URL to PUT /api/institutions/image
      await API.institutions.updateImage(currentInst.id, generatedLink);
      notify('Campus image uploaded & updated!');
      refreshData();
    } catch (err) {
      notify('Error: ' + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  // --- Institution Create / Update / Delete ---
  const openCreateDrawer = () => {
    setIsEditing(false);
    setInstForm(EMPTY_INST);
    setDrawerOpen(true);
  };

  const openEditDrawer = (inst) => {
    setIsEditing(true);
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
    setDrawerOpen(true);
  };

  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...instForm,
        nirfNum: Number(instForm.nirfNum) || 999,
        est: Number(instForm.est) || 2000,
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
        notify('Institution Updated Successfully!');
      } else {
        await API.institutions.create(payload);
        notify('Institution Created Successfully!');
      }
      setDrawerOpen(false);
      refreshData();
    } catch (err) {
      notify(err.message);
    }
  };

  const handleDeleteInst = async (id) => {
    if (!window.confirm('Are you sure you want to delete this institution?')) return;
    try {
      await API.institutions.remove(id);
      notify('Institution Deleted');
      refreshData();
    } catch (err) {
      notify(err.message);
    }
  };

  const currentInst = db.institutions.find((i) => i.id === selectedInstId) || db.institutions[0];
  const filteredInsts = db.institutions.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      i.location.toLowerCase().includes(searchQ.toLowerCase()) ||
      i.type.toLowerCase().includes(searchQ.toLowerCase())
  );

  const totalPlacements = Object.values(db.placements).reduce((s, arr) => s + arr.length, 0);
  const totalCutoffs = Object.values(db.cutoffs).reduce((s, arr) => s + arr.length, 0);

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="modal" style={{ position: 'relative', opacity: 1, transform: 'none', maxWidth: 420, width: '100%' }}>
          <div className="modal-head">
            <div className="adm-seal" style={{ marginBottom: 14 }}>CF</div>
            <h2>CampusFile Admin</h2>
            <p>Sign in with your administrator credentials</p>
          </div>
          <form className="modal-body" onSubmit={handleLogin}>
            <div className="field">
              <label>Email Address</label>
              <input type="email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 14 }}>
              Sign In to Admin Console →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-shell">
      {/* LEFT SIDEBAR */}
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <div className="adm-seal">CF</div>
          <div className="adm-brand-text">
            <b>CampusFile</b>
            <span>Admin Control Center</span>
          </div>
        </div>

        <nav className="adm-nav">
          <button className={`adm-nav-btn ${tab === 'institutions' ? 'active' : ''}`} onClick={() => setTab('institutions')}>
            <span>🏛️ All Institutions</span>
            <span className="adm-badge">{db.institutions.length}</span>
          </button>
          <button className={`adm-nav-btn ${tab === 'workspace' ? 'active' : ''}`} onClick={() => setTab('workspace')}>
            <span>⚡ Quick Campus Editor</span>
          </button>
          <button className={`adm-nav-btn ${tab === 'placements' ? 'active' : ''}`} onClick={() => setTab('placements')}>
            <span>📊 Placements Data</span>
            <span className="adm-badge">{totalPlacements}</span>
          </button>
          <button className={`adm-nav-btn ${tab === 'cutoffs' ? 'active' : ''}`} onClick={() => setTab('cutoffs')}>
            <span>🎯 Exam Cutoffs</span>
            <span className="adm-badge">{totalCutoffs}</span>
          </button>
          <button className={`adm-nav-btn ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
            <span>💬 Student Reviews</span>
            <span className="adm-badge">{db.reviews.length}</span>
          </button>
        </nav>

        <div className="adm-user-box">
          <div>
            <b style={{ display: 'block', color: '#fff' }}>{user.name}</b>
            <span style={{ color: '#94a3b8', fontSize: 11 }}>{user.role || 'superAdmin'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: '#f8fafc', borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="adm-main">
        {/* TOP BAR */}
        <header className="adm-topbar">
          <h1>
            {tab === 'institutions' && 'Institutions Directory'}
            {tab === 'workspace' && 'Quick Campus Editor (Image, Departments & Facilities)'}
            {tab === 'placements' && 'Placement Reports Manager'}
            {tab === 'cutoffs' && 'Admission Cutoffs Manager'}
            {tab === 'reviews' && 'Student Reviews Moderation'}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {tab !== 'institutions' && tab !== 'reviews' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Active College:</span>
                <select
                  value={currentInst?.id || ''}
                  onChange={(e) => setSelectedInstId(e.target.value)}
                  style={{ width: 240, padding: '8px 12px', fontWeight: 600 }}
                >
                  {db.institutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn btn-primary btn-sm" onClick={openCreateDrawer}>
              + Add New Institution
            </button>
          </div>
        </header>

        <div className="adm-content">
          {/* KPI ROW */}
          <div className="adm-kpi-grid">
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Total Colleges</div>
              <div className="adm-kpi-val">{db.institutions.length}</div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Verified Reviews</div>
              <div className="adm-kpi-val">{db.reviews.length}</div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Placement Records</div>
              <div className="adm-kpi-val">{totalPlacements}</div>
            </div>
            <div className="adm-kpi-card">
              <div className="adm-kpi-label">Cutoff Entries</div>
              <div className="adm-kpi-val">{totalCutoffs}</div>
            </div>
          </div>

          {/* ================= TAB 1: INSTITUTIONS TABLE ================= */}
          {tab === 'institutions' && (
            <div className="adm-card">
              <div className="adm-card-head">
                <h3 className="adm-card-title">All Registered Institutions</h3>
                <input
                  type="text"
                  placeholder="Search by name, city, or type..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  style={{ maxWidth: 300, padding: '8px 14px' }}
                />
              </div>

              <div className="table-scroll">
                <table className="dt">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Category</th>
                      <th>NIRF</th>
                      <th>Fees / Sem</th>
                      <th>Avg CTC</th>
                      <th>Depts / Facs</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInsts.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img src={i.img} alt={i.name} style={{ width: 46, height: 34, objectFit: 'cover', borderRadius: 6 }} />
                            <div>
                              <b style={{ fontSize: 14 }}>{i.name}</b>
                              <div style={{ fontSize: 12, color: '#64748b' }}>📍 {i.location}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`tag ${i.type}`}>{i.type}</span></td>
                        <td><b>{i.nirf}</b></td>
                        <td>{i.fees}</td>
                        <td className="ctc-avg">{i.avgCTC}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {i.departments.length} Depts · {i.facilities.length} Facilities
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => { setSelectedInstId(i.id); setTab('workspace'); }}
                          >
                            ⚡ Quick Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => openEditDrawer(i)}>
                            ✎ Full Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteInst(i.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 2: QUICK CAMPUS EDITOR (IMAGE UPLOAD + DEPT/FACILITY CHIPS) ================= */}
          {tab === 'workspace' && currentInst && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 22 }}>
              {/* Card 1: 2-Step Image Upload & Update */}
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">🖼️ Campus Cover Image</h3>
                </div>
                <img src={currentInst.img} alt={currentInst.name} className="adm-preview-img" />

                <input
                  type="file"
                  accept="image/*"
                  ref={quickFileRef}
                  style={{ display: 'none' }}
                  onChange={handleQuickImageUpdate}
                />

                <div className="adm-upload-box" onClick={() => quickFileRef.current?.click()}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
                  <b style={{ fontSize: 13.5, color: '#3d46f2' }}>
                    {uploadingImg ? 'Uploading & Updating...' : 'Click to Upload New Image File'}
                  </b>
                  <p style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Uploads image to Upload Server → gets link → updates `PUT /image`
                  </p>
                </div>

                <div className="field" style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 11 }}>Current Hosted Image Link</label>
                  <input readOnly value={currentInst.img} style={{ fontSize: 12, background: '#f8fafc' }} />
                </div>
              </div>

              {/* Card 2: Departments Manager */}
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">🎓 Departments ({currentInst.departments.length})</h3>
                </div>
                <form
                  style={{ display: 'flex', gap: 8 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDept.trim()) return;
                    await API.institutions.addDepartment(currentInst.id, newDept.trim());
                    setNewDept('');
                    notify('Department Added');
                    refreshData();
                  }}
                >
                  <input
                    placeholder="Add department (e.g. AI & DS)..."
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">+ Add</button>
                </form>

                <div className="adm-chip-list">
                  {currentInst.departments.map((d) => (
                    <span key={d} className="adm-chip">
                      {d}
                      <button
                        title="Remove Department"
                        onClick={async () => {
                          await API.institutions.removeDepartment(currentInst.id, d);
                          notify('Department Removed');
                          refreshData();
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Card 3: Facilities Manager */}
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">🏟️ Campus Facilities ({currentInst.facilities.length})</h3>
                </div>
                <form
                  style={{ display: 'flex', gap: 8 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newFac.trim()) return;
                    await API.institutions.addFacility(currentInst.id, newFac.trim());
                    setNewFac('');
                    notify('Facility Added');
                    refreshData();
                  }}
                >
                  <input
                    placeholder="Add facility (e.g. Olympic Pool)..."
                    value={newFac}
                    onChange={(e) => setNewFac(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">+ Add</button>
                </form>

                <div className="adm-chip-list">
                  {currentInst.facilities.map((f) => (
                    <span key={f} className="adm-chip">
                      {f}
                      <button
                        title="Remove Facility"
                        onClick={async () => {
                          await API.institutions.removeFacility(currentInst.id, f);
                          notify('Facility Removed');
                          refreshData();
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PLACEMENTS ================= */}
          {tab === 'placements' && currentInst && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">➕ Add Placement Report</h3>
                </div>
                <div className="row2">
                  <div className="field"><label>Academic Year</label><input type="number" value={plForm.year} onChange={(e) => setPlForm({ ...plForm, year: e.target.value })} /></div>
                  <div className="field"><label>Course</label><input value={plForm.course} onChange={(e) => setPlForm({ ...plForm, course: e.target.value })} /></div>
                </div>
                <div className="field">
                  <label>Branch / Department</label>
                  <select value={plForm.branch} onChange={(e) => setPlForm({ ...plForm, branch: e.target.value })}>
                    {currentInst.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="row2">
                  <div className="field"><label>Eligible Students</label><input type="number" value={plForm.eligible} onChange={(e) => setPlForm({ ...plForm, eligible: e.target.value })} /></div>
                  <div className="field"><label>Placed Students</label><input type="number" value={plForm.placed} onChange={(e) => setPlForm({ ...plForm, placed: e.target.value })} /></div>
                </div>
                <div className="row3">
                  <div className="field"><label>Highest CTC</label><input value={plForm.highCTC} onChange={(e) => setPlForm({ ...plForm, highCTC: e.target.value })} /></div>
                  <div className="field"><label>Average CTC</label><input value={plForm.avgCTC} onChange={(e) => setPlForm({ ...plForm, avgCTC: e.target.value })} /></div>
                  <div className="field"><label>Median CTC</label><input value={plForm.medCTC} onChange={(e) => setPlForm({ ...plForm, medCTC: e.target.value })} /></div>
                </div>
                <div className="row2">
                  <div className="field"><label>Intl. Offers</label><input type="number" value={plForm.intlOffers} onChange={(e) => setPlForm({ ...plForm, intlOffers: e.target.value })} /></div>
                  <div className="field"><label>PPOs</label><input type="number" value={plForm.ppoOffers} onChange={(e) => setPlForm({ ...plForm, ppoOffers: e.target.value })} /></div>
                </div>
                <div className="field"><label>Top Recruiters (comma-separated)</label><input value={plForm.topRecruiters} onChange={(e) => setPlForm({ ...plForm, topRecruiters: e.target.value })} /></div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    await API.placements.create({ ...plForm, instId: currentInst.id });
                    notify('Placement Row Added');
                    refreshData();
                  }}
                >
                  Save Placement Entry
                </button>
              </div>

              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">Placement Data for {currentInst.name}</h3>
                </div>
                <table className="dt">
                  <thead>
                    <tr><th>Year</th><th>Branch</th><th>Course</th><th>Placed</th><th>Highest</th><th>Average</th><th>Recruiters</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(db.placements[currentInst.id] || []).map((p) => (
                      <tr key={p._id}>
                        <td>{p.year}</td>
                        <td><b>{p.branch}</b></td>
                        <td>{p.course}</td>
                        <td>{p.placed} / {p.eligible}</td>
                        <td className="ctc-high">{p.highCTC}</td>
                        <td className="ctc-avg">{p.avgCTC}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{(p.topRecruiters || []).join(', ')}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={async () => { await API.placements.remove(p._id); refreshData(); }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CUTOFFS ================= */}
          {tab === 'cutoffs' && currentInst && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">➕ Add Cutoff Rank</h3>
                </div>
                <div className="row2">
                  <div className="field"><label>Year</label><input type="number" value={cutForm.year} onChange={(e) => setCutForm({ ...cutForm, year: e.target.value })} /></div>
                  <div className="field"><label>Category</label><input value={cutForm.category} onChange={(e) => setCutForm({ ...cutForm, category: e.target.value })} placeholder="GEN / OBC / SC" /></div>
                </div>
                <div className="field">
                  <label>Branch / Department</label>
                  <select value={cutForm.branch} onChange={(e) => setCutForm({ ...cutForm, branch: e.target.value })}>
                    {currentInst.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field"><label>Exam</label><input value={cutForm.exam} onChange={(e) => setCutForm({ ...cutForm, exam: e.target.value })} /></div>
                <div className="row3">
                  <div className="field"><label>Open AIR</label><input type="number" value={cutForm.openRank} onChange={(e) => setCutForm({ ...cutForm, openRank: e.target.value })} /></div>
                  <div className="field"><label>Close AIR</label><input type="number" value={cutForm.closeRank} onChange={(e) => setCutForm({ ...cutForm, closeRank: e.target.value })} /></div>
                  <div className="field"><label>Prev Close</label><input type="number" value={cutForm.prevClose} onChange={(e) => setCutForm({ ...cutForm, prevClose: e.target.value })} /></div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    await API.cutoffs.create({ ...cutForm, instId: currentInst.id });
                    notify('Cutoff Added');
                    refreshData();
                  }}
                >
                  Save Cutoff Entry
                </button>
              </div>

              <div className="adm-card">
                <div className="adm-card-head">
                  <h3 className="adm-card-title">Cutoff Ranks for {currentInst.name}</h3>
                </div>
                <table className="dt">
                  <thead>
                    <tr><th>Year</th><th>Branch</th><th>Category</th><th>Exam</th><th>Opening AIR</th><th>Closing AIR</th><th>Prev Close</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(db.cutoffs[currentInst.id] || []).map((c) => (
                      <tr key={c._id}>
                        <td>{c.year}</td>
                        <td><b>{c.branch}</b></td>
                        <td><span className="tag Other">{c.category}</span></td>
                        <td>{c.exam}</td>
                        <td>AIR {c.openRank}</td>
                        <td><b>AIR {c.closeRank}</b></td>
                        <td>AIR {c.prevClose || '—'}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={async () => { await API.cutoffs.remove(c._id); refreshData(); }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: REVIEWS MODERATION ================= */}
          {tab === 'reviews' && (
            <div className="adm-card">
              <div className="adm-card-head">
                <h3 className="adm-card-title">All Student Reviews ({db.reviews.length})</h3>
              </div>
              <table className="dt">
                <thead>
                  <tr><th>College</th><th>Author</th><th>Branch & Batch</th><th>Rating</th><th>Review Summary</th><th>Helpful</th><th></th></tr>
                </thead>
                <tbody>
                  {db.reviews.map((r) => {
                    const inst = db.institutions.find((i) => i.id === r.instId);
                    return (
                      <tr key={r.id}>
                        <td><b>{inst?.name || r.instId}</b></td>
                        <td>{r.author}</td>
                        <td>{r.branch} · {r.batch}</td>
                        <td><span className={`rating-badge r${r.rating}`} style={{ padding: '4px 8px', fontSize: 12 }}>{r.rating}/5 ★</span></td>
                        <td style={{ maxWidth: 420, fontSize: 12.5 }}>
                          <div style={{ color: '#16a34a' }}><b>✓ Pros:</b> {r.pros}</div>
                          <div style={{ color: '#dc2626' }}><b>✗ Cons:</b> {r.cons}</div>
                          <div style={{ marginTop: 4, color: '#334155' }}>{r.body}</div>
                        </td>
                        <td>👍 {r.helpful}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#ef4444' }}
                            onClick={async () => {
                              await API.reviews.remove(r.id);
                              notify('Review removed');
                              refreshData();
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= SLIDE-OVER DRAWER FOR CREATE / EDIT INSTITUTION ================= */}
      {drawerOpen && (
        <div className="adm-drawer-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}>
          <div className="adm-drawer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                {isEditing ? `Edit ${instForm.name}` : 'Create New Institution'}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setDrawerOpen(false)}>✕ Close</button>
            </div>

            <form onSubmit={handleSaveInstitution}>
              {/* Image Upload inside Create/Edit Drawer */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Institution Banner Image</label>
                {instForm.img && <img src={instForm.img} alt="Preview" className="adm-preview-img" style={{ height: 140 }} />}
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={formFileRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUploadForForm}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => formFileRef.current?.click()}
                    disabled={uploadingImg}
                  >
                    📤 {uploadingImg ? 'Uploading...' : 'Upload Image File to Server'}
                  </button>
                  <input
                    value={instForm.img}
                    onChange={(e) => setInstForm({ ...instForm, img: e.target.value })}
                    placeholder="Or paste direct image URL..."
                    style={{ flex: 1, fontSize: 12 }}
                  />
                </div>
              </div>

              <div className="row2">
                <div className="field"><label>Institution Name *</label><input required value={instForm.name} onChange={(e) => setInstForm({ ...instForm, name: e.target.value })} /></div>
                <div className="field"><label>URL Slug</label><input value={instForm.slug} onChange={(e) => setInstForm({ ...instForm, slug: e.target.value })} placeholder="auto-generated if empty" /></div>
              </div>

              <div className="row3">
                <div className="field">
                  <label>Category</label>
                  <select value={instForm.type} onChange={(e) => setInstForm({ ...instForm, type: e.target.value })}>
                    {['IIT', 'NIT', 'IIIT', 'Central', 'Private'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field"><label>Location</label><input value={instForm.location} onChange={(e) => setInstForm({ ...instForm, location: e.target.value })} /></div>
                <div className="field"><label>Est. Year</label><input type="number" value={instForm.est} onChange={(e) => setInstForm({ ...instForm, est: e.target.value })} /></div>
              </div>

              <div className="row3">
                <div className="field"><label>NIRF Display</label><input value={instForm.nirf} onChange={(e) => setInstForm({ ...instForm, nirf: e.target.value })} /></div>
                <div className="field"><label>NIRF Rank Number</label><input type="number" value={instForm.nirfNum} onChange={(e) => setInstForm({ ...instForm, nirfNum: e.target.value })} /></div>
                <div className="field"><label>Fees / Sem</label><input value={instForm.fees} onChange={(e) => setInstForm({ ...instForm, fees: e.target.value })} /></div>
              </div>

              <div className="row3">
                <div className="field"><label>Highest CTC</label><input value={instForm.highestCTC} onChange={(e) => setInstForm({ ...instForm, highestCTC: e.target.value })} /></div>
                <div className="field"><label>Average CTC</label><input value={instForm.avgCTC} onChange={(e) => setInstForm({ ...instForm, avgCTC: e.target.value })} /></div>
                <div className="field"><label>Campus Size</label><input value={instForm.size} onChange={(e) => setInstForm({ ...instForm, size: e.target.value })} /></div>
              </div>

              <div className="row3">
                <div className="field"><label>Hostels Info</label><input value={instForm.hostels} onChange={(e) => setInstForm({ ...instForm, hostels: e.target.value })} /></div>
                <div className="field"><label>Student Count</label><input value={instForm.students} onChange={(e) => setInstForm({ ...instForm, students: e.target.value })} /></div>
                <div className="field"><label>Academics Rating (1-5)</label><input type="number" step="0.1" min="1" max="5" value={instForm.academicsRating} onChange={(e) => setInstForm({ ...instForm, academicsRating: e.target.value })} /></div>
              </div>

              <div className="field"><label>Departments (comma-separated)</label><input value={instForm.departments} onChange={(e) => setInstForm({ ...instForm, departments: e.target.value })} /></div>
              <div className="field"><label>Facilities (comma-separated)</label><input value={instForm.facilities} onChange={(e) => setInstForm({ ...instForm, facilities: e.target.value })} /></div>
              <div className="field"><label>About Description</label><textarea style={{ minHeight: 90 }} value={instForm.about} onChange={(e) => setInstForm({ ...instForm, about: e.target.value })} /></div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDrawerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div id="toast" className={toastMsg ? 'show' : ''}>
        <div className="toast-icon">✓</div>
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}