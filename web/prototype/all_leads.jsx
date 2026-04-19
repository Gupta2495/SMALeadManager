// All Leads — search, filters, table/list
const { useState: useAllState, useMemo: useAllMemo } = React;

function fuzzyMatch(q, fields) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some(f => (f || '').toString().toLowerCase().includes(needle));
}

function AllLeads({ leads, navigate, onNewLead }) {
  const [q, setQ] = useAllState('');
  const [status, setStatus] = useAllState('all');
  const [cls, setCls] = useAllState('all');
  const [sort, setSort] = useAllState('newest');

  const filtered = useAllMemo(() => {
    let out = leads.filter(l =>
      (status === 'all' || l.status === status) &&
      (cls === 'all' || l.class === cls) &&
      fuzzyMatch(q, [l.student, l.parent, l.phone, l.location, l.id])
    );
    if (sort === 'newest') out.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt));
    if (sort === 'oldest') out.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));
    if (sort === 'next')   out.sort((a, b) => new Date(a.nextFollowUp || '9999') - new Date(b.nextFollowUp || '9999'));
    if (sort === 'alpha')  out.sort((a, b) => a.student.localeCompare(b.student));
    return out;
  }, [leads, q, status, cls, sort]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">All Leads</div>
          <div className="page-sub">{leads.length} total leads · search and filter</div>
        </div>
        <button className="btn btn-primary" onClick={onNewLead}><Icon.plus /> New lead</button>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Icon.search size={16} />
          <input className="input" placeholder="Search name, phone, location…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="select" value={cls} onChange={e => setCls(e.target.value)}>
          <option value="all">All classes</option>
          {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select className="select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="next">Next follow-up</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      <div className="result-count">Showing <strong>{filtered.length}</strong> of {leads.length} leads</div>

      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Parent</th>
              <th>Class</th>
              <th>Status</th>
              <th>Last contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const last = l.history[0]?.at || l.capturedAt;
              return (
                <tr key={l.id} onClick={() => navigate('lead', { id: l.id })}>
                  <td>
                    <div className="student">{l.student}</div>
                    <div className="muted">{l.phone}</div>
                  </td>
                  <td>{l.parent}<div className="muted">{l.location}</div></td>
                  <td>{l.class}</td>
                  <td><StatusChip status={l.status} /></td>
                  <td>{fmtDate(last, { relative: true, noYear: true })}<div className="muted">{l.history.length ? outcomeLabel(l.history[0].outcome) : 'Not contacted'}</div></td>
                  <td style={{ textAlign: 'right', color: 'var(--n400)' }}><Icon.chevronRight size={16} /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--n500)' }}>No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { AllLeads });
