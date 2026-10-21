import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { API, CONFIG, loadDB, normalizeReview, getToken, setToken, clearToken } from './masterApi';
import './styles.css';

/* ================= UI config (was data.js CATS / state.js PAGE_SIZE) ================= */
const CATS = {
  IIT: { label: 'IITs', full: 'Indian Institutes of Technology', icon: '🔷', color: '#3D46F2', colorDeep: '#2127A1',
    desc: 'Autonomous engineering and technology institutes known for elite entrance standards, deep research output, and graduates who go on to lead global tech and business.' },
  NIT: { label: 'NITs', full: 'National Institutes of Technology', icon: '🟢', color: '#00A36C', colorDeep: '#00734E',
    desc: 'A network of institutes of national importance offering strong engineering programs, competitive placements, and a friendlier fee structure than most private options.' },
  IIIT: { label: 'IIITs', full: 'Indian Institutes of Information Technology', icon: '🟠', color: '#E87A00', colorDeep: '#B35F00',
    desc: 'Specialized institutes built around information technology, computer science, and electronics — with curricula tuned for the software and product industry.' },
  Central: { label: 'Central Universities', full: 'Central Universities', icon: '🏛️', color: '#6B21A8', colorDeep: '#4C1580',
    desc: 'Government-funded, multidisciplinary universities offering a broad mix of sciences, humanities, and professional courses across sprawling campuses.' },
  Private: { label: 'Private Institutes', full: 'Private Universities & Institutes', icon: '🏢', color: '#1565C0', colorDeep: '#0D3E7A',
    desc: 'Independently run universities and institutes offering flexible admissions, modern infrastructure, and industry-aligned programs.' },
};
const PAGE_SIZE = { home: 6, category: 6, reviews: 4 };
const AVATAR_COLORS = ['#3D46F2', '#00A36C', '#E87A00', '#E03E3E', '#6B21A8', '#1565C0'];
const COURSES = [['B.Tech', 'B.TECH'], ['B.E.', 'B.E.'], ['M.Tech', 'M.TECH'], ['M.S. Research', 'M.S. (RESEARCH)'], ['MBA', 'MBA'], ['Ph.D.', 'PH.D.'],
  ['Dual Degree', 'DUAL DEGREE'], ['Integrated M.Tech', 'INT. M.TECH'], ['M.Sc.', 'M.SC.'], ['B.Arch.', 'B.ARCH.']];
const YEARS = ['Currently Enrolled', 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016];
const EXAMS = [['JEE Advanced', 'JEE Advanced'], ['JEE Main', 'JEE Main'], ['GATE', 'GATE'], ['BITSAT', 'BITSAT'], ['State CET', 'State CET'], ['CUET', 'CUET'], ['UGEE', 'UGEE (IIIT-H)'], ['Other', 'Other']];

/* ================= helpers (was utils.js) ================= */
const Ctx = createContext();
const useA = () => useContext(Ctx);
const initialsOf = (a) => a.split(' ').map((n) => n[0]).join('');
const slugOrId = (i) => i.slug || i.id;
const revsOf = (db, id) => db.reviews.filter((r) => r.instId === id);
const getAvgRating = (db, id) => { const r = revsOf(db, id); return r.length ? r.reduce((a, b) => a + b.rating, 0) / r.length : 0; };
const getRevCount = (db, id) => revsOf(db, id).length;
function getFacilityIcon(f) {
  const map = { Library: '📚', Pool: '🏊', Hostel: '🏠', Hospital: '🏥', Health: '🏥', Ground: '🏟️', Sports: '🏅', Lab: '🔬', Cafeteria: '☕', Market: '🛍️', Food: '🍽️', Beach: '🏖️', Forest: '🌿', Research: '🔬' };
  for (const [k, v] of Object.entries(map)) if (f.toLowerCase().includes(k.toLowerCase())) return v;
  return '🏛️';
}
const scrollSoon = (sel) => setTimeout(() => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
const matches = (i, q) => { q = q.toLowerCase(); return i.name.toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q) || i.departments.some((d) => d.toLowerCase().includes(q)); };

function Pagination({ total, current, perPage, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;
  const pages = [];
  const add = (p) => { if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p); };
  add(1); for (let p = current - 1; p <= current + 1; p++) add(p); add(totalPages);
  pages.sort((a, b) => a - b);
  let prev = 0;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button className="page-btn page-nav" disabled={current === 1} onClick={() => onPage(current - 1)} aria-label="Previous page">‹ Prev</button>
      {pages.map((p) => { const gap = p - prev > 1; prev = p; return (
        <span key={p} style={{ display: 'contents' }}>
          {gap && <span className="page-ellipsis">…</span>}
          <button className={`page-btn ${p === current ? 'active' : ''}`} aria-current={p === current ? 'page' : undefined} onClick={() => onPage(p)}>{p}</button>
        </span>); })}
      <button className="page-btn page-nav" disabled={current === totalPages} onClick={() => onPage(current + 1)} aria-label="Next page">Next ›</button>
    </nav>
  );
}

/* ================= cards (home.js / reviews.js) ================= */
function CollegeCard({ inst }) {
  const { db, goToCollege } = useA();
  const avg = getAvgRating(db, inst.id), count = getRevCount(db, inst.id);
  return (
    <div className="c-card" onClick={() => goToCollege(slugOrId(inst))}>
      <div className="c-card-image">
        <img src={inst.img} alt={inst.name} onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&q=80'; }} />
        <div className="c-card-image-overlay"></div>
        <div className="c-card-image-tag"><span className={`tag ${inst.type}`}>{inst.type}</span></div>
        <div className="c-card-nirf">🏆 {inst.nirf}</div>
      </div>
      <div className="c-card-body">
        <div className="c-card-title">{inst.name}</div>
        <div className="c-card-loc">📍 {inst.location}</div>
        <div className="c-card-stats">
          <div className="c-stat"><div className="c-stat-val star">★ {avg > 0 ? avg.toFixed(1) : 'New'}</div><div className="c-stat-label">{count} Reviews</div></div>
          <div className="c-stat"><div className="c-stat-val">{inst.avgCTC}</div><div className="c-stat-label">Avg CTC</div></div>
          <div className="c-stat"><div className="c-stat-val">{inst.fees}</div><div className="c-stat-label">Fees / Sem</div></div>
        </div>
      </div>
      <div className="c-card-footer">
        <div className="c-card-dept-chips">{inst.departments.slice(0, 3).map((d) => <span key={d} className="dept-chip">{d}</span>)}</div>
        <span className="c-card-arrow">→</span>
      </div>
    </div>
  );
}

function HomeReviewCard({ r }) {
  const { db } = useA();
  const inst = db.institutions.find((i) => i.id === r.instId);
  if (!inst) return null;
  return (
    <div className="home-review-card">
      <div className="home-rev-header">
        <div><div className="home-rev-college">{inst.name}</div><div className="home-rev-branch">{r.branch}</div></div>
        <div className="home-rev-stars">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < r.rating ? 'star-icon' : 'star-icon empty'}>★</span>)}</div>
      </div>
      <div className="pc-mini">
        <div className="pc-mini-item pro"><span className="pc-mini-label">✓ Pros</span>{r.pros.substring(0, 90)}{r.pros.length > 90 ? '…' : ''}</div>
        <div className="pc-mini-item con"><span className="pc-mini-label">✗ Cons</span>{r.cons.substring(0, 90)}{r.cons.length > 90 ? '…' : ''}</div>
      </div>
      <div className="home-rev-quote">{r.body.substring(0, 140)}…</div>
      <div className="home-rev-author">
        <div className="rev-avatar" style={{ background: AVATAR_COLORS[r.colorIdx % AVATAR_COLORS.length] }}>{initialsOf(r.author)}</div>
        <div><div className="rev-author-name">{r.author}</div><div className="rev-author-meta">{r.branch} · Batch {r.batch} · {r.exam}</div></div>
      </div>
    </div>
  );
}

/* ================= header / auth (auth.js) ================= */
function AuthArea({ id }) {
  const { user, logout, setAuthOpen } = useA();
  if (!CONFIG.LOGIN_ENABLED) return <div id={id}></div>; // login feature switched off in masterApi.js
  return (
    <div id={id}>
      {user ? (<>
        <span className="auth-user" style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo)' }}>Hi, {user.name}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ marginLeft: 8 }}>Log Out</button>
      </>) : <button className="btn btn-ghost btn-sm" onClick={() => setAuthOpen(true)}>Log In</button>}
    </div>
  );
}

function Header() {
  const { goHome, hq, onHeaderSearch, scrolled } = useA();
  return (
    <header className={`site${scrolled ? ' scrolled' : ''}`} id="siteHeader">
      <div className="bar">
        <div className="brand" onClick={goHome}>
          <div className="seal">CF</div>
          <div className="brand-text"><b>CampusFile</b><span>Verified Student Reviews</span></div>
        </div>
        <div className="bar-search">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" /></svg>
          <input id="headerSearchInput" type="text" placeholder="Search colleges, departments…" autoComplete="off" value={hq} onChange={(e) => onHeaderSearch(e.target.value)} />
        </div>
        <div className="bar-right">
          <span className="nav-link" onClick={goHome} style={{ cursor: 'pointer' }}>Home</span>
          <span className="nav-link" onClick={() => document.getElementById('reviewsAnchor')?.scrollIntoView({ behavior: 'smooth' })} style={{ cursor: 'pointer' }}>Reviews</span>
          <AuthArea id="authArea" />
        </div>
      </div>
    </header>
  );
}

/* ================= VIEW 1: home (home.js) ================= */
function Home() {
  const A = useA();
  const { db, activeCat, setActiveCat, mainQ, setMainQ, homeSort, setHomeSort, homePage, setHomePage, goToCategory } = A;
  const byType = (t) => db.institutions.filter((i) => i.type === t).length;
  const rated = db.institutions.filter((i) => getRevCount(db, i.id) > 0);
  const avg = rated.length ? rated.reduce((s, i) => s + getAvgRating(db, i.id), 0) / rated.length : 0;

  let insts = db.institutions;
  if (activeCat !== 'All') insts = insts.filter((i) => i.type === activeCat);
  if (mainQ.trim()) insts = insts.filter((i) => matches(i, mainQ));
  insts = [...insts].sort((a, b) => {
    if (homeSort === 'rating') return getAvgRating(db, b.id) - getAvgRating(db, a.id);
    if (homeSort === 'reviews') return getRevCount(db, b.id) - getRevCount(db, a.id);
    if (homeSort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });
  const perPage = PAGE_SIZE.home;
  const totalPages = Math.max(1, Math.ceil(insts.length / perPage));
  const page = Math.min(Math.max(1, homePage), totalPages);
  const start = (page - 1) * perPage;
  const items = insts.slice(start, start + perPage);
  const catLabel = activeCat === 'All' ? 'Institutes' : activeCat + 's';
  const pills = [['IIT', '🔷', 'IITs', 'IITs'], ['NIT', '🟢', 'NITs', 'NITs'], ['IIIT', '🟠', 'IIITs', 'IIITs'], ['Central', '🏛️', 'Central Univ.', 'Central Universities'], ['Private', '🏢', 'Private', 'Private Institutes']];
  const featured = [...db.reviews].sort((a, b) => b.helpful - a.helpful).slice(0, 3);
  const setCat = (c) => { setActiveCat(c); setHomePage(1); };

  return (
    <div id="viewDiscovery">
      <section className="hero">
        <div className="hero-eyebrow"><span></span>100% Student-Verified — No Paid Rankings</div>
        <h1>The honest report card on India's <em>best institutes</em></h1>
        <p className="hero-sub">Real reviews on academics, placements, campus life, hostel conditions and hidden fees — from students who've lived it.</p>
        <div className="hero-search-wrap">
          <div className="hero-search">
            <svg className="search-icon-big" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input id="mainSearchInput" type="text" placeholder="Search IIT Bombay, NIT Trichy, Computer Science…" autoComplete="off" value={mainQ}
              onChange={(e) => { setHomePage(1); setMainQ(e.target.value); }} onKeyDown={(e) => { if (e.key === 'Enter') setHomePage(1); }} />
            <button className="search-btn" onClick={() => setHomePage(1)}>Search</button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-num" id="heroStatReviews">{db.reviews.length}+</div><div className="hero-stat-label">Student Reviews</div></div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat"><div className="hero-stat-num" id="heroStatInstitutes">{db.institutions.length}</div><div className="hero-stat-label">Institutes Listed</div></div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat"><div className="hero-stat-num">100%</div><div className="hero-stat-label">Free to Access</div></div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat"><div className="hero-stat-num" id="heroStatRating">{avg > 0 ? avg.toFixed(1) + '★' : '—'}</div><div className="hero-stat-label">Avg Platform Rating</div></div>
        </div>
      </section>

      <div className="cat-bar" id="catBar">
        <button className={`cat-pill${activeCat === 'All' ? ' active' : ''}`} onClick={() => setCat('All')}>
          <span className="pill-icon">🎓</span> All Institutes <span className="pill-count">{db.institutions.length}</span>
        </button>
        {pills.map(([c, icon, label, full]) => (
          <button key={c} className="cat-pill" onClick={() => goToCategory(c)} title={`Open the ${full} page`}>
            <span className="pill-icon">{icon}</span> {label} <span className="pill-count">{byType(c)}</span> <span className="pill-go">↗</span>
          </button>
        ))}
      </div>

      <section className="grid-section">
        <div className="section-head">
          <div>
            <h2 className="section-title" id="gridTitle">{activeCat === 'All' ? 'Popular Institutes' : `${activeCat} Colleges`}</h2>
            <div className="section-subtitle" id="gridSubtitle">{insts.length
              ? `Showing ${start + 1}–${start + items.length} of ${insts.length} ${catLabel}${mainQ ? ` matching "${mainQ}"` : ''}`
              : `No institutes${mainQ ? ` matching "${mainQ}"` : ''}`}</div>
          </div>
          <select id="sortGridSelect" value={homeSort} onChange={(e) => { setHomePage(1); setHomeSort(e.target.value); }} style={{ width: 'auto', padding: '8px 14px', fontSize: 13, background: 'var(--card)' }}>
            <option value="rating">Sort: Top Rated</option><option value="reviews">Sort: Most Reviewed</option><option value="name">Sort: A–Z</option>
          </select>
        </div>
        <div className="colleges-grid" id="collegeGrid">{items.map((i) => <CollegeCard key={i.id} inst={i} />)}</div>
        <div id="homePagination"><Pagination total={insts.length} current={page} perPage={perPage} onPage={(n) => { setHomePage(n); scrollSoon('#viewDiscovery .grid-section'); }} /></div>
        <div id="noResults" className={insts.length ? 'hidden' : ''}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div><h3>No institutes found</h3><p>Try different search terms or change the category filter.</p>
        </div>
      </section>

      <div id="reviewsAnchor"></div>
      <section className="reviews-strip-section">
        <div className="reviews-strip-inner">
          <div className="reviews-strip-head"><h2>What students are saying</h2><p>Unfiltered, honest reviews from real students across India's top institutes</p></div>
          <div className="reviews-row" id="featuredReviews">{featured.map((r) => <HomeReviewCard key={r.id} r={r} />)}</div>
        </div>
      </section>
    </div>
  );
}

/* ================= VIEW 3: category (category.js) ================= */
function Category() {
  const { db, currentCat, catQ, setCatQ, catSort, setCatSort, catPage, setCatPage, goHome, goToCategory } = useA();
  const meta = CATS[currentCat];
  if (!meta) return null;
  const all = db.institutions.filter((i) => i.type === currentCat);
  let insts = catQ.trim() ? all.filter((i) => matches(i, catQ)) : all;
  insts = [...insts].sort((a, b) => {
    if (catSort === 'rating') return getAvgRating(db, b.id) - getAvgRating(db, a.id);
    if (catSort === 'reviews') return getRevCount(db, b.id) - getRevCount(db, a.id);
    if (catSort === 'nirf') return (a.nirfNum || 999) - (b.nirfNum || 999);
    if (catSort === 'name') return a.name.localeCompare(b.name);
    return 0;
  });
  const totalReviews = all.reduce((s, i) => s + getRevCount(db, i.id), 0);
  const ratedInsts = all.filter((i) => getRevCount(db, i.id) > 0);
  const avgLabel = ratedInsts.length ? (ratedInsts.reduce((s, i) => s + getAvgRating(db, i.id), 0) / ratedInsts.length).toFixed(1) + '★' : '—';
  const bestNirf = all.filter((i) => i.nirfNum).sort((a, b) => a.nirfNum - b.nirfNum)[0];
  const perPage = PAGE_SIZE.category;
  const totalPages = Math.max(1, Math.ceil(insts.length / perPage));
  const page = Math.min(Math.max(1, catPage), totalPages);
  const start = (page - 1) * perPage;
  const items = insts.slice(start, start + perPage);
  const catRevs = db.reviews.filter((r) => all.some((i) => i.id === r.instId)).sort((a, b) => b.helpful - a.helpful).slice(0, 3);
  const stat = (n, l) => <div className="cat-hero-stat"><div className="cat-hero-stat-num">{n}</div><div className="cat-hero-stat-label">{l}</div></div>;

  return (
    <div id="viewCategory">
      <div className="cat-hero" id="catHero" style={{ '--cat-color': meta.color, '--cat-color-deep': meta.colorDeep }}>
        <div className="cat-hero-blob cat-hero-blob1"></div><div className="cat-hero-blob cat-hero-blob2"></div>
        <div className="cat-hero-inner">
          <button className="back-btn" onClick={goHome}>← Back to Directory</button>
          <div className="cat-hero-icon" id="catHeroIcon">{meta.icon}</div>
          <span className="tag" id="catHeroTag" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', backdropFilter: 'blur(8px)', marginBottom: 16 }}>
            {all.length} {all.length === 1 ? 'Institute' : 'Institutes'} Listed</span>
          <h1 id="catHeroTitle">{meta.full}</h1>
          <p className="cat-hero-desc" id="catHeroDesc">{meta.desc}</p>
          <div className="cat-hero-stats" id="catHeroStats">
            {stat(all.length, 'Institutes')}{stat(totalReviews, 'Student Reviews')}{stat(avgLabel, 'Avg Rating')}{stat(bestNirf ? '#' + bestNirf.nirfNum : '—', 'Best NIRF Rank')}
          </div>
        </div>
      </div>

      <section className="grid-section" style={{ paddingTop: 40, paddingBottom: 0 }}>
        <div className="hero-search-wrap" style={{ margin: '0 auto 8px', maxWidth: 640 }}>
          <div className="hero-search" style={{ boxShadow: 'var(--shadow)' }}>
            <svg className="search-icon-big" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input id="catSearchInput" type="text" placeholder="Search within this category…" autoComplete="off" style={{ padding: '18px 20px 18px 56px', fontSize: 15 }}
              value={catQ} onChange={(e) => { setCatPage(1); setCatQ(e.target.value); }} />
          </div>
        </div>
      </section>

      <section className="grid-section">
        <div className="section-head">
          <div>
            <h2 className="section-title" id="catGridTitle">{meta.label}</h2>
            <div className="section-subtitle" id="catGridSubtitle">{insts.length
              ? `Showing ${start + 1}–${start + items.length} of ${all.length} ${meta.label}${catQ ? ` matching "${catQ}"` : ''}`
              : `No ${meta.label} found${catQ ? ` matching "${catQ}"` : ''}`}</div>
          </div>
          <select id="catSortSelect" value={catSort} onChange={(e) => { setCatPage(1); setCatSort(e.target.value); }} style={{ width: 'auto', padding: '8px 14px', fontSize: 13, background: 'var(--card)' }}>
            <option value="rating">Sort: Top Rated</option><option value="reviews">Sort: Most Reviewed</option><option value="nirf">Sort: NIRF Rank</option><option value="name">Sort: A–Z</option>
          </select>
        </div>
        <div className="colleges-grid" id="categoryGrid">{items.map((i) => <CollegeCard key={i.id} inst={i} />)}</div>
        <div id="catPagination"><Pagination total={insts.length} current={page} perPage={perPage} onPage={(n) => { setCatPage(n); scrollSoon('#categoryGrid'); }} /></div>
        <div id="catNoResults" className={`${insts.length ? 'hidden ' : ''}empty-state`}>
          <div className="empty-state-icon">🔍</div><h3>No institutes found</h3><p>Try a different search term.</p>
        </div>
      </section>

      <section className="reviews-strip-section">
        <div className="reviews-strip-inner">
          <div className="reviews-strip-head"><h2 id="catReviewsTitle">What students say about {meta.label}</h2><p>Unfiltered, honest reviews from real students in this category</p></div>
          <div className="reviews-row" id="categoryFeaturedReviews">
            {catRevs.length ? catRevs.map((r) => <HomeReviewCard key={r.id} r={r} />) : (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-state-icon">📝</div><h3>No reviews yet</h3><p>Be the first to review a {meta.label.replace(/s$/, '')} institute.</p>
              </div>)}
          </div>
        </div>
      </section>

      <section className="grid-section" style={{ paddingTop: 0 }}>
        <div className="section-head"><h2 className="section-title" style={{ fontSize: 18 }}>Explore Other Categories</h2></div>
        <div className="cat-bar" id="catOtherPills" style={{ padding: 0 }}>
          {Object.keys(CATS).filter((c) => c !== currentCat).map((c) => (
            <button key={c} className="cat-pill" onClick={() => goToCategory(c)}>
              <span className="pill-icon">{CATS[c].icon}</span> {CATS[c].label} <span className="pill-count">{db.institutions.filter((i) => i.type === c).length}</span> <span className="pill-go">↗</span>
            </button>))}
        </div>
      </section>
    </div>
  );
}

/* ================= VIEW 2: college (college.js / reviews.js / data-tabs.js) ================= */
function HelpfulBtn({ r }) {
  const { markHelpful } = useA();
  const [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  return (
    <button className="helpful-btn" disabled={busy || done} style={done ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
      onClick={async () => { setBusy(true); if (await markHelpful(r.id)) setDone(true); else setBusy(false); }}>👍 Helpful ({r.helpful || 0})</button>
  );
}

function ReviewsTab({ inst }) {
  const { db, filters, reviewsPage, setReviewsPage } = useA();
  let revs = db.reviews.filter((r) => r.instId === inst.id);
  if (filters.dept !== 'All') revs = revs.filter((r) => r.branch === filters.dept);
  if (filters.exam !== 'All') revs = revs.filter((r) => r.exam === filters.exam);
  revs = [...revs].sort((a, b) => {
    if (filters.sort === 'newest') return new Date(b.date) - new Date(a.date);
    if (filters.sort === 'highest') return b.rating - a.rating;
    if (filters.sort === 'lowest') return a.rating - b.rating;
    return 0;
  });
  if (!revs.length) return <div className="empty-state"><div className="empty-state-icon">📝</div><h3>No reviews match these filters</h3><p>Try changing the department or admission filter.</p></div>;
  const perPage = PAGE_SIZE.reviews;
  const totalPages = Math.max(1, Math.ceil(revs.length / perPage));
  const page = Math.min(Math.max(1, reviewsPage), totalPages);
  const start = (page - 1) * perPage;
  const pageRevs = revs.slice(start, start + perPage);
  return (<>
    <div className="reviews-count">Showing {start + 1}–{start + pageRevs.length} of {revs.length} review{revs.length !== 1 ? 's' : ''}</div>
    <div className="reviews-main">
      {pageRevs.map((r) => (
        <article className="rev-card" key={r.id}>
          <div className="rev-card-top">
            <div className="rev-card-left">
              <div className="rev-branch">{r.branch}</div>
              <div className="rev-meta">Reviewed by <b>{r.author}</b> · Batch {r.batch || 'N/A'}</div>
              <div className="rev-admit">
                <span className="rev-admit-chip">🎓 <b>{r.exam}</b></span>
                {r.rank && <span className="rev-admit-chip">AIR <b>{r.rank}</b></span>}
                {r.score && <span className="rev-admit-chip">Score <b>{r.score}</b></span>}
              </div>
            </div>
            <div className={`rating-badge r${r.rating}`}>
              <div className="rb-num">{r.rating}/5</div>
              <div className="rb-label">{['', 'Avoid', 'Poor', 'Average', 'Good', 'Excellent'][r.rating]}</div>
            </div>
          </div>
          <div className="pros-cons">
            <div className="pc-box pro"><span className="pc-label">✓ Pros</span>{r.pros}</div>
            <div className="pc-box con"><span className="pc-label">✗ Cons</span>{r.cons}</div>
          </div>
          <div className="rev-body-title">Overall Experience</div>
          <p className="rev-body-text">{r.body}</p>
          <div className="rev-card-foot">
            <span className="rev-date">📅 {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <div className="rev-helpful"><HelpfulBtn r={r} /></div>
          </div>
        </article>))}
    </div>
    <Pagination total={revs.length} current={page} perPage={perPage} onPage={(n) => { setReviewsPage(n); scrollSoon('.col-tabs-bar'); }} />
  </>);
}

function Overview({ inst }) {
  return (<>
    <div className="overview-section"><h3>About {inst.name}</h3><p className="rev-body-text" style={{ lineHeight: 1.8 }}>{inst.about}</p></div>
    <div className="overview-section"><h3>Campus Facilities</h3>
      <div className="facility-grid">{inst.facilities.map((f) => <div className="facility-item" key={f}><span className="facility-icon">{getFacilityIcon(f)}</span>{f}</div>)}</div></div>
    <div className="overview-section"><h3>Departments Offered</h3>
      <div className="recruiter-chips">{inst.departments.map((d) => <span className="recruiter-chip" key={d}>{d}</span>)}</div></div>
  </>);
}

function ResetBtn({ onClick }) {
  const hov = (on) => (e) => { const s = e.currentTarget.style; s.borderColor = on ? 'var(--indigo)' : 'var(--line)'; s.color = on ? 'var(--indigo)' : 'var(--ink-soft)'; s.background = on ? 'var(--indigo-tint)' : 'var(--paper)'; };
  return <div className="filter-item" style={{ display: 'flex', alignItems: 'flex-end' }}>
    <button onClick={onClick} onMouseOver={hov(true)} onMouseOut={hov(false)}
      style={{ padding: '10px 18px', border: '1.5px solid var(--line)', borderRadius: 9, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', background: 'var(--paper)', cursor: 'pointer', width: '100%', transition: 'all .15s' }}>↺ Reset Filters</button></div>;
}
const FilterSel = ({ label, value, onChange, opts, allLabel }) => (
  <div className="filter-item"><label>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o === 'All' ? allLabel : o}</option>)}</select></div>
);

function Placements({ inst }) {
  const { db, placeF, setPlaceF } = useA();
  const all = db.placements[inst.id] || [];
  const years = ['All', ...[...new Set(all.map((d) => d.year))].sort((a, b) => b - a)];
  const branches = ['All', ...inst.departments.filter((d) => all.some((r) => r.branch === d))];
  const courses = ['All', ...new Set(all.map((d) => d.course))];
  let rows = all;
  if (placeF.year !== 'All') rows = rows.filter((r) => r.year === placeF.year);
  if (placeF.branch !== 'All') rows = rows.filter((r) => r.branch === placeF.branch);
  if (placeF.course !== 'All') rows = rows.filter((r) => r.course === placeF.course);
  const set = (k) => (v) => setPlaceF({ ...placeF, [k]: v });

  let body;
  if (!rows.length) body = <div className="no-data"><div className="icon">📊</div><p>No placement data for selected filters.</p></div>;
  else {
    const totalEl = rows.reduce((s, r) => s + r.eligible, 0), totalPl = rows.reduce((s, r) => s + r.placed, 0);
    const ovPct = totalEl ? Math.round((totalPl / totalEl) * 100) : 0;
    const intl = rows.reduce((s, r) => s + (r.intlOffers || 0), 0), ppos = rows.reduce((s, r) => s + (r.ppoOffers || 0), 0);
    const parse = (s) => parseFloat((s || '0').replace(/[₹\s,]/g, '').replace('Cr', '00').replace('LPA', ''));
    const hi = rows.slice().sort((a, b) => parse(b.highCTC) - parse(a.highCTC))[0];
    const pClass = (p) => (p >= 90 ? 'high' : p >= 75 ? 'mid' : 'low');
    const byYear = {}; rows.forEach((r) => (byYear[r.year] = byYear[r.year] || []).push(r));
    body = (<>
      <div className="stat-row">
        <div className="stat-box"><div className="stat-box-label">Overall Placement</div><div className="stat-box-val" style={{ color: ovPct >= 90 ? 'var(--green)' : ovPct >= 75 ? 'var(--indigo)' : 'var(--saffron)' }}>{ovPct}%</div><div className="stat-box-sub">{totalPl} of {totalEl} students</div></div>
        <div className="stat-box"><div className="stat-box-label">Highest CTC (Selected)</div><div className="stat-box-val" style={{ color: 'var(--saffron)' }}>{hi?.highCTC || '—'}</div><div className="stat-box-sub">{hi?.branch || ''}</div></div>
        <div className="stat-box"><div className="stat-box-label">International Offers</div><div className="stat-box-val" style={{ color: 'var(--indigo)' }}>{intl}</div><div className="stat-box-sub">across selected rows</div></div>
        <div className="stat-box"><div className="stat-box-label">PPO Conversions</div><div className="stat-box-val" style={{ color: 'var(--green)' }}>{ppos}</div><div className="stat-box-sub">pre-placement offers</div></div>
      </div>
      {Object.keys(byYear).sort((a, b) => b - a).map((yr) => {
        const yr_ = byYear[yr], yrPl = yr_.reduce((s, r) => s + r.placed, 0), yrEl = yr_.reduce((s, r) => s + r.eligible, 0);
        return (
          <div className="data-table-card" key={yr}>
            <div className="dtc-header"><div className="dtc-title">📅 {yr} Placement Report</div><span className="dtc-badge">{yrEl ? Math.round((yrPl / yrEl) * 100) : 0}% placed · {yrPl}/{yrEl} students</span></div>
            <div className="table-scroll"><table className="dt">
              <thead><tr><th>Branch / Department</th><th>Course</th><th>Placed / Eligible</th><th>Placement %</th><th>Highest CTC</th><th>Average CTC</th><th>Median CTC</th><th>Intl.</th><th>PPO</th><th>Top Recruiters</th></tr></thead>
              <tbody>{yr_.map((r) => { const pct = r.eligible ? Math.round((r.placed / r.eligible) * 100) : 0, pc = pClass(pct); return (
                <tr key={r._id}>
                  <td style={{ fontWeight: 600, minWidth: 180 }}>{r.branch}</td>
                  <td><span className="tag Other">{r.course}</span></td>
                  <td>{r.placed} / {r.eligible}</td>
                  <td><div className="pct-bar-wrap"><div className="pct-track"><div className={`pct-fill ${pc}`} style={{ width: `${pct}%` }}></div></div><span className={`pct-label ${pc}`}>{pct}%</span></div></td>
                  <td className="ctc-high">{r.highCTC}</td><td className="ctc-avg">{r.avgCTC}</td>
                  <td style={{ color: 'var(--ink-soft)' }}>{r.medCTC}</td>
                  <td style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, color: 'var(--indigo)' }}>{r.intlOffers || 0}</td>
                  <td style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, color: 'var(--green)' }}>{r.ppoOffers || 0}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 200 }}>{r.topRecruiters.join(', ')}</td>
                </tr>); })}</tbody>
            </table></div>
          </div>);
      })}
    </>);
  }
  return (
    <div className="data-page-wrap">
      <div className="filter-bar-box"><div className="filter-bar-title">🔽 Filter Placements</div>
        <div className="filter-grid">
          <FilterSel label="Academic Year" value={placeF.year} onChange={set('year')} opts={years} allLabel="All Years" />
          <FilterSel label="Branch / Department" value={placeF.branch} onChange={set('branch')} opts={branches} allLabel="All Branches" />
          <FilterSel label="Course Type" value={placeF.course} onChange={set('course')} opts={courses} allLabel="All Courses" />
          <ResetBtn onClick={() => setPlaceF({ year: 'All', branch: 'All', course: 'All' })} />
        </div></div>
      <div id="placementTableArea">{body}</div>
    </div>
  );
}

function Cutoffs({ inst }) {
  const { db, cutF, setCutF } = useA();
  const all = db.cutoffs[inst.id] || [];
  const years = ['All', ...[...new Set(all.map((d) => d.year))].sort((a, b) => b - a)];
  const branches = ['All', ...inst.departments.filter((d) => all.some((r) => r.branch === d))];
  const cats = ['All', ...new Set(all.map((d) => d.category))];
  let rows = all;
  if (cutF.year !== 'All') rows = rows.filter((r) => r.year === cutF.year);
  if (cutF.branch !== 'All') rows = rows.filter((r) => r.branch === cutF.branch);
  if (cutF.category !== 'All') rows = rows.filter((r) => r.category === cutF.category);
  const set = (k) => (v) => setCutF({ ...cutF, [k]: v });

  let body;
  if (!rows.length) body = <div className="no-data"><div className="icon">🔍</div><p>No cutoff data for selected filters.</p></div>;
  else {
    const byYear = {}; rows.forEach((r) => (byYear[r.year] = byYear[r.year] || []).push(r));
    const isRank = !!rows[0].closeRank;
    body = Object.keys(byYear).sort((a, b) => b - a).map((yr) => (
      <div className="data-table-card" key={yr}>
        <div className="dtc-header"><div className="dtc-title">📅 {yr} Admission Cutoffs</div><span className="dtc-badge">{byYear[yr].length} branch{byYear[yr].length > 1 ? 'es' : ''}</span></div>
        <div className="table-scroll"><table className="dt">
          <thead><tr><th>Branch / Department</th><th>Category</th><th>Exam</th>{isRank ? <><th>Opening Rank</th><th>Closing Rank</th><th>vs Last Year</th></> : <><th>Opening %ile</th><th>Closing %ile</th><th>vs Last Year</th></>}</tr></thead>
          <tbody>{byYear[yr].map((r) => {
            const trend = isRank
              ? (r.prevClose && r.closeRank < r.prevClose ? <span className="trend-down trend-icon">▼ {r.prevClose - r.closeRank} ranks easier</span>
                : r.prevClose && r.closeRank > r.prevClose ? <span className="trend-up trend-icon">▲ {r.closeRank - r.prevClose} ranks tougher</span> : '—')
              : (r.prevPct ? (parseFloat(r.percentile) < parseFloat(r.prevPct) ? <span className="trend-down trend-icon">▼ Easier</span> : <span className="trend-up trend-icon">▲ Tougher</span>) : '—');
            return (
              <tr key={r._id}>
                <td style={{ fontWeight: 600, maxWidth: 220 }}>{r.branch}</td>
                <td><span className={`cat-pill cat-${(r.category || '').replace('-', '')}`}>{r.category}</span></td>
                <td style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{r.exam}</td>
                {isRank ? <><td className="rank-open">{r.openRank ? 'AIR ' + r.openRank : '—'}</td><td className="rank-val">{r.closeRank ? 'AIR ' + r.closeRank : '—'}</td></>
                  : <><td className="rank-open">{r.openPct ? r.openPct + ' %ile' : '—'}</td><td className="rank-val">{r.percentile ? r.percentile + ' %ile' : '—'}</td></>}
                <td style={{ fontSize: 13 }}>{trend}</td>
              </tr>); })}</tbody>
        </table></div>
      </div>));
  }
  return (
    <div className="data-page-wrap">
      <div className="filter-bar-box"><div className="filter-bar-title">🔽 Filter Cutoffs</div>
        <div className="filter-grid">
          <FilterSel label="Academic Year" value={cutF.year} onChange={set('year')} opts={years} allLabel="All Years" />
          <FilterSel label="Branch / Department" value={cutF.branch} onChange={set('branch')} opts={branches} allLabel="All Branches" />
          <FilterSel label="Category" value={cutF.category} onChange={set('category')} opts={cats} allLabel="All Categories" />
          <ResetBtn onClick={() => setCutF({ year: 'All', branch: 'All', category: 'All' })} />
        </div></div>
      <div id="cutoffTableArea">{body}</div>
    </div>
  );
}

function College() {
  const { db, currentInstId, activeTab, switchTab, filters, setFilters, setReviewsPage, goHome, openReviewModal } = useA();
  const inst = db.institutions.find((i) => i.id === currentInstId);
  if (!inst) return <div id="viewCollege"></div>;
  const avg = getAvgRating(db, inst.id), count = getRevCount(db, inst.id);
  const tabs = [['reviews', 'Student Reviews'], ['overview', 'Overview & Facts'], ['placements', 'Placements'], ['cutoffs', 'Cutoffs']];
  const row = (l, v, id, last) => <div className="info-row" style={last ? { borderBottom: 'none', paddingBottom: 0 } : undefined}><span className="info-row-label">{l}</span><b className="info-row-val" id={id}>{v}</b></div>;
  const setF = (k) => (e) => { setReviewsPage(1); setFilters({ ...filters, [k]: e.target.value }); };
  return (
    <div id="viewCollege">
      <div className="col-hero">
        <div className="col-hero-bg"><img id="cdHeroImg" src={inst.img || undefined} alt="Campus" /></div>
        <div className="col-hero-overlay"></div>
        <div className="col-hero-content">
          <button className="back-btn" onClick={goHome}>← Back to Directory</button>
          <div className="col-hero-bottom">
            <div className="col-hero-tags"><span id="cdTypeBadge" className={`tag ${inst.type}`}>{inst.type}</span><span id="cdEstBadge" className="tag Other">Est. {inst.est}</span></div>
            <h1 className="col-hero-title" id="cdName">{inst.name}</h1>
            <div className="col-hero-meta">
              <span className="col-hero-meta-item">📍 <span id="cdLocation">{inst.location}</span></span>
              <span className="col-hero-meta-item">🏛️ <span id="cdNirf">{inst.nirf}</span></span>
              <span className="col-hero-rating">⭐ <span id="cdRatingDisp">{avg > 0 ? avg.toFixed(1) : 'No reviews'}</span> · <span id="cdReviewCount">{count} review{count !== 1 ? 's' : ''}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="col-tabs-bar"><div className="col-tabs-inner">
        <div className="tabs">{tabs.map(([k, l]) => <div key={k} className={`tab${activeTab === k ? ' active' : ''}`} data-tab={k} onClick={() => switchTab(k)}>{l}</div>)}</div>
        <div className="col-actions"><button className="btn btn-primary btn-sm" onClick={openReviewModal}>✎ Write a Review</button><AuthArea id="authArea2" /></div>
      </div></div>

      <div className="col-layout">
        <aside>
          <div className="info-widget" id="statsWidget"><div className="info-widget-title">Quick Stats</div>
            {row('NIRF Rank', inst.nirf, 'qfNirf')}{row('Fees/Sem', inst.fees, 'qfFees')}{row('Campus', inst.size, 'qfSize')}{row('Highest CTC', inst.highestCTC, 'qfCtc')}
            {row('Avg CTC', inst.avgCTC, 'qfAvgCtc')}{row('Hostels', inst.hostels, 'qfHostels')}{row('Total Students', inst.students, 'qfStudents', true)}</div>
          <div className="info-widget" id="ratingWidget"><div className="info-widget-title">Rating Breakdown</div>
            <div className="rating-breakdown" id="ratingBreakdown">{Object.entries(inst.ratings).map(([k, v]) => (
              <div className="rating-row" key={k}><span className="rating-row-label">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                <div className="rating-bar-wrap"><div className="rating-bar-fill" style={{ width: `${(v / 5) * 100}%` }}></div></div><span className="rating-row-num">{v}</span></div>))}</div></div>
          <div className="info-widget" id="sidebarFilters" style={{ display: activeTab === 'reviews' ? 'block' : 'none' }}>
            <div className="info-widget-title">Filter Reviews</div>
            <div className="fgroup"><label>Department</label>
              <select id="deptSelect" value={filters.dept} onChange={setF('dept')}><option value="All">All Branches</option>{inst.departments.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div className="fgroup"><label>Admission Route</label>
              <select id="examSelect" value={filters.exam} onChange={setF('exam')}><option value="All">All Exams</option><option value="JEE Advanced">JEE Advanced</option><option value="JEE Main">JEE Main</option><option value="GATE">GATE</option><option value="State CET">State CET</option></select></div>
            <div className="fgroup"><label>Sort By</label>
              <select id="sortSelect" value={filters.sort} onChange={setF('sort')}><option value="newest">Newest First</option><option value="highest">Highest Rated</option><option value="lowest">Lowest Rated</option></select></div>
          </div>
        </aside>
        <main id="colMainContent">
          {activeTab === 'reviews' && <ReviewsTab inst={inst} />}
          {activeTab === 'overview' && <Overview inst={inst} />}
          {activeTab === 'placements' && <Placements inst={inst} />}
          {activeTab === 'cutoffs' && <Cutoffs inst={inst} />}
        </main>
      </div>
    </div>
  );
}

/* ================= modals (auth.js login + review-modal.js) ================= */
function Modals() {
  const { authOpen, reviewOpen, closeModals, doLogin, rv, setRv, submitReview, db, currentInstId } = useA();
  const [au, setAu] = useState({ email: '', pass: '' });
  const inst = db.institutions.find((i) => i.id === currentInstId);
  const set = (k) => (e) => setRv({ ...rv, [k]: e.target.value });
  const scrimClick = (e) => { if (e.target === e.currentTarget) closeModals(); };
  return (<>
    <div className={`scrim${authOpen && CONFIG.LOGIN_ENABLED ? ' open' : ''}`} id="authScrim" onClick={scrimClick}>
      <div className="modal">
        <button className="x-btn" onClick={closeModals}>✕</button>
        <div className="modal-head"><h2>Log In</h2><p>Sign in to write and track your reviews</p></div>
        <div className="modal-body">
          <div className="field"><label>Email</label><input id="auEmail" type="email" placeholder="you@example.com" value={au.email} onChange={(e) => setAu({ ...au, email: e.target.value })} /></div>
          <div className="field"><label>Password</label><input id="auPass" type="password" placeholder="••••••••" value={au.pass} onChange={(e) => setAu({ ...au, pass: e.target.value })} /></div>
          <div className="modal-foot" style={{ marginTop: 20 }}><button className="btn btn-primary" id="authSubmit" style={{ width: '100%' }} onClick={() => doLogin(au.email.trim(), au.pass)}>Log In</button></div>
        </div>
      </div>
    </div>

    <div className={`scrim${reviewOpen ? ' open' : ''}`} id="reviewScrim" onClick={scrimClick}>
      <div className="modal wide">
        <button className="x-btn" onClick={closeModals}>✕</button>
        <div className="modal-head"><h2>Write Your Campus Review</h2><p>Help thousands of students make the right decision.</p></div>
        <div className="modal-body">
          <div className="modal-section">
            <div className="m-kicker"><span className="m-kicker-num">1</span> Personal Info — Kept Private</div>
            <div className="row3">
              <div className="field"><label>Full Name</label><input id="rvName" placeholder="e.g. Rahul Sharma" value={rv.name} onChange={set('name')} /></div>
              <div className="field"><label>Email</label><input id="rvEmail" type="email" placeholder="rahul@college.ac.in" value={rv.email} onChange={set('email')} /></div>
              <div className="field"><label>Contact No.</label><input id="rvContact" placeholder="+91 98765 43210" value={rv.contact} onChange={set('contact')} /></div>
            </div>
            <div className="privacy-note">🔒 Email and contact are never shown publicly. Used only for verification.</div>
          </div>

          <div className="modal-section">
            <div className="m-kicker"><span className="m-kicker-num">2</span> Academic Profile</div>
            <div className="field"><label>Course / Programme</label>
              <div className="course-picker" id="coursePicker">{COURSES.map(([v, l]) => <button key={v} className={`course-btn${rv.course === v ? ' selected' : ''}`} data-val={v} onClick={() => setRv({ ...rv, course: v })}>{l}</button>)}</div></div>
            <div className="row2">
              <div className="field"><label>Institute</label><input id="rvInstName" disabled readOnly value={inst?.name || ''} /></div>
              <div className="field"><label>Branch / Department</label><select id="rvBranch" value={rv.branch} onChange={set('branch')}>{(inst?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            </div>
            <div className="row3">
              <div className="field"><label>Passed Out Year</label>
                <select id="rvPassoutYear" value={rv.passoutYear} onChange={set('passoutYear')}><option value="">Select Year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="field"><label>Admitting Exam</label>
                <select id="rvExam" value={rv.exam} onChange={set('exam')}>{EXAMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <div className="field"><label>Rank / AIR</label><input id="rvRank" type="number" placeholder="e.g. 1450" value={rv.rank} onChange={set('rank')} /></div>
            </div>
            <div className="row2">
              <div className="field"><label>Exam Score</label><input id="rvScore" placeholder="e.g. 245/360 or 99.9 %ile" value={rv.score} onChange={set('score')} /></div>
              <div className="field"><label>CGPA (optional)</label><input id="rvCGPA" placeholder="e.g. 8.4 / 10" value={rv.cgpa} onChange={set('cgpa')} /></div>
            </div>
          </div>

          <div className="modal-section">
            <div className="m-kicker"><span className="m-kicker-num">3</span> Your Experience</div>
            <div className="field"><label>Overall Rating</label>
              <div className="rate-stars" id="rvRatingStars">{[1, 2, 3, 4, 5].map((v) => <button key={v} data-v={v} className={v <= rv.rating ? 'on' : ''} onClick={(e) => { e.preventDefault(); setRv({ ...rv, rating: v }); }}>★</button>)}</div></div>
            <div className="row2">
              <div className="field"><label>✅ Pros — What worked?</label><textarea id="rvPros" placeholder="Great labs, amazing peer group, strong alumni network, excellent fest culture..." value={rv.pros} onChange={set('pros')}></textarea></div>
              <div className="field"><label>❌ Cons — What needs fixing?</label><textarea id="rvCons" placeholder="Strict attendance, mediocre mess food, limited core branch placements..." value={rv.cons} onChange={set('cons')}></textarea></div>
            </div>
            <div className="field"><label>Overall Experience</label><textarea id="rvBody" placeholder="Summarize your time here. What changed you? Would you choose this college again?" style={{ minHeight: 110 }} value={rv.body} onChange={set('body')}></textarea></div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={closeModals}>Cancel</button>
            <button className="btn btn-primary" id="rvSubmit" disabled={rv.busy} onClick={submitReview}>Publish Review →</button>
          </div>
        </div>
      </div>
    </div>
  </>);
}

/* ================= app shell: state + router + actions (state.js / router.js / main.js) ================= */
const RV0 = { name: '', email: '', contact: '', rank: '', score: '', cgpa: '', course: 'B.Tech', branch: '', passoutYear: '', exam: 'JEE Advanced', rating: 5, pros: '', cons: '', body: '', busy: false };

export default function App() {
  const [db, setDb] = useState({ institutions: [], reviews: [], cutoffs: {}, placements: {} });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('discovery');
  const [currentInstId, setCurrentInstId] = useState(null);
  const [currentCat, setCurrentCat] = useState(null);
  const [activeCat, setActiveCat] = useState('All');
  const [mainQ, setMainQ] = useState(''), [catQ, setCatQ] = useState(''), [hq, setHq] = useState('');
  const [homeSort, setHomeSort] = useState('rating'), [catSort, setCatSort] = useState('rating');
  const [homePage, setHomePage] = useState(1), [catPage, setCatPage] = useState(1), [reviewsPage, setReviewsPage] = useState(1);
  const [filters, setFilters] = useState({ dept: 'All', exam: 'All', sort: 'newest' });
  const [activeTab, setActiveTab] = useState('reviews');
  const [placeF, setPlaceF] = useState({ year: 'All', branch: 'All', course: 'All' });
  const [cutF, setCutF] = useState({ year: 'All', branch: 'All', category: 'All' });
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false), [reviewOpen, setReviewOpen] = useState(false);
  const [rv, setRv] = useState(RV0);
  const [toastState, setToastState] = useState({ msg: 'Done!', show: false });
  const [scrolled, setScrolled] = useState(false), [showTop, setShowTop] = useState(false);
  const dbRef = useRef(db); dbRef.current = db;
  const toastTimer = useRef();

  const toast = (msg) => { setToastState({ msg, show: true }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastState((t) => ({ ...t, show: false })), 3200); };
  const closeModals = () => { setAuthOpen(false); setReviewOpen(false); };

  /* --- router --- */
  const applyRoute = useCallback(() => {
    const [kind, val] = location.hash.replace(/^#/, '').split('/');
    const inst = dbRef.current.institutions.find((i) => i.id === val || i.slug === val);
    if (kind === 'category' && CATS[val]) { setCurrentCat(val); setCatPage(1); setCatQ(''); setView('category'); }
    else if (kind === 'college' && inst) {
      setCurrentInstId(inst.id); setFilters({ dept: 'All', exam: 'All', sort: 'newest' }); setActiveTab('reviews'); setReviewsPage(1);
      setPlaceF({ year: 'All', branch: 'All', course: 'All' }); setCutF({ year: 'All', branch: 'All', category: 'All' }); setView('college');
    } else { setCurrentInstId(null); setView('discovery'); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const navigate = (hash) => { if (location.hash === '#' + hash || (location.hash === '' && hash === '')) applyRoute(); else location.hash = hash; };
  const goHome = () => { setCurrentInstId(null); navigate(''); };
  const goToCollege = (id) => navigate('college/' + id);
  const goToCategory = (c) => navigate('category/' + c);

  /* --- startup: load data, then render route, then restore session --- */
  useEffect(() => {
    addEventListener('hashchange', applyRoute);
    const onScroll = () => { setScrolled(scrollY > 10); setShowTop(scrollY > 400); };
    addEventListener('scroll', onScroll);
    loadDB().then((d) => { setDb(d); dbRef.current = d; setReady(true); })
      .catch((e) => { console.error('Startup failed:', e); toast('Could not reach the server — is it running? (npm start)'); });
    return () => { removeEventListener('hashchange', applyRoute); removeEventListener('scroll', onScroll); };
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    if (!ready) return;
    applyRoute();
    if (CONFIG.LOGIN_ENABLED && getToken()) {
      API.auth.me().then((d) => setUser(d?.user || d)).catch(() => { clearToken(); setUser(null); });
    }
  }, [ready, applyRoute]);

  /* --- auth --- */
  const doLogin = async (email, password) => {
    if (!email || !password) { toast('Enter your email and password'); return; }
    try {
      const d = await API.auth.login(email, password);
      if (!d?.token) throw new Error(d?.message || 'Login failed');
      setToken(d.token); setUser(d.user); closeModals(); toast('Welcome, ' + d.user.name + '!');
    } catch (e) { toast(e.message); }
  };
  const logout = () => { setUser(null); clearToken(); toast('Logged out'); };

  /* --- header search (drives whichever view is open) --- */
  const onHeaderSearch = (v) => {
    setHq(v);
    if (view === 'discovery') { setMainQ(v); setHomePage(1); } else if (view === 'category') { setCatQ(v); setCatPage(1); }
  };

  /* --- college page --- */
  const switchTab = (n) => setActiveTab(n);
  const markHelpful = async (id) => {
    try {
      await API.reviews.helpful(id);
      setDb((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, helpful: (r.helpful || 0) + 1 } : r)) }));
      toast('Thanks for your feedback!'); return true;
    } catch { toast('Could not record that — try again.'); return false; }
  };

  /* --- write-a-review modal --- */
  const openReviewModal = () => {
    const inst = db.institutions.find((i) => i.id === currentInstId);
    setRv({ ...rv, name: '', email: '', contact: '', rank: '', score: '', cgpa: '', course: 'B.Tech', rating: 5, branch: inst?.departments[0] || '', busy: false });
    setReviewOpen(true);
  };
  const submitReview = async () => {
    const pros = rv.pros.trim(), body = rv.body.trim();
    if (!pros || !body) { toast('Please fill in Pros and your Overall Experience!'); return; }
    setRv((x) => ({ ...x, busy: true }));
    try {
      const saved = await API.reviews.create({
        instId: currentInstId, rating: rv.rating, course: rv.course, batch: rv.passoutYear || 'Currently Enrolled', exam: rv.exam, rank: rv.rank,
        score: rv.score, cgpa: rv.cgpa, pros, cons: rv.cons.trim() || 'Not specified.', body, branch: rv.branch,
        author: rv.name.trim() || 'Anonymous', email: rv.email.trim(), contact: rv.contact.trim(),
      });
      if (!saved?._id) throw new Error(saved?.message || 'Could not save review');
      setDb((d) => ({ ...d, reviews: [normalizeReview(saved), ...d.reviews] }));
      closeModals(); setReviewsPage(1); toast('Your review has been published!');
    } catch (e) { toast(e.message); }
    setRv((x) => ({ ...x, busy: false }));
  };

  const A = { db, currentInstId, currentCat, activeCat, setActiveCat, mainQ, setMainQ, catQ, setCatQ, hq, onHeaderSearch, homeSort, setHomeSort, catSort, setCatSort,
    homePage, setHomePage, catPage, setCatPage, reviewsPage, setReviewsPage, filters, setFilters, activeTab, switchTab, placeF, setPlaceF, cutF, setCutF,
    user, logout, doLogin, authOpen, setAuthOpen, reviewOpen, openReviewModal, closeModals, rv, setRv, submitReview, markHelpful, scrolled,
    goHome, goToCollege, goToCategory };

  return (
    <Ctx.Provider value={A}>
      <Header />
      {view === 'discovery' && <Home />}
      {view === 'college' && <College />}
      {view === 'category' && <Category />}

      <footer className="site-foot" id="siteFooter">
        <div className="foot-brand">CampusFile</div>
        <p>The most trusted student review platform for India's government & private institutes.</p>
        <div className="foot-links"><a href="#">About Us</a><a href="#">Write a Review</a><a href="#">Privacy Policy</a><a href="#">Contact</a><a href="#">Claim Your Institute</a></div>
        <p style={{ marginTop: 16, fontSize: 12, opacity: 0.5 }}>© 2025 CampusFile. All reviews are from verified students. Data for informational purposes only.</p>
      </footer>

      <div id="scrollTop" className={showTop ? 'visible' : ''} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</div>
      <Modals />
      <div id="toast" className={toastState.show ? 'show' : ''}><div className="toast-icon">✓</div><span id="toastMsg">{toastState.msg}</span></div>
    </Ctx.Provider>
  );
}
