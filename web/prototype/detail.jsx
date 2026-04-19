// Lead detail + call logging form
const { useState: useDState, useMemo: useDMemo } = React;

function suggestNextFollowUp(outcome) {
  const d = new Date(TODAY);
  if (outcome === 'no_answer') { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d.toISOString(); }
  if (outcome === 'busy') {
    const h = d.getHours();
    if (h < 17) { d.setHours(h + 4, 0, 0, 0); } else { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
    return d.toISOString();
  }
  if (outcome === 'interested') { d.setDate(d.getDate() + 3); d.setHours(11, 0, 0, 0); return d.toISOString(); }
  if (outcome === 'callback_requested') { d.setDate(d.getDate() + 2); d.setHours(11, 0, 0, 0); return d.toISOString(); }
  if (outcome === 'visit_scheduled') { d.setDate(d.getDate() + 2); d.setHours(10, 0, 0, 0); return d.toISOString(); }
  return null;
}

function outcomeLabel(id) {
  return (OUTCOMES.find(o => o.id === id) || {}).label || id;
}

function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function LeadDetail({ lead, navigate, onUpdate, onLogCall, onClose, showToast }) {
  const [outcome, setOutcome] = useDState(null);
  const [notes, setNotes] = useDState('');
  const [nextFU, setNextFU] = useDState('');
  const [confirm, setConfirm] = useDState(null); // 'admitted' | 'lost' | 'on_hold' | 'close-outcome'
  const [status, setStatus] = useDState(lead.status);

  function pickOutcome(id) {
    setOutcome(id);
    const iso = suggestNextFollowUp(id);
    setNextFU(iso ? toInputDate(iso) : '');
  }

  function save() {
    if (!outcome) { showToast({ kind: 'error', msg: 'Pick an outcome first' }); return; }
    if (['admitted', 'lost', 'not_interested'].includes(outcome)) {
      setConfirm('close-outcome');
      return;
    }
    doSave();
  }

  function doSave(closeAs = null) {
    const entry = {
      id: 'h' + Date.now(),
      at: new Date(TODAY).toISOString(),
      outcome,
      by: 'Priya',
      notes: notes || '—',
    };
    onLogCall(lead.id, entry, nextFU ? new Date(nextFU).toISOString() : null, closeAs);
    const nextLabel = nextFU ? fmtDate(nextFU, { relative: true, noYear: true }) : 'closed';
    showToast({ kind: 'success', msg: `Call logged. Next follow-up: ${nextLabel}.` });
    if (closeAs || ['admitted', 'lost', 'not_interested'].includes(outcome)) {
      setTimeout(() => navigate('today'), 600);
    } else {
      setOutcome(null); setNotes(''); setNextFU('');
    }
  }

  const state = followUpState(lead.nextFollowUp);
  const telHref = 'tel:' + (lead.phone || '').replace(/\s+/g, '');
  const waHref = 'https://wa.me/' + (lead.phone || '').replace(/\D/g, '');

  return (
    <div className="page">
      <button className="back-link" onClick={() => navigate('today')}>
        <Icon.arrowLeft /> Back to Today
      </button>

      <div className="detail-grid">
        {/* LEFT: info + history */}
        <div>
          <div>
            <div className="detail-title">{lead.student}</div>
            <div className="detail-subtitle">{lead.parent} · {lead.phone}</div>
          </div>

          <div className="detail-actions">
            <a className="btn btn-primary btn-lg" href={telHref}>
              <Icon.phone size={18} /> Call
            </a>
            <a className="btn btn-success btn-lg" href={waHref} target="_blank" rel="noreferrer">
              <Icon.whatsapp size={18} /> WhatsApp
            </a>
          </div>

          <div className="info-grid">
            <div><div className="k">Class</div><div className="v">{lead.class}</div></div>
            <div><div className="k">Interest</div><div className="v">{lead.interest}</div></div>
            <div><div className="k">Location</div><div className="v">{lead.location}</div></div>
            <div><div className="k">Captured</div><div className="v">{fmtDate(lead.capturedAt, { noYear: true })}</div></div>
            <div>
              <div className="k">Status</div>
              <select className="select" value={status} onChange={e => {
                setStatus(e.target.value);
                onUpdate(lead.id, { status: e.target.value });
                showToast({ kind: 'success', msg: 'Status updated' });
              }} style={{ marginTop: 2, padding: '8px 36px 8px 12px', minHeight: 36, fontSize: 13, fontWeight: 600 }}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <div className="k">Next follow-up</div>
              <div className="v">
                {lead.nextFollowUp ? fmtDate(lead.nextFollowUp, { relative: true, withTime: true, noYear: true }) : '—'}
                {state?.kind === 'overdue' && <span className="chip chip-overdue" style={{ marginLeft: 8 }}>{state.label}</span>}
              </div>
            </div>
          </div>

          <details className="collapsible">
            <summary><Icon.chevronRight size={14} /> Source message</summary>
            <div className="source">
              <div className="from"><Icon.whatsapp size={14} /> {lead.sourceFrom} · {fmtDate(lead.sourceAt, { noYear: true })} at {fmtTime(lead.sourceAt)}</div>
              "{lead.source}"
            </div>
          </details>

          <div className="history">
            <h3>History · {lead.history.length} {lead.history.length === 1 ? 'entry' : 'entries'}</h3>
            {lead.history.length === 0 ? (
              <div className="empty">No calls logged yet. This will be the first contact.</div>
            ) : (
              [...lead.history].reverse().map(h => (
                <div key={h.id} className="history-item">
                  <div className="dot"></div>
                  <div className="body">
                    <div className="top">
                      <span className="outcome">{outcomeLabel(h.outcome)}</span>
                      <span className="when">{fmtDate(h.at, { relative: true, noYear: true })} at {fmtTime(h.at)}</span>
                    </div>
                    <div className="notes">{h.notes}</div>
                    <div className="by">— {h.by}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: log call */}
        <aside className="detail-sidebar">
          <div className="call-form-card">
            <h3>Log this call</h3>

            <div className="form-row">
              <div className="label">Outcome</div>
              <div className="radio-grid">
                {OUTCOMES.map(o => (
                  <button
                    key={o.id}
                    className={`radio-option ${outcome === o.id ? 'selected' : ''}`}
                    onClick={() => pickOutcome(o.id)}
                  >
                    <span className="bullet"></span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="label">Next follow-up</div>
              <div className="form-row-inline">
                <input
                  className="input"
                  type="datetime-local"
                  value={nextFU}
                  onChange={e => setNextFU(e.target.value)}
                  disabled={['admitted', 'lost', 'not_interested'].includes(outcome)}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setNextFU('')}>Clear</button>
              </div>
            </div>

            <div className="form-row">
              <div className="label">Notes</div>
              <textarea
                className="textarea"
                placeholder="What did they say? Key concerns, next step…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button className="btn btn-primary btn-block btn-lg" onClick={save}>
              Save call log
            </button>

            <div className="close-actions">
              <button className="btn btn-success-outline" onClick={() => setConfirm('admitted')}>Close as Admitted</button>
              <button className="btn btn-danger-outline" onClick={() => setConfirm('lost')}>Close as Lost</button>
              <button className="btn btn-muted-outline" onClick={() => setConfirm('on_hold')}>Put on hold</button>
            </div>

            <div className="meta-block">
              <span>ID: <strong>{lead.id}</strong></span>
              <span>Assigned: <strong>{lead.assignee}</strong></span>
              <span>Confidence: <strong>{Math.round(lead.confidence * 100)}%</strong></span>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm === 'admitted' ? 'Mark as admitted?' :
          confirm === 'lost' ? 'Mark as lost?' :
          confirm === 'on_hold' ? 'Put on hold?' :
          confirm === 'close-outcome' ? `Close this lead as ${outcome ? outcomeLabel(outcome) : ''}?` :
          ''
        }
        body={
          confirm === 'admitted' ? 'This will close the lead and move it out of your active queue. You can still find it in All Leads.' :
          confirm === 'lost' ? 'This lead will be closed as lost. You can still reopen it later from All Leads.' :
          confirm === 'on_hold' ? 'The lead will be paused — no follow-ups will be scheduled until you reactivate it.' :
          confirm === 'close-outcome' ? 'Based on the outcome, the lead will be closed and removed from your Today queue.' :
          ''
        }
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
            <button className={`btn ${confirm === 'admitted' ? 'btn-success' : confirm === 'lost' ? 'btn-primary' : 'btn-primary'}`}
              onClick={() => {
                if (confirm === 'close-outcome') {
                  doSave(outcome);
                } else {
                  onClose(lead.id, confirm);
                  showToast({ kind: 'success', msg: `Lead ${confirm === 'on_hold' ? 'put on hold' : 'closed as ' + confirm}.` });
                  setTimeout(() => navigate('today'), 400);
                }
                setConfirm(null);
              }}>
              Confirm
            </button>
          </>
        }
      />
    </div>
  );
}

Object.assign(window, { LeadDetail, suggestNextFollowUp, outcomeLabel });
