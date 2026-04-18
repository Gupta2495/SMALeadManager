// Navigation (top nav + mobile bottom tabs) + Login screen
const { useState: useStateNav } = React;

function TopNav({ route, navigate, overdueCount, user }) {
  const tabs = [
    { id: 'today', label: 'Today', count: overdueCount },
    { id: 'leads', label: 'All Leads' },
    { id: 'analytics', label: 'Analytics' },
  ];
  if (user?.isAdmin) tabs.push({ id: 'review', label: 'Review', count: 3 });
  return (
    <nav className="topnav">
      <div className="brand" onClick={() => navigate('today')} style={{ cursor: 'pointer' }}>
        <div className="brand-mark">M</div>
        <div>
          <div>Madhav Leads</div>
          <div className="brand-sub">Shree Madhav Academy</div>
        </div>
      </div>
      <div className="nav-links">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-link ${route.name === t.id ? 'active' : ''}`}
            onClick={() => navigate(t.id)}
          >
            {t.label}
            {t.count ? <span className="count-pill">{t.count}</span> : null}
          </button>
        ))}
      </div>
      <div className="nav-spacer" />
      <button className="user-menu" title={user?.email}>
        <div className="user-avatar">{user?.initials || 'P'}</div>
        <span>{user?.name || 'Priya'}</span>
      </button>
    </nav>
  );
}

function BottomTabs({ route, navigate }) {
  const tabs = [
    { id: 'today',     label: 'Today',     icon: Icon.home },
    { id: 'leads',     label: 'All Leads', icon: Icon.list },
    { id: 'analytics', label: 'Analytics', icon: Icon.chart },
    { id: 'profile',   label: 'Profile',   icon: Icon.user },
  ];
  return (
    <nav className="bottom-tabs">
      {tabs.map(t => {
        const I = t.icon;
        const active = route.name === t.id;
        return (
          <button key={t.id} className={`bottom-tab ${active ? 'active' : ''}`} onClick={() => navigate(t.id)}>
            <I />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useStateNav('priya@shreemadhav.in');
  const [pwd, setPwd] = useStateNav('••••••••');
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">M</div>
        <h1>Madhav Leads</h1>
        <p>Shree Madhav Academy · Admissions</p>
        <div style={{ textAlign: 'left' }}>
          <div className="form-row">
            <label className="label">Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="label">Password</label>
            <input className="input" type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary btn-block btn-lg" onClick={onLogin}>Sign in</button>
        <div className="foot">Invite-only · Netlify Identity</div>
      </div>
    </div>
  );
}

Object.assign(window, { TopNav, BottomTabs, LoginScreen });
