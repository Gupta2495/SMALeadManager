// Analytics — tiles + bar chart + insights
const { useMemo: useAnMemo } = React;

function MiniBarChart({ data }) {
  const width = 720, height = 220, pad = { t: 20, r: 16, b: 36, l: 32 };
  const max = Math.max(...data.map(d => d.captured)) * 1.15;
  const bw = (width - pad.l - pad.r) / data.length;
  const y = (v) => pad.t + (height - pad.t - pad.b) * (1 - v / max);
  const yTicks = [0, Math.round(max / 2), Math.round(max)];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeDasharray={i === 0 ? '' : '3 3'} />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#9CA3AF">{v}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = pad.l + i * bw + bw / 2;
        const barW = Math.min(22, bw * 0.55);
        const capturedH = (height - pad.t - pad.b) * (d.captured / max);
        const admittedH = (height - pad.t - pad.b) * (d.admitted / max);
        return (
          <g key={i}>
            <rect x={cx - barW / 2 - 2} y={y(d.captured)} width={barW} height={capturedH} rx="3" fill="#1E40AF" opacity="0.18" />
            <rect x={cx - barW / 2 - 2} y={y(d.admitted)} width={barW} height={admittedH} rx="3" fill="#1E40AF" />
            <text x={cx} y={height - pad.b + 16} textAnchor="middle" fontSize="10.5" fill="#6B7280">{d.week}</text>
          </g>
        );
      })}
      <g transform={`translate(${pad.l}, ${height - 8})`}>
        <rect x="0" y="-8" width="10" height="10" fill="#1E40AF" opacity="0.18" rx="2" />
        <text x="14" y="1" fontSize="11" fill="#6B7280">Captured</text>
        <rect x="80" y="-8" width="10" height="10" fill="#1E40AF" rx="2" />
        <text x="94" y="1" fontSize="11" fill="#6B7280">Admitted</text>
      </g>
    </svg>
  );
}

function Analytics({ leads, navigate }) {
  const stats = useAnMemo(() => {
    const nowT = TODAY.getTime();
    const week = 7 * 86400000, month = 30 * 86400000, q90 = 90 * 86400000;
    const inPast = (iso, ms) => nowT - new Date(iso).getTime() <= ms;

    const capturedWeek = leads.filter(l => inPast(l.capturedAt, week)).length;
    const capturedMonth = leads.filter(l => inPast(l.capturedAt, month)).length;
    const callsWeek = leads.flatMap(l => l.history).filter(h => inPast(h.at, week)).length;
    const callsMonth = leads.flatMap(l => l.history).filter(h => inPast(h.at, month)).length;
    const contactedCalls = leads.flatMap(l => l.history).filter(h => inPast(h.at, month));
    const nonNoAnswer = contactedCalls.filter(h => h.outcome !== 'no_answer').length;
    const contactRate = contactedCalls.length ? Math.round(100 * nonNoAnswer / contactedCalls.length) : 0;

    const q90leads = leads.filter(l => inPast(l.capturedAt, q90));
    const q90admitted = q90leads.filter(l => l.status === 'admitted').length;
    const convRate = q90leads.length ? Math.round(100 * q90admitted / q90leads.length) : 0;

    const admittedMonth = leads.filter(l => l.status === 'admitted' && inPast(l.capturedAt, month)).length;
    const lostMonth = leads.filter(l => l.status === 'lost' && inPast(l.capturedAt, month)).length;
    const active = leads.filter(l => ['new','contacted','interested','visited'].includes(l.status)).length;

    const overdue = leads.filter(l => {
      if (['admitted','lost','rejected','on_hold'].includes(l.status)) return false;
      const s = followUpState(l.nextFollowUp);
      return s?.kind === 'overdue';
    }).length;

    const admittedLeads = leads.filter(l => l.status === 'admitted');
    const avgFU = admittedLeads.length ? (admittedLeads.reduce((s, l) => s + l.history.length, 0) / admittedLeads.length) : 0;

    return { capturedWeek, capturedMonth, callsWeek, callsMonth, contactRate, convRate, admittedMonth, lostMonth, active, overdue, avgFU };
  }, [leads]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Rolling numbers · updated live</div>
        </div>
      </div>

      <div className="tile-grid">
        <div className="tile">
          <div className="tile-label">Leads this week</div>
          <div className="tile-value">{stats.capturedWeek}</div>
          <div className="tile-sub">{stats.capturedMonth} this month</div>
        </div>
        <div className="tile">
          <div className="tile-label">Calls logged (week)</div>
          <div className="tile-value">{stats.callsWeek}</div>
          <div className="tile-sub">{stats.callsMonth} this month</div>
        </div>
        <div className="tile">
          <div className="tile-label">Contact rate</div>
          <div className="tile-value">{stats.contactRate}%</div>
          <div className="tile-sub good">Calls with a real conversation</div>
        </div>
        <div className="tile">
          <div className="tile-label">Conversion (90d)</div>
          <div className="tile-value">{stats.convRate}%</div>
          <div className="tile-sub">Admitted ÷ captured</div>
        </div>
        <div className="tile">
          <div className="tile-label">Admitted this month</div>
          <div className="tile-value" style={{ color: '#065F46' }}>{stats.admittedMonth}</div>
          <div className="tile-sub good">🎉 Enrolled</div>
        </div>
        <div className="tile">
          <div className="tile-label">Lost this month</div>
          <div className="tile-value" style={{ color: '#991B1B' }}>{stats.lostMonth}</div>
          <div className="tile-sub bad">Went to another school</div>
        </div>
        <div className="tile">
          <div className="tile-label">In pipeline</div>
          <div className="tile-value">{stats.active}</div>
          <div className="tile-sub">Active + working</div>
        </div>
        <div className="tile link" onClick={() => navigate('today')}>
          <div className="tile-label">Overdue follow-ups</div>
          <div className="tile-value" style={{ color: stats.overdue ? '#991B1B' : 'var(--n900)' }}>{stats.overdue}</div>
          <div className="tile-sub">Tap to view →</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Weekly leads captured vs admitted</h3>
        <div className="sub">Last 12 weeks</div>
        <MiniBarChart data={WEEKLY} />
      </div>

      <div className="insights">
        <h3>Insights</h3>
        <div className="insight-row"><span className="k">Avg follow-ups per admitted lead</span><span className="v">{stats.avgFU.toFixed(1)}</span></div>
        <div className="insight-row"><span className="k">Most common first-contact outcome</span><span className="v">Interested</span></div>
        <div className="insight-row"><span className="k">Best-performing class</span><span className="v">Class 1–5</span></div>
        <div className="insight-row"><span className="k">Top source location</span><span className="v">Mandsaur</span></div>
      </div>
    </div>
  );
}

Object.assign(window, { Analytics });
