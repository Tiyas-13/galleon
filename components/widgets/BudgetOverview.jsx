'use client';
import { useApp, useFmt } from '@/context/AppContext';

function calcSpend(transactions, accounts) {
  const now = new Date();
  const month = now.getMonth(), year = now.getFullYear();
  const spend = {};
  transactions.forEach(t => {
    if (t.type === 'income') return;
    if (t.type === 'transfer' && !t.cat) return;
    if (!t.cat) return;
    const d = new Date(t.date + 'T12:00:00');
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    const delta = t.reversal ? -t.amount : t.amount;
    spend[t.cat] = (spend[t.cat] || 0) + delta;
  });
  return spend;
}

export default function BudgetOverview() {
  const { state } = useApp();
  const fmt = useFmt();
  const spend = calcSpend(state.transactions, state.accounts);

  if (!state.budgetGroups.length) return <div className="widget-empty">No budgets set up yet.</div>;

  return (
    <div className="widget-body widget-scroll">
      {state.budgetGroups.map(g => {
        const spent = g.categoryIds.reduce((s, id) => s + (spend[id] || 0), 0);
        const pct = Math.min((spent / g.target) * 100, 100);
        const over = spent > g.target;
        return (
          <div key={g.id} style={{ marginBottom: 14 }}>
            <div className="cat-bar-label">
              <span>{g.name}</span>
              <span style={{ color: over ? 'var(--crimson)' : 'var(--text-secondary)' }}>
                {fmt(spent)} / {fmt(g.target)}
              </span>
            </div>
            <div className="cat-bar-track">
              <div className={`cat-bar-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
