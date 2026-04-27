'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';

function calcMonthlySpend(transactions, budgetGroups) {
  const now = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const spendByCategory = {};
  transactions.forEach(t => {
    if (t.type === 'transfer' && !t.cat) return; // uncategorised transfers ignored
    if (!t.cat) return;
    const d = new Date(t.date + 'T12:00:00');
    if (d.getMonth() !== month || d.getFullYear() !== year) return;

    let delta;
    if (t.type === 'income') {
      // Income with a category reduces that category's spend (refund / rebate)
      delta = -t.amount;
    } else if (t.type === 'transfer') {
      delta = t.reversal ? -t.amount : t.amount;
    } else {
      delta = t.amount; // expense
    }
    spendByCategory[t.cat] = (spendByCategory[t.cat] || 0) + delta;
  });

  return budgetGroups.map(g => ({
    ...g,
    spent: g.categoryIds.reduce((sum, id) => sum + (spendByCategory[id] || 0), 0),
  }));
}

function monthLabel() {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function emptyGroup() {
  return { name: '', target: '', categoryIds: [], isSavings: false };
}

export default function BudgetPage() {
  const { state, saveSettings } = useApp();
  const fmt = useFmt();

  const [expandedId, setExpandedId] = useState(null);
  const [adding,     setAdding]     = useState(false);
  const [draft,      setDraft]      = useState(emptyGroup());
  const [editDraft,  setEditDraft]  = useState({});

  const groups = calcMonthlySpend(state.transactions, state.budgetGroups);

  // ── Add ────────────────────────────────────────────────────────────────────
  function startAdding() {
    setDraft(emptyGroup());
    setAdding(true);
    setExpandedId(null);
  }

  async function saveNew() {
    const name   = draft.name.trim();
    const target = parseFloat(draft.target);
    if (!name || isNaN(target) || target <= 0) {
      alert('Please enter a name and a target amount.');
      return;
    }
    const newGroup = { id: 'bg' + Date.now(), name, target, categoryIds: draft.categoryIds, isSavings: draft.isSavings ?? false };
    await saveSettings({ budgetGroups: [...state.budgetGroups, newGroup] });
    setAdding(false);
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  function startEditing(group) {
    if (expandedId === group.id) { setExpandedId(null); return; }
    setExpandedId(group.id);
    setEditDraft({ name: group.name, target: String(group.target), categoryIds: [...group.categoryIds], isSavings: group.isSavings ?? false });
    setAdding(false);
  }

  async function saveEdit(id) {
    const name   = editDraft.name.trim();
    const target = parseFloat(editDraft.target);
    if (!name || isNaN(target) || target <= 0) {
      alert('Please enter a name and a target amount.');
      return;
    }
    await saveSettings({
      budgetGroups: state.budgetGroups.map(g =>
        g.id === id ? { ...g, name, target, categoryIds: editDraft.categoryIds, isSavings: editDraft.isSavings ?? false } : g
      ),
    });
    setExpandedId(null);
  }

  async function deleteGroup(id) {
    if (!confirm('Remove this budget group?')) return;
    await saveSettings({ budgetGroups: state.budgetGroups.filter(g => g.id !== id) });
    setExpandedId(null);
  }

  function toggleCat(cat, isEdit) {
    if (isEdit) {
      setEditDraft(prev => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(cat)
          ? prev.categoryIds.filter(c => c !== cat)
          : [...prev.categoryIds, cat],
      }));
    } else {
      setDraft(prev => ({
        ...prev,
        categoryIds: prev.categoryIds.includes(cat)
          ? prev.categoryIds.filter(c => c !== cat)
          : [...prev.categoryIds, cat],
      }));
    }
  }

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Budget</div>
        {!adding && (
          <button className="btn primary" onClick={startAdding}>+ Add budget</button>
        )}
      </div>

      <div className="budget-month">{monthLabel()}</div>

      {/* ── New group inline form ── */}
      {adding && (
        <div className="budget-group" style={{ cursor: 'default', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>New budget group</div>
          <GroupForm
            draft={draft}
            categories={state.categories}
            onChange={setDraft}
            onToggleCat={cat => toggleCat(cat, false)}
            fmt={fmt}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn primary btn-sm" onClick={saveNew}>Save</button>
            <button className="btn btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {groups.length === 0 && !adding && (
        <div className="empty-state">
          No budget groups yet. Create one to start tracking your spending.
        </div>
      )}

      {/* ── Budget group rows ── */}
      {groups.map(group => {
        const isSavings  = group.isSavings ?? false;
        // Clamp displayed spend to 0 minimum for spending groups
        // (income refunds can push net negative; show as £0 credit rather than negative bar)
        const displaySpent = isSavings ? group.spent : Math.max(0, group.spent);
        const hasCredit    = !isSavings && group.spent < 0; // net refunds exceed spend
        const pct          = group.target > 0 ? (displaySpent / group.target) * 100 : displaySpent > 0 ? 100 : 0;
        // For savings: "over" is good (hit goal). For spending: "over" is bad.
        const overBudget   = !isSavings && group.spent > group.target;
        const hitGoal      = isSavings && group.spent >= group.target;
        const normalPct    = Math.min(pct, 100);
        const overflowPct  = overBudget ? Math.min(((group.spent - group.target) / group.target) * 100, 100) : 0;
        const isExpanded = expandedId === group.id;

        return (
          <div
            key={group.id}
            className={`budget-group${overBudget ? ' over-budget' : ''}${isSavings ? ' savings-group' : ''}`}
            onClick={() => !isExpanded && startEditing(group)}
          >
            <div className="budget-group-header">
              <div className="budget-group-name">
                {group.name}
                {isSavings && <span className="savings-badge">savings</span>}
              </div>
              <div className={`budget-group-amount${overBudget ? ' over' : ''}${hitGoal ? ' hit-goal' : ''}`}>
                {isSavings
                  ? hitGoal
                    ? <>{fmt(group.spent)} <span style={{ color: 'var(--savings-green)', fontWeight: 700 }}>✓ goal hit!</span></>
                    : <>{fmt(group.spent)} <span style={{ color: 'var(--text-secondary)' }}>/ {fmt(group.target)} goal</span></>
                  : hasCredit
                    ? <span style={{ color: 'var(--savings-green)', fontWeight: 600 }}>{fmt(Math.abs(group.spent))} credit</span>
                    : overBudget
                      ? <>{fmt(group.spent)} <span style={{ color: 'var(--crimson)', fontWeight: 700 }}>({fmt(group.spent - group.target)} over)</span></>
                      : <>{fmt(displaySpent)} <span style={{ color: 'var(--text-secondary)' }}>/ {fmt(group.target)}</span></>
                }
              </div>
            </div>

            {/* Progress bar */}
            <div className="budget-track">
              <div
                className={`budget-fill${overBudget ? ' over' : ''}${isSavings ? ' savings' : ''}${hasCredit ? ' credit' : ''}`}
                style={{ width: `${normalPct}%` }}
              />
              {overBudget && <div className="budget-overflow" style={{ width: `${overflowPct}%` }} />}
            </div>

            {/* Category chips */}
            {!isExpanded && group.categoryIds.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.categoryIds.map(c => (
                  <span key={c} className="cat-chip" style={{ fontSize: 11, padding: '3px 9px' }}>{c}</span>
                ))}
              </div>
            )}

            {/* Inline edit form */}
            {isExpanded && (
              <div className="budget-inline-form" onClick={e => e.stopPropagation()}>
                <GroupForm
                  draft={editDraft}
                  categories={state.categories}
                  onChange={setEditDraft}
                  onToggleCat={cat => toggleCat(cat, true)}
                  fmt={fmt}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn primary btn-sm" onClick={() => saveEdit(group.id)}>Save</button>
                  <button className="btn btn-sm" onClick={() => setExpandedId(null)}>Cancel</button>
                  <button className="btn btn-sm danger" style={{ marginLeft: 'auto' }} onClick={() => deleteGroup(group.id)}>Remove</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GroupForm({ draft, categories, onChange, onToggleCat }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>Group name</label>
          <input
            type="text"
            value={draft.name}
            onChange={e => onChange(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Essentials"
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div className="form-group">
          <label>{draft.isSavings ? 'Monthly savings goal' : 'Monthly target'}</label>
          <input
            type="number"
            value={draft.target}
            onChange={e => onChange(prev => ({ ...prev, target: e.target.value }))}
            placeholder="0.00"
            min="0"
            step="0.01"
            onClick={e => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Savings toggle */}
      <div
        className={`savings-toggle${draft.isSavings ? ' active' : ''}`}
        onClick={e => { e.stopPropagation(); onChange(prev => ({ ...prev, isSavings: !prev.isSavings })); }}
      >
        <div className="savings-toggle-track">
          <div className="savings-toggle-thumb" />
        </div>
        <div>
          <div className="savings-toggle-label">Savings group</div>
          <div className="savings-toggle-sub">
            {draft.isSavings
              ? 'Progress bar shows how close you are to your savings goal — exceeding it is a win'
              : 'Turn on if this tracks savings or investments rather than spending'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, marginTop: 4 }}>
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
