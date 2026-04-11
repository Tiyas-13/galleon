'use client';
import { useApp, useFmt } from '@/context/AppContext';

function filterByPeriod(txns, period) {
  const now = new Date();
  return txns.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year')  return d.getFullYear() === now.getFullYear();
    return true;
  });
}

export default function TopCategories({ period = 'month' }) {
  const { state } = useApp();
  const fmt = useFmt();
  const txns = filterByPeriod(state.transactions, period).filter(t => t.type === 'expense');

  const byCategory = {};
  txns.forEach(t => {
    byCategory[t.cat || 'Uncategorised'] = (byCategory[t.cat || 'Uncategorised'] || 0) + t.amount;
  });

  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (!entries.length) return <div className="widget-empty">No expenses this period.</div>;

  return (
    <div className="widget-body widget-scroll">
      {entries.map(([cat, val], i) => (
        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--gold)', minWidth: 18 }}>#{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{cat}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--crimson-light)' }}>{fmt(val)}</span>
            </div>
            <div className="cat-bar-track">
              <div className="cat-bar-fill" style={{ width: `${(val / total) * 100}%` }} />
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>
            {Math.round((val / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
