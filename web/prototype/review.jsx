// Review queue (admin only)
const { useState: useRvState } = React;

function Review({ reviewItems, onPromote, onDiscard, showToast }) {
  const [items, setItems] = useRvState(reviewItems);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Review queue <Icon.shield size={18} style={{ marginLeft: 6, color: 'var(--primary)' }} /></div>
          <div className="page-sub">Low-confidence extractions · admin only</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {items.length === 0 && <div className="empty">All caught up — nothing to review 🎉</div>}
        {items.map(it => (
          <div key={it.id} className="review-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>{it.id}</strong>
              <span className="review-conf"><Icon.alert size={12} /> {Math.round(it.confidence * 100)}% confidence</span>
              <span style={{ color: 'var(--n500)', fontSize: 12.5 }}>{fmtDate(it.sourceAt, { relative: true, noYear: true })} · {it.sourceFrom}</span>
            </div>
            <div className="review-msg">"{it.rawMessage}"</div>
            <div className="review-fields">
              <div><div className="k">Student</div><div className="v">{it.extracted.student}</div></div>
              <div><div className="k">Parent</div><div className="v">{it.extracted.parent}</div></div>
              <div><div className="k">Class</div><div className="v">{it.extracted.class}</div></div>
              <div><div className="k">Interest</div><div className="v">{it.extracted.interest}</div></div>
              <div><div className="k">Location</div><div className="v">{it.extracted.location}</div></div>
              <div><div className="k">Phone</div><div className="v">{it.extracted.phone}</div></div>
            </div>
            <div className="review-actions">
              <button className="btn btn-primary btn-sm" onClick={() => {
                setItems(items.filter(x => x.id !== it.id));
                onPromote?.(it);
                showToast({ kind: 'success', msg: `${it.id} promoted to Leads.` });
              }}>Promote</button>
              <button className="btn btn-secondary btn-sm" onClick={() => showToast({ msg: 'Edit form would open here.' })}>Edit fields</button>
              <button className="btn btn-danger-outline btn-sm" onClick={() => {
                setItems(items.filter(x => x.id !== it.id));
                onDiscard?.(it);
                showToast({ msg: `${it.id} discarded.` });
              }}>Discard</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Review });
