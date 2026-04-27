'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';

// ── Yearly spend per category (mirrors BudgetPage logic but scoped to this year) ──
function calcYearlySpend(transactions, goals) {
  const now  = new Date();
  const year = now.getFullYear();

  const spendByCategory = {};
  transactions.forEach(t => {
    if (t.type === 'transfer' && !t.cat) return;
    if (!t.cat) return;
    const d = new Date(t.date + 'T12:00:00');
    if (d.getFullYear() !== year) return;

    let delta;
    if (t.type === 'income')    delta = -t.amount;
    else if (t.type === 'transfer') delta = t.reversal ? -t.amount : t.amount;
    else delta = t.amount;

    spendByCategory[t.cat] = (spendByCategory[t.cat] || 0) + delta;
  });

  return goals.map(g => ({
    ...g,
    ytdSpend: g.categoryIds.reduce((sum, id) => sum + (spendByCategory[id] || 0), 0),
  }));
}

// ── Progress stats for a single goal ────────────────────────────────────────
function goalStats(goal) {
  const now         = new Date();
  const dayOfYear   = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const pctYearGone = dayOfYear / 365;
  const pctUsed     = goal.annualTarget > 0 ? goal.ytdSpend / goal.annualTarget : 0;
  // Months left including current month (Jan=0 → 12 months left, Dec=11 → 1 month left)
  const monthsLeft  = 12 - now.getMonth();
  const remaining   = goal.annualTarget - goal.ytdSpend;
  const monthlyAllowance = monthsLeft > 0 ? remaining / monthsLeft : 0;

  let status;
  if (goal.ytdSpend >= goal.annualTarget)      status = 'over';
  else if (pctUsed > pctYearGone + 0.08)       status = 'ahead';   // spending faster than pace
  else if (pctUsed < pctYearGone - 0.08)       status = 'under';   // spending slower, good
  else                                          status = 'ontrack';

  return { pctUsed, pctYearGone, monthsLeft, remaining, monthlyAllowance, status };
}

const STATUS_META = {
  over:    { label: 'Over for the year', color: 'var(--primary)',      dot: '🔴' },
  ahead:   { label: 'Ahead of pace',     color: 'var(--accent-bright)', dot: '⚡' },
  ontrack: { label: 'On track',          color: 'var(--savings-green)', dot: '✓'  },
  under:   { label: 'Under pace',        color: 'var(--savings-green)', dot: '✓'  },
};

function yearLabel() {
  return `${new Date().getFullYear()} goals`;
}

function emptyGoal() {
  return { name: '', annualTarget: '', categoryIds: [] };
}

export default function GoalsPage() {
  const { state, saveSettings } = useApp();
  const fmt = useFmt();

  const [expandedId, setExpandedId] = useState(null);
  const [adding,     setAdding]     = useState(false);
  const [draft,      setDraft]      = useState(emptyGoal());
  const [editDraft,  setEditDraft]  = useState({});

  const goals = calcYearlySpend(state.transactions, state.goals ?? []);

  // ── Add ──────────────────────────────────────────────────────────────────
  function startAdding() {
    setDraft(emptyGoal());
    setAdding(true);
    setExpandedId(null);
  }

  async function saveNew() {
    const name   = draft.name.trim();
    const target = parseFloat(draft.annualTarget);
    if (!name || isNaN(target) || target <= 0) {
      alert('Please enter a name and an annual target.');
      return;
    }
    const newGoal = { id: 'goal' + Date.now(), name, annualTarget: target, categoryIds: draft.categoryIds };
    await saveSettings({ goals: [...(state.goals ?? []), newGoal] });
    setAdding(false);
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function startEditing(goal) {
    if (expandedId === goal.id) { setExpandedId(null); return; }
    setExpandedId(goal.id);
    setEditDraft({ name: goal.name, annualTarget: String(goal.annualTarget), categoryIds: [...goal.categoryIds] });
    setAdding(false);
  }

  async function saveEdit(id) {
    const name   = editDraft.name.trim();
    const target = parseFloat(editDraft.annualTarget);
    if (!name || isNaN(target) || target <= 0) {
      alert('Please enter a name and an annual target.');
      return;
    }
    await saveSettings({
      goals: (state.goals ?? []).map(g =>
        g.id === id ? { ...g, name, annualTarget: target, categoryIds: editDraft.categoryIds } : g
      ),
    });
    setExpandedId(null);
  }

  async function deleteGoal(id) {
    if (!confirm('Remove this goal?')) return;
    await saveSettings({ goals: (state.goals ?? []).filter(g => g.id !== id) });
    setExpandedId(null);
  }

  function toggleCat(cat, isEdit) {
    const update = prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(cat)
        ? prev.categoryIds.filter(c => c !== cat)
        : [...prev.categoryIds, cat],
    });
    isEdit ? setEditDraft(update) : setDraft(update);
  }

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Flex Goals</div>
        {!adding && (
          <button className="btn primary" onClick={startAdding}>+ Add goal</button>
        )}
      </div>

      <div className="budget-month">{yearLabel()}</div>

      <div className="goals-explainer">
        Annual budgets that don't penalise you for an irregular month — as long as your yearly total stays on track, you're fine.
      </div>

      {/* ── New goal form ── */}
      {adding && (
        <div className="budget-group" style={{ cursor: 'default', marginBottom: 12 }}>
          <div className="goals-form-title">New goal</div>
          <GoalForm draft={draft} categories={state.categories} onChange={setDraft} onToggleCat={cat => toggleCat(cat, false)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn primary btn-sm" onClick={saveNew}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {goals.length === 0 && !adding && (
        <div className="empty-state">
          No goals yet. Add one to start tracking annual spending targets.
        </div>
      )}

      {/* ── Goal cards ── */}
      {goals.map(goal => {
        const { pctUsed, pctYearGone, monthsLeft, remaining, monthlyAllowance, status } = goalStats(goal);
        const isExpanded = expandedId === goal.id;
        const meta       = STATUS_META[status];
        const normalPct  = Math.min(pctUsed * 100, 100);
        const overPct    = status === 'over' ? Math.min(((goal.ytdSpend - goal.annualTarget) / goal.annualTarget) * 100, 100) : 0;

        return (
          <div
            key={goal.id}
            className={`budget-group goal-card goal-card--${status}`}
            onClick={() => !isExpanded && startEditing(goal)}
          >
            {/* Header */}
            <div className="budget-group-header">
              <div className="budget-group-name">{goal.name}</div>
              <div className="goal-status-badge" style={{ color: meta.color }}>
                {meta.dot} {meta.label}
              </div>
            </div>

            {/* Progress bar */}
            <div className="budget-track" style={{ marginBottom: 12 }}>
              <div
                className={`budget-fill goal-fill--${status}`}
                style={{ width: `${normalPct}%` }}
              />
              {status === 'over' && <div className="budget-overflow" style={{ width: `${overPct}%` }} />}
              {/* Pace marker: where you *should* be at this point in the year */}
              <div className="goal-pace-marker" style={{ left: `${Math.min(pctYearGone * 100, 99)}%` }} />
            </div>

            {/* Stats row */}
            <div className="goal-stats">
              <div className="goal-stat">
                <div className="goal-stat-value">{fmt(goal.ytdSpend)}</div>
                <div className="goal-stat-label">spent of {fmt(goal.annualTarget)}</div>
              </div>
              <div className="goal-stat goal-stat--mid">
                <div className={`goal-stat-value ${remaining >= 0 ? '' : 'goal-over'}`}>
                  {remaining >= 0 ? fmt(remaining) : `−${fmt(Math.abs(remaining))}`}
                </div>
                <div className="goal-stat-label">remaining this year</div>
              </div>
              <div className="goal-stat goal-stat--right">
                <div className={`goal-stat-value ${monthlyAllowance >= 0 ? '' : 'goal-over'}`}>
                  {status === 'over'
                    ? '—'
                    : `${fmt(Math.max(0, monthlyAllowance))}/mo`
                  }
                </div>
                <div className="goal-stat-label">
                  {status === 'over' ? 'over for the year' : `for ${monthsLeft} month${monthsLeft !== 1 ? 's' : ''} left`}
                </div>
              </div>
            </div>

            {/* Category chips */}
            {!isExpanded && goal.categoryIds.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {goal.categoryIds.map(c => (
                  <span key={c} className="cat-chip" style={{ fontSize: 11, padding: '3px 9px' }}>{c}</span>
                ))}
              </div>
            )}

            {/* Inline edit form */}
            {isExpanded && (
              <div className="budget-inline-form" onClick={e => e.stopPropagation()}>
                <GoalForm draft={editDraft} categories={state.categories} onChange={setEditDraft} onToggleCat={cat => toggleCat(cat, true)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn primary btn-sm" onClick={() => saveEdit(goal.id)}>Save</button>
                  <button className="btn btn-sm" onClick={() => setExpandedId(null)}>Cancel</button>
                  <button className="btn btn-sm danger" style={{ marginLeft: 'auto' }} onClick={() => deleteGoal(goal.id)}>Remove</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GoalForm({ draft, categories, onChange, onToggleCat }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Goal name</label>
          <input
            type="text"
            value={draft.name}
            onChange={e => onChange(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Gym & Fitness"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div className="form-group">
          <label>Annual target</label>
          <input
            type="number"
            value={draft.annualTarget}
            onChange={e => onChange(prev => ({ ...prev, annualTarget: e.target.value }))}
            placeholder="0.00"
            min="0"
            step="0.01"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
        Categories
      </div>
      <div className="budget-cat-list">
        {categories.map(cat => {
          const selected = draft.categoryIds.includes(cat);
          return (
            <button
              key={cat}
              className={`budget-cat-check${selected ? ' selected' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleCat(cat); }}
            >
              {selected && <span style={{ fontSize: 10 }}>✓</span>}
              {cat}
            </button>
          );
        })}
      </div>
    </>
  );
}
