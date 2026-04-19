// Today dashboard — Overdue / Due today / New
const { useMemo: useDashMemo } = React;

function LeadCard({ lead, onOpen }) {
  const state = followUpState(lead.nextFollowUp);
  return (
    <button className="card lead-card" onClick={() => onOpen(lead.id)}>
      <div className="lead-card-main">
        <div className="lead-name">{lead.student}</div>
        <div className="lead-meta">
          <span>{lead.parent}</span>
          <span className="sep">·</span>
          <span>{lead.phone}</span>
        </div>
        <div className="lead-sub">
          <span>Class {lead.class}</span>
          <span className="sep">·</span>
          <span>{lead.interest}</span>
          <span className="sep">·</span>
          <span>{lead.location}</span>
        </div>
        <div className="lead-chips">
          <StatusChip status={lead.status} />
          {state?.kind === 'overdue' && <span className="chip chip-overdue">🔥 {state.label}</span>}
          {state?.kind === 'due' && <span className="chip chip-due">⏰ {state.label}</span>}
          {lead.history.length === 0 && state?.kind !== 'overdue' && <span className="chip chip-new-today">✨ Never contacted</span>}
        </div>
      </div>
      <div className="lead-caret"><Icon.chevronRight size={20} /></div>
    </button>
  );
}

function Dashboard({ leads, navigate, user }) {
  const { overdue, dueToday, newLeads } = useDashMemo(() => {
    const overdue = [], dueToday = [], newLeads = [];
    for (const l of leads) {
      if (['admitted', 'lost', 'rejected', 'on_hold'].includes(l.status)) continue;
      const s = followUpState(l.nextFollowUp);
      if (s?.kind === 'overdue') overdue.push(l);
      else if (s?.kind === 'due') dueToday.push(l);
      else if (l.status === 'new') newLeads.push(l);
    }
    // sort overdue by most overdue first
    overdue.sort((a, b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));
    return { overdue, dueToday, newLeads };
  }, [leads]);

  const totalToCall = overdue.length + dueToday.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Good morning, {user?.name || 'Priya'} 👋</div>
          <div className="summary-strip">
            <span><strong>{totalToCall}</strong> calls to make today</span>
            {overdue.length > 0 && <span className="pill red">🔥 {overdue.length} overdue</span>}
            {newLeads.length > 0 && <span className="pill blue">✨ {newLeads.length} new</span>}
          </div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title overdue">
              <span className="dot"></span>
              Overdue
              <span className="count">{overdue.length}</span>
            </div>
          </div>
          <div className="section-list">
            {overdue.map(l => <LeadCard key={l.id} lead={l} onOpen={(id) => navigate('lead', { id })} />)}
          </div>
        </div>
      )}

      {dueToday.length > 0 && (
        <div className="section">
          <div className="section-header">
            <div className="section-title due">
              <span className="dot"></span>
              Due today
              <span className="count">{dueToday.length}</span>
            </div>
          </div>
          <div className="section-list">
            {dueToday.map(l => <LeadCard key={l.id} lead={l} onOpen={(id) => navigate('lead', { id })} />)}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <div className="section-title new">
            <span className="dot"></span>
            New leads
            <span className="count">{newLeads.length}</span>
          </div>
        </div>
        {newLeads.length > 0 ? (
          <div className="section-list">
            {newLeads.map(l => <LeadCard key={l.id} lead={l} onOpen={(id) => navigate('lead', { id })} />)}
          </div>
        ) : (
          <div className="empty">No new leads today 🌴</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, LeadCard });
