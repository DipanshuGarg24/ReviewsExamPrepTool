import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import LoginModal from '../auth/LoginModal';
import { getUser, clearSession } from '../auth/session';
import { API, loadDB } from './api';
import { normalizeReview } from './normalizers';
import { hasMarkedHelpful, addHelpfulId } from './helpful';
import '../styles/global.css';

/* ================= CONSTANTS & HELPERS ================= */
const CATS = ['IIT', 'NIT', 'IIIT', 'Central', 'Private'];

const CAT_META = {
  IIT: { icon: '🏛️', desc: 'Premier engineering institutes established by Parliament' },
  NIT: { icon: '🎓', desc: 'National institutes of technology with strong placement records' },
  IIIT: { icon: '💻', desc: 'Information technology & computer science focused institutes' },
  Central: { icon: '📚', desc: 'Central universities with multidisciplinary UG & PG programs' },
  Private: { icon: '🌟', desc: 'Private & deemed universities with modern campuses' },
};

const PER_PAGE_HOME = 6;
const PER_PAGE_CAT = 8;
const PER_PAGE_REV = 4;

const AVATAR_COLORS = ['#3d46f2', '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#0284c7'];

const RV0 = {
  instId: '',
  name: '',
  email: '',
  contact: '',
  branch: '',
  course: 'B.Tech',
  batch: '2026',
  exam: 'JEE Advanced',
  rank: '',
  score: '',
  cgpa: '',
  rating: 5,
  pros: '',
  cons: '',
  body: '',
  busy: false,
};

const isHashed = (s) => typeof s === 'string' && s.startsWith('$2b$');

const maskEmail = (e) => {
  if (!e) return '—';
  if (isHashed(e)) return 'Protected';
  const [u, d] = e.split('@');
  if (!d) return e;
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(2, u.length - 2))}@${d}`;
};

const maskPhone = (p) => {
  if (!p) return '—';
  if (isHashed(p)) return 'Protected';
  const s = String(p).replace(/\D/g, '');
  if (s.length < 4) return '••••';
  return `${s.slice(0, 2)}${'•'.repeat(Math.max(3, s.length - 4))}${s.slice(-2)}`;
};

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const initials = (n) =>
  (n || 'A')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const ratingClass = (r) => {
  const n = Math.round(Number(r) || 4);
  return `r${Math.min(5, Math.max(1, n))}`;
};

function computeStats(inst, allReviews, cutoffsMap, placementsMap) {
  const revs = allReviews.filter((r) => String(r.instId) === String(inst.id) && !r.hidden);
  const count = revs.length;
  const avg = count ? +(revs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count).toFixed(1) : 0;
  const dist = [0, 0, 0, 0, 0];
  revs.forEach((r) => {
    const k = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 1)));
    dist[k - 1]++;
  });
  const cuts = cutoffsMap[inst.id] || [];
  const places = placementsMap[inst.id] || [];
  const branches = [...new Set([...inst.departments, ...revs.map((r) => r.branch).filter(Boolean)])];
  const exams = [...new Set(revs.map((r) => r.exam).filter(Boolean))];
  return { revs, count, avg, dist, cuts, places, branches, exams };
}

/* ================= APP CONTEXT ================= */
const AppCtx = createContext(null);
const useA = () => useContext(AppCtx);

function AppProvider({ children }) {
  const [db, setDb] = useState({ institutions: [], reviews: [], cutoffs: {}, placements: {} });
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('discovery');
  const [currentInstId, setCurrentInstId] = useState(null);
  const [currentCat, setCurrentCat] = useState(null);
  const [activeCat, setActiveCat] = useState('All');
  const [mainQ, setMainQ] = useState('');
  const [catQ, setCatQ] = useState('');
  const [hq, setHq] = useState('');
  const [homeSort, setHomeSort] = useState('rating');
  const [catSort, setCatSort] = useState('rating');
  const [homePage, setHomePage] = useState(1);
  const [catPage, setCatPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [filters, setFilters] = useState({ dept: 'All', exam: 'All', sort: 'newest' });
  const [activeTab, setActiveTab] = useState('reviews');
  const [placeF, setPlaceF] = useState({ year: 'All', branch: 'All', course: 'All' });
  const [cutF, setCutF] = useState({ year: 'All', branch: 'All', category: 'All' });

  const [user, setUser] = useState(() => getUser());
  const [authOpen, setAuthOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rv, setRv] = useState(RV0);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3200);
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(getUser());
    window.addEventListener('storage', syncUser);
    window.addEventListener('focus', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('focus', syncUser);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await loadDB();
      setDb(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const goHome = () => {
    setView('discovery');
    setCurrentInstId(null);
    setCurrentCat(null);
    setHomePage(1);
    scrollTop();
  };

  const openCategory = (cat) => {
    setCurrentCat(cat);
    setCatQ('');
    setCatSort('rating');
    setCatPage(1);
    setView('category');
    scrollTop();
  };

  const openCollege = (id, tab = 'reviews') => {
    setCurrentInstId(id);
    setView('college');
    setActiveTab(tab);
    setFilters({ dept: 'All', exam: 'All', sort: 'newest' });
    setPlaceF({ year: 'All', branch: 'All', course: 'All' });
    setCutF({ year: 'All', branch: 'All', category: 'All' });
    setReviewsPage(1);
    scrollTop();
  };

  const openLoginModal = () => setAuthOpen(true);

  const closeModals = () => {
    setAuthOpen(false);
    setReviewOpen(false);
  };

  const logout = () => {
    clearSession();
    setUser(null);
    toast('Logged out successfully');
  };

  const openReviewModal = () => {
    const activeUser = getUser() || user;
    if (!activeUser || (!activeUser.token && !activeUser._id && !activeUser.email && !activeUser.mobile)) {
      setUser(null);
      setAuthOpen(true);
      toast('Please login first to write a review.');
      return;
    }

    const inst = db.institutions.find((i) => i.id === currentInstId);
    setRv({
      ...rv,
      instId: currentInstId || db.institutions[0]?.id || '',
      name: activeUser.name || '',
      email: activeUser.email || '',
      contact: activeUser.mobile || '',
      rank: '',
      score: '',
      cgpa: '',
      course: 'B.Tech',
      rating: 5,
      branch: inst?.departments?.[0] || '',
      busy: false,
    });
    setReviewOpen(true);
  };

  const submitReview = async () => {
    const instId = rv.instId || currentInstId;
    if (!instId) {
      toast('Select an institution first.');
      return;
    }
    if (!rv.name.trim() || !rv.branch.trim() || !rv.pros.trim() || !rv.cons.trim() || !rv.body.trim()) {
      toast('Please fill all required fields.');
      return;
    }
    setRv((s) => ({ ...s, busy: true }));
    try {
      const created = await API.reviews.create({
        instId,
        author: rv.name.trim(),
        email: rv.email.trim(),
        contact: rv.contact.trim(),
        branch: rv.branch.trim(),
        course: rv.course,
        batch: rv.batch,
        exam: rv.exam,
        rank: rv.rank ? Number(rv.rank) : undefined,
        score: rv.score ? Number(rv.score) : undefined,
        cgpa: rv.cgpa ? Number(rv.cgpa) : undefined,
        rating: Number(rv.rating) || 5,
        pros: rv.pros.trim(),
        cons: rv.cons.trim(),
        body: rv.body.trim(),
      });
      const norm = normalizeReview(created?.data || created || {
        ...rv,
        id: String(Date.now()),
        instId,
        author: rv.name.trim(),
        date: new Date().toISOString(),
        helpful: 0,
      });
      setDb((d) => ({ ...d, reviews: [norm, ...d.reviews] }));
      setRv({ ...RV0, instId });
      setReviewOpen(false);
      setActiveTab('reviews');
      setReviewsPage(1);
      toast('Review submitted!');
    } catch (e) {
      toast(e.message || 'Could not submit review.');
    } finally {
      setRv((s) => ({ ...s, busy: false }));
    }
  };

  const markHelpful = async (id) => {
    if (hasMarkedHelpful(id)) {
      toast('You already marked this review helpful.');
      return true;
    }
    try {
      await API.reviews.helpful(id);
      addHelpfulId(id);
      setDb((d) => ({
        ...d,
        reviews: d.reviews.map((r) => (r.id === id ? { ...r, helpful: (r.helpful || 0) + 1 } : r)),
      }));
      toast('Thanks for your feedback!');
      return true;
    } catch {
      toast('Could not record that — try again.');
      return false;
    }
  };

  const reportReview = async (id) => {
    const reason = window.prompt('Reason for reporting this review (spam, abusive, fake, etc.):');
    if (!reason || !reason.trim()) return;
    try {
      await API.reviews.report(id, reason.trim());
      toast('Review reported for moderation.');
    } catch {
      toast('Could not report review.');
    }
  };

  const value = {
    db,
    ready,
    view,
    currentInstId,
    currentCat,
    activeCat,
    setActiveCat,
    mainQ,
    setMainQ,
    catQ,
    setCatQ,
    hq,
    setHq,
    homeSort,
    setHomeSort,
    catSort,
    setCatSort,
    homePage,
    setHomePage,
    catPage,
    setCatPage,
    reviewsPage,
    setReviewsPage,
    filters,
    setFilters,
    activeTab,
    setActiveTab,
    placeF,
    setPlaceF,
    cutF,
    setCutF,
    user,
    authOpen,
    setAuthOpen,
    reviewOpen,
    setReviewOpen,
    rv,
    setRv,
    toastMsg,
    toast,
    refresh,
    goHome,
    openCategory,
    openCollege,
    openLoginModal,
    closeModals,
    logout,
    openReviewModal,
    submitReview,
    markHelpful,
    reportReview,
  };

  return (
    <AppCtx.Provider value={value}>
      {children}
      <LoginModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(loggedInUser) => setUser(loggedInUser || getUser())}
        notify={toast}
      />
    </AppCtx.Provider>
  );
}

/* ================= SHARED UI COMPONENTS ================= */
function Stars({ n }) {
  const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
  return <span className="stars">{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>;
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Prev
      </button>
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)}>
          {p}
        </button>
      ))}
      <button className="page-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </div>
  );
}

function Header() {
  const { view, hq, setHq, goHome, openCollege, openLoginModal, logout, user, db } = useA();
  const [dropOpen, setDropOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const q = hq.trim().toLowerCase();
  const matches = q
    ? db.institutions
        .filter((i) => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
        .slice(0, 6)
    : [];

  return (
    <header className="hdr">
      <div className="hdr-in">
        <a className="logo" onClick={goHome}>
          <div className="logo-badge">CF</div>
          <div className="logo-text">
            <b>CampusFile</b>
            <span>VERIFIED STUDENT REVIEWS</span>
          </div>
        </a>

        {view !== 'discovery' && (
          <div className="hdr-search" ref={boxRef}>
            <span className="s-ico">🔍</span>
            <input
              type="text"
              placeholder="Search colleges, branches, exams..."
              value={hq}
              onFocus={() => setDropOpen(true)}
              onChange={(e) => {
                setHq(e.target.value);
                setDropOpen(true);
              }}
            />
            {dropOpen && q && (
              <div className="hdr-drop open">
                {matches.length ? (
                  matches.map((m) => (
                    <div
                      key={m.id}
                      className="hdr-drop-item"
                      onClick={() => {
                        setDropOpen(false);
                        setHq('');
                        openCollege(m.id);
                      }}
                    >
                      <img src={m.img} alt={m.name} />
                      <div>
                        <b>{m.name}</b>
                        <span>{m.location}</span>
                      </div>
                      <span className={`tag ${m.type}`} style={{ marginLeft: 'auto' }}>
                        {m.type}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="hdr-drop-empty">No matching colleges</div>
                )}
              </div>
            )}
          </div>
        )}

        <nav className="nav">
          <a className={view === 'discovery' ? 'active' : ''} onClick={goHome}>
            Home
          </a>
          <a
            onClick={() => {
              if (db.institutions[0]) openCollege(db.institutions[0].id, 'reviews');
            }}
          >
            Reviews
          </a>
        </nav>

        <div className="auth-area">
          {user ? (
            <>
              <span className="auth-user">Hi, {user.name || user.email || 'Student'}</span>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={openLoginModal}>
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { goHome, openCategory, db, openCollege } = useA();
  return (
    <footer className="ftr">
      <div className="ftr-in">
        <div>
          <a className="logo" style={{ marginBottom: 14 }} onClick={goHome}>
            <div className="logo-badge">CF</div>
            <div className="logo-text">
              <b>CampusFile</b>
              <span>VERIFIED STUDENT REVIEWS</span>
            </div>
          </a>
          <p>Honest student reviews, placement statistics, and admission cutoffs across Indian higher education.</p>
        </div>
        <div>
          <h4>Categories</h4>
          {CATS.map((c) => (
            <a key={c} onClick={() => openCategory(c)}>
              {c}
            </a>
          ))}
        </div>
        <div>
          <h4>Top Colleges</h4>
          {db.institutions.slice(0, 5).map((i) => (
            <a key={i.id} onClick={() => openCollege(i.id)}>
              {i.name}
            </a>
          ))}
        </div>
        <div>
          <h4>Explore</h4>
          <a onClick={goHome}>All Institutions</a>
          <a onClick={() => openCategory('IIT')}>IITs</a>
          <a onClick={() => openCategory('NIT')}>NITs</a>
        </div>
      </div>
      <div className="ftr-bot">
        <span>© 2026 CampusFile. All rights reserved.</span>
        <span>Student-first review platform</span>
      </div>
    </footer>
  );
}

/* ================= DISCOVERY VIEW ================= */
function CollegeCard({ inst }) {
  const { db, openCollege } = useA();
  const st = computeStats(inst, db.reviews, db.cutoffs, db.placements);

  return (
    <div className="c-card" onClick={() => openCollege(inst.id)}>
      <div className="c-thumb">
        <img src={inst.img} alt={inst.name} loading="lazy" />
        <span className={`tag ${inst.type}`}>{inst.type}</span>
        {st.count > 0 && (
          <span className={`rating-badge ${ratingClass(st.avg)}`}>
            {st.avg} ★ ({st.count})
          </span>
        )}
      </div>
      <div className="c-body">
        <div className="c-name">{inst.name}</div>
        <div className="c-loc">📍 {inst.location}</div>
        <div className="c-meta">
          <div>
            <span>NIRF</span>
            <b>{inst.nirf}</b>
          </div>
          <div>
            <span>Avg CTC</span>
            <b>{inst.avgCTC}</b>
          </div>
          <div>
            <span>Fees / Sem</span>
            <b>{inst.fees}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscoveryView() {
  const {
    db,
    activeCat,
    setActiveCat,
    mainQ,
    setMainQ,
    homeSort,
    setHomeSort,
    homePage,
    setHomePage,
    openCategory,
  } = useA();
  const [searchSubmitQ, setSearchSubmitQ] = useState('');
  const listRef = useRef(null);

  const q = (searchSubmitQ || mainQ).trim().toLowerCase();

  const filtered = db.institutions
    .filter((i) => {
      const catOk = activeCat === 'All' || i.type === activeCat;
      const qOk =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.departments.some((d) => d.toLowerCase().includes(q));
      return catOk && qOk;
    })
    .sort((a, b) => {
      const sa = computeStats(a, db.reviews, db.cutoffs, db.placements);
      const sb = computeStats(b, db.reviews, db.cutoffs, db.placements);
      if (homeSort === 'reviews') return sb.count - sa.count;
      if (homeSort === 'nirf') return (a.nirfNum || 999) - (b.nirfNum || 999);
      return sb.avg - sa.avg;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE_HOME));
  const safePage = Math.min(homePage, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE_HOME, safePage * PER_PAGE_HOME);

  const totalReviews = db.reviews.filter((r) => !r.hidden).length;

  return (
    <>
      <section className="hero">
        <div className="hero-in">
          <h1>
            The honest report card on <span>India&apos;s best</span> institutes
          </h1>
          <p>Real student reviews on academics, placements, campus life, hostel conditions, and hidden costs.</p>

          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchSubmitQ(mainQ);
              setHomePage(1);
              listRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <input
              type="text"
              placeholder="Search IITs, NITs, IIITs, branches, or cities..."
              value={mainQ}
              onChange={(e) => {
                setMainQ(e.target.value);
                setSearchSubmitQ(e.target.value);
                setHomePage(1);
              }}
            />
            <button type="submit">Search</button>
          </form>

          <div className="hero-stats">
            <div>
              <b>{db.institutions.length}</b>
              <span>Institutes</span>
            </div>
            <div>
              <b>{totalReviews}</b>
              <span>Student Reviews</span>
            </div>
            <div>
              <b>{CATS.length}</b>
              <span>Categories</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingBottom: 16 }}>
        <div className="sec-head">
          <div>
            <h2>Browse by Category</h2>
            <p>Explore institutes grouped by type</p>
          </div>
        </div>
        <div className="cat-grid">
          {CATS.map((c) => {
            const count = db.institutions.filter((i) => i.type === c).length;
            const meta = CAT_META[c] || { icon: '🏫', desc: 'Institutions' };
            return (
              <div key={c} className="cat-card" onClick={() => openCategory(c)}>
                <div className="cat-ico">{meta.icon}</div>
                <div>
                  <b>{c}</b>
                  <span>{count} colleges</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="sec" ref={listRef}>
        <div className="sec-head">
          <div>
            <h2>Featured Institutions</h2>
            <p>{filtered.length} institutes matching your selection</p>
          </div>
          <select className="sort-sel" value={homeSort} onChange={(e) => setHomeSort(e.target.value)}>
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviewed</option>
            <option value="nirf">NIRF Rank</option>
          </select>
        </div>

        <div className="chips">
          {['All', ...CATS].map((c) => (
            <button
              key={c}
              className={`chip ${activeCat === c ? 'active' : ''}`}
              onClick={() => {
                setActiveCat(c);
                setHomePage(1);
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {pageItems.length ? (
          <div className="grid">
            {pageItems.map((inst) => (
              <CollegeCard key={inst.id} inst={inst} />
            ))}
          </div>
        ) : (
          <div className="empty">No institutes found for your filter.</div>
        )}

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPage={(p) => {
            setHomePage(p);
            listRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </section>
    </>
  );
}

/* ================= CATEGORY VIEW ================= */
function CategoryView() {
  const { db, currentCat, catQ, setCatQ, catSort, setCatSort, catPage, setCatPage, goHome } = useA();
  const meta = CAT_META[currentCat] || { icon: '🏫', desc: '' };

  const list = db.institutions
    .filter((i) => i.type === currentCat)
    .filter((i) => {
      const q = catQ.trim().toLowerCase();
      return !q || i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const sa = computeStats(a, db.reviews, db.cutoffs, db.placements);
      const sb = computeStats(b, db.reviews, db.cutoffs, db.placements);
      if (catSort === 'reviews') return sb.count - sa.count;
      if (catSort === 'nirf') return (a.nirfNum || 999) - (b.nirfNum || 999);
      return sb.avg - sa.avg;
    });

  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE_CAT));
  const safePage = Math.min(catPage, totalPages);
  const pageItems = list.slice((safePage - 1) * PER_PAGE_CAT, safePage * PER_PAGE_CAT);

  return (
    <section className="sec">
      <div className="bc">
        <a onClick={goHome}>Home</a>
        <span>/</span>
        <span>{currentCat}</span>
      </div>

      <div className="cat-banner">
        <div className="cat-banner-ico">{meta.icon}</div>
        <div>
          <h1>{currentCat} Institutes</h1>
          <p>{meta.desc}</p>
        </div>
      </div>

      <div className="sec-head">
        <div>
          <h2>{list.length} Institutes</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={`Filter ${currentCat}s...`}
            value={catQ}
            onChange={(e) => {
              setCatQ(e.target.value);
              setCatPage(1);
            }}
            style={{ width: 220 }}
          />
          <select className="sort-sel" value={catSort} onChange={(e) => setCatSort(e.target.value)}>
            <option value="rating">Highest Rated</option>
            <option value="reviews">Most Reviewed</option>
            <option value="nirf">NIRF Rank</option>
          </select>
        </div>
      </div>

      {pageItems.length ? (
        <div className="grid">
          {pageItems.map((inst) => (
            <CollegeCard key={inst.id} inst={inst} />
          ))}
        </div>
      ) : (
        <div className="empty">No institutes in this category yet.</div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPage={setCatPage} />
    </section>
  );
}

/* ================= COLLEGE DETAIL VIEW ================= */
function HelpfulBtn({ r }) {
  const { markHelpful } = useA();
  const [done, setDone] = useState(() => hasMarkedHelpful(r.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDone(hasMarkedHelpful(r.id));
  }, [r.id]);

  return (
    <button
      className="helpful-btn"
      disabled={busy || done}
      style={done ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
      onClick={async () => {
        if (done || busy) return;
        setBusy(true);
        if (await markHelpful(r.id)) {
          addHelpfulId(r.id);
          setDone(true);
        }
        setBusy(false);
      }}
    >
      {done ? '✓ ' : '👍 '}Helpful ({r.helpful || 0})
    </button>
  );
}

function ReviewCard({ r }) {
  const { reportReview } = useA();
  const color = AVATAR_COLORS[(r.colorIdx || 0) % AVATAR_COLORS.length];

  return (
    <div className="rv">
      <div className="rv-top">
        <div className="rv-author">
          <div className="av" style={{ background: color }}>
            {initials(r.author)}
          </div>
          <div>
            <b>{r.author}</b>
            <div className="rv-meta">
              {r.branch || 'General'} · {r.course || 'B.Tech'} · Batch {r.batch || '—'} · {fmtDate(r.date)}
            </div>
          </div>
        </div>
        <div className={`rating-badge ${ratingClass(r.rating)}`}>
          {Number(r.rating).toFixed(1)} ★
        </div>
      </div>

      <div className="rv-tags">
        {r.exam && <span className="rv-tag">Exam: {r.exam}</span>}
        {r.rank && <span className="rv-tag">Rank: {r.rank}</span>}
        {r.score && <span className="rv-tag">Score: {r.score}</span>}
        {r.cgpa && <span className="rv-tag">CGPA: {r.cgpa}</span>}
      </div>

      <div className="rv-grid">
        <div className="rv-pros">
          <b>PROS</b>
          <p>{r.pros}</p>
        </div>
        <div className="rv-cons">
          <b>CONS</b>
          <p>{r.cons}</p>
        </div>
      </div>

      <p className="rv-body">{r.body}</p>

      <div className="rv-foot">
        <HelpfulBtn r={r} />
        <button className="helpful-btn" onClick={() => reportReview(r.id)}>
          🚩 Report
        </button>
      </div>
    </div>
  );
}

function ReviewsTab({ inst, st }) {
  const { filters, setFilters, reviewsPage, setReviewsPage, openReviewModal } = useA();

  const revs = st.revs
    .filter((r) => (filters.dept === 'All' || r.branch === filters.dept) && (filters.exam === 'All' || r.exam === filters.exam))
    .sort((a, b) => {
      if (filters.sort === 'helpful') return (b.helpful || 0) - (a.helpful || 0);
      if (filters.sort === 'high') return (b.rating || 0) - (a.rating || 0);
      if (filters.sort === 'low') return (a.rating || 0) - (b.rating || 0);
      return new Date(b.date) - new Date(a.date);
    });

  const totalPages = Math.max(1, Math.ceil(revs.length / PER_PAGE_REV));
  const safePage = Math.min(reviewsPage, totalPages);
  const pageRevs = revs.slice((safePage - 1) * PER_PAGE_REV, safePage * PER_PAGE_REV);

  return (
    <>
      <div className="score-box">
        <div>
          <div className="score-num">{st.avg ? st.avg.toFixed(1) : '—'}</div>
          <Stars n={st.avg} />
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 6 }}>
            Based on {st.count} verified review{st.count === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bars">
          {[5, 4, 3, 2, 1].map((star) => {
            const cnt = st.dist[star - 1] || 0;
            const pct = st.count ? Math.round((cnt / st.count) * 100) : 0;
            return (
              <div key={star} className="bar-row">
                <span>{star} ★</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span style={{ textAlign: 'right' }}>{cnt}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary" onClick={openReviewModal}>
            ✍️ Write a Review
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Share honest feedback on {inst.name}</span>
        </div>
      </div>

      <div className="f-bar">
        <select
          value={filters.dept}
          onChange={(e) => {
            setFilters({ ...filters, dept: e.target.value });
            setReviewsPage(1);
          }}
        >
          <option value="All">All Branches</option>
          {st.branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filters.exam}
          onChange={(e) => {
            setFilters({ ...filters, exam: e.target.value });
            setReviewsPage(1);
          }}
        >
          <option value="All">All Exams</option>
          {st.exams.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>

        <select
          value={filters.sort}
          onChange={(e) => {
            setFilters({ ...filters, sort: e.target.value });
            setReviewsPage(1);
          }}
        >
          <option value="newest">Newest First</option>
          <option value="helpful">Most Helpful</option>
          <option value="high">Highest Rated</option>
          <option value="low">Lowest Rated</option>
        </select>
      </div>

      {pageRevs.length ? (
        pageRevs.map((r) => <ReviewCard key={r.id} r={r} />)
      ) : (
        <div className="empty">No reviews match your filters yet.</div>
      )}

      <Pagination page={safePage} totalPages={totalPages} onPage={setReviewsPage} />
    </>
  );
}

function PlacementsTab({ st }) {
  const { placeF, setPlaceF } = useA();
  const years = [...new Set(st.places.map((p) => p.year).filter(Boolean))];
  const branches = [...new Set(st.places.map((p) => p.branch).filter(Boolean))];
  const courses = [...new Set(st.places.map((p) => p.course).filter(Boolean))];

  const rows = st.places.filter(
    (p) =>
      (placeF.year === 'All' || String(p.year) === String(placeF.year)) &&
      (placeF.branch === 'All' || p.branch === placeF.branch) &&
      (placeF.course === 'All' || p.course === placeF.course)
  );

  return (
    <>
      <div className="f-bar">
        <select value={placeF.year} onChange={(e) => setPlaceF({ ...placeF, year: e.target.value })}>
          <option value="All">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={placeF.branch} onChange={(e) => setPlaceF({ ...placeF, branch: e.target.value })}>
          <option value="All">All Branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={placeF.course} onChange={(e) => setPlaceF({ ...placeF, course: e.target.value })}>
          <option value="All">All Courses</option>
          {courses.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div className="table-scroll">
          <table className="dt">
            <thead>
              <tr>
                <th>Year</th>
                <th>Branch</th>
                <th>Course</th>
                <th>Placed / Eligible</th>
                <th>Highest CTC</th>
                <th>Avg CTC</th>
                <th>Median CTC</th>
                <th>PPOs / Intl</th>
                <th>Top Recruiters</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, idx) => (
                <tr key={p._id || p.id || idx}>
                  <td>{p.year}</td>
                  <td>
                    <b>{p.branch}</b>
                  </td>
                  <td>{p.course || '—'}</td>
                  <td>
                    {p.placed ?? '—'} / {p.eligible ?? '—'}
                  </td>
                  <td>{p.highCTC || '—'}</td>
                  <td>{p.avgCTC || '—'}</td>
                  <td>{p.medCTC || '—'}</td>
                  <td>
                    {p.ppoOffers ?? 0} / {p.intlOffers ?? 0}
                  </td>
                  <td>{Array.isArray(p.topRecruiters) ? p.topRecruiters.join(', ') : p.topRecruiters || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">No placement records available.</div>
      )}
    </>
  );
}

function CutoffsTab({ st }) {
  const { cutF, setCutF } = useA();
  const years = [...new Set(st.cuts.map((c) => c.year).filter(Boolean))];
  const branches = [...new Set(st.cuts.map((c) => c.branch).filter(Boolean))];
  const categories = [...new Set(st.cuts.map((c) => c.category).filter(Boolean))];

  const rows = st.cuts.filter(
    (c) =>
      (cutF.year === 'All' || String(c.year) === String(cutF.year)) &&
      (cutF.branch === 'All' || c.branch === cutF.branch) &&
      (cutF.category === 'All' || c.category === cutF.category)
  );

  return (
    <>
      <div className="f-bar">
        <select value={cutF.year} onChange={(e) => setCutF({ ...cutF, year: e.target.value })}>
          <option value="All">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select value={cutF.branch} onChange={(e) => setCutF({ ...cutF, branch: e.target.value })}>
          <option value="All">All Branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={cutF.category} onChange={(e) => setCutF({ ...cutF, category: e.target.value })}>
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div className="table-scroll">
          <table className="dt">
            <thead>
              <tr>
                <th>Year</th>
                <th>Branch</th>
                <th>Category</th>
                <th>Exam</th>
                <th>Opening Rank</th>
                <th>Closing Rank</th>
                <th>Prev Close</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, idx) => (
                <tr key={c._id || c.id || idx}>
                  <td>{c.year}</td>
                  <td>
                    <b>{c.branch}</b>
                  </td>
                  <td>{c.category}</td>
                  <td>{c.exam || '—'}</td>
                  <td>{c.openRank ?? '—'}</td>
                  <td>
                    <b>{c.closeRank ?? '—'}</b>
                  </td>
                  <td>{c.prevClose ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">No cutoff records available.</div>
      )}
    </>
  );
}

function OverviewTab({ inst, st }) {
  return (
    <>
      <div className="info-card">
        <h3>About {inst.name}</h3>
        <p style={{ color: 'var(--ink-2)', lineHeight: 1.7, margin: 0 }}>{inst.about || 'Details coming soon.'}</p>
      </div>

      <div className="info-card">
        <h3>Departments & Programs</h3>
        <div className="tag-list">
          {inst.departments.length ? (
            inst.departments.map((d) => (
              <span key={d} className="pill">
                {d}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--ink-3)' }}>No departments listed</span>
          )}
        </div>
      </div>

      <div className="info-card">
        <h3>Campus Facilities</h3>
        <div className="tag-list">
          {inst.facilities.length ? (
            inst.facilities.map((f) => (
              <span key={f} className="pill">
                {f}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--ink-3)' }}>No facilities listed</span>
          )}
        </div>
      </div>

      <div className="info-card">
        <h3>Key Snapshot</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Established</span>
            <div>
              <b>{inst.est}</b>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Campus Size</span>
            <div>
              <b>{inst.size}</b>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Hostels</span>
            <div>
              <b>{inst.hostels}</b>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Students</span>
            <div>
              <b>{inst.students}</b>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Total Reviews</span>
            <div>
              <b>{st.count}</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CollegeView() {
  const { db, currentInstId, activeTab, setActiveTab, goHome, openCategory, openReviewModal } = useA();
  const inst = db.institutions.find((i) => i.id === currentInstId) || db.institutions[0];
  if (!inst) return <div className="empty">Institution not found.</div>;

  const st = computeStats(inst, db.reviews, db.cutoffs, db.placements);

  return (
    <section className="sec">
      <div className="bc">
        <a onClick={goHome}>Home</a>
        <span>/</span>
        <a onClick={() => openCategory(inst.type)}>{inst.type}</a>
        <span>/</span>
        <span>{inst.name}</span>
      </div>

      <div className="ch-hero">
        <img src={inst.img} alt={inst.name} />
        <div className="ch-info">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span className={`tag ${inst.type}`}>{inst.type}</span>
            {st.count > 0 && (
              <span className={`rating-badge ${ratingClass(st.avg)}`}>
                {st.avg} ★ ({st.count} reviews)
              </span>
            )}
          </div>
          <h1>{inst.name}</h1>
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
            📍 {inst.location} · NIRF {inst.nirf} · Est. {inst.est}
          </div>

          <div className="ch-kpis">
            <div className="kpi">
              <span>Highest CTC</span>
              <b>{inst.highestCTC}</b>
            </div>
            <div className="kpi">
              <span>Avg CTC</span>
              <b>{inst.avgCTC}</b>
            </div>
            <div className="kpi">
              <span>Fees / Sem</span>
              <b>{inst.fees}</b>
            </div>
            <div className="kpi">
              <span>Students</span>
              <b>{inst.students}</b>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={openReviewModal}>
              ✍️ Write a Review
            </button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {[
          ['reviews', `Student Reviews (${st.count})`],
          ['placements', `Placements (${st.places.length})`],
          ['cutoffs', `Cutoffs (${st.cuts.length})`],
          ['overview', 'Overview & Campus'],
        ].map(([k, label]) => (
          <button key={k} className={`tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'reviews' && <ReviewsTab inst={inst} st={st} />}
      {activeTab === 'placements' && <PlacementsTab st={st} />}
      {activeTab === 'cutoffs' && <CutoffsTab st={st} />}
      {activeTab === 'overview' && <OverviewTab inst={inst} st={st} />}
    </section>
  );
}

/* ================= REVIEW MODAL ================= */
function ReviewModal() {
  const { db, reviewOpen, closeModals, rv, setRv, submitReview, currentInstId } = useA();
  if (!reviewOpen) return null;

  const selectedInst = db.institutions.find((i) => i.id === (rv.instId || currentInstId));
  const branches = selectedInst?.departments || [];

  return (
    <div className="scrim open" onClick={(e) => e.target === e.currentTarget && closeModals()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Write a Review — {selectedInst?.name || 'Institute'}</h2>
          <button
            type="button"
            onClick={closeModals}
            aria-label="Close"
            style={{ position: 'absolute', top: 16, right: 18, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="row2">
            <div className="field">
              <label>Your Name *</label>
              <input value={rv.name} onChange={(e) => setRv({ ...rv, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={rv.email} onChange={(e) => setRv({ ...rv, email: e.target.value })} placeholder="you@example.com" />
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label>Mobile / Contact</label>
              <input value={rv.contact} onChange={(e) => setRv({ ...rv, contact: e.target.value })} placeholder="10-digit mobile" />
            </div>
            <div className="field">
              <label>Branch / Department *</label>
              <input
                list="branch-options"
                value={rv.branch}
                onChange={(e) => setRv({ ...rv, branch: e.target.value })}
                placeholder="e.g. Computer Science"
              />
              <datalist id="branch-options">
                {branches.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="row3">
            <div className="field">
              <label>Course</label>
              <select value={rv.course} onChange={(e) => setRv({ ...rv, course: e.target.value })}>
                <option value="B.Tech">B.Tech</option>
                <option value="M.Tech">M.Tech</option>
                <option value="B.Sc">B.Sc</option>
                <option value="MBA">MBA</option>
              </select>
            </div>
            <div className="field">
              <label>Batch Year</label>
              <input value={rv.batch} onChange={(e) => setRv({ ...rv, batch: e.target.value })} placeholder="2026" />
            </div>
            <div className="field">
              <label>Rating (1–5) *</label>
              <select value={rv.rating} onChange={(e) => setRv({ ...rv, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row3">
            <div className="field">
              <label>Entrance Exam</label>
              <input value={rv.exam} onChange={(e) => setRv({ ...rv, exam: e.target.value })} placeholder="JEE / GATE" />
            </div>
            <div className="field">
              <label>Rank</label>
              <input type="number" value={rv.rank} onChange={(e) => setRv({ ...rv, rank: e.target.value })} placeholder="Optional" />
            </div>
            <div className="field">
              <label>CGPA</label>
              <input type="number" step="0.01" value={rv.cgpa} onChange={(e) => setRv({ ...rv, cgpa: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="field">
            <label>Pros *</label>
            <input value={rv.pros} onChange={(e) => setRv({ ...rv, pros: e.target.value })} placeholder="What is best about this institute?" />
          </div>

          <div className="field">
            <label>Cons *</label>
            <input value={rv.cons} onChange={(e) => setRv({ ...rv, cons: e.target.value })} placeholder="What needs improvement?" />
          </div>

          <div className="field">
            <label>Detailed Review *</label>
            <textarea
              value={rv.body}
              onChange={(e) => setRv({ ...rv, body: e.target.value })}
              placeholder="Share your honest experience about academics, faculty, hostel, and placements..."
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={rv.busy} onClick={submitReview}>
            {rv.busy ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= SHELL & ROOT ================= */
function Shell() {
  const { ready, view, toastMsg } = useA();

  return (
    <>
      <Header />
      <main>
        {!ready ? (
          <div className="loading-screen">
            <div className="spinner" />
            <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>Loading institutes...</div>
          </div>
        ) : (
          <>
            {view === 'discovery' && <DiscoveryView />}
            {view === 'category' && <CategoryView />}
            {view === 'college' && <CollegeView />}
          </>
        )}
      </main>
      <Footer />
      <ReviewModal />
      <div id="toast" className={toastMsg ? 'show' : ''}>
        <div className="toast-icon">✓</div>
        <span>{toastMsg}</span>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}