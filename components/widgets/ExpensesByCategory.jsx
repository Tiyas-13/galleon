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

export default function ExpensesByCategory({ period = 'month' }) {
  const { state } = useApp();
  const fmt = useFmt();
  const txns = filterByPeriod(state.transactions, period);

  const byCategory = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.cat || 'Uncategorised'] = (byCategory[t.cat || 'Uncategorised'] || 0) + t.amount;
  });

  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;

  if (!entries.length) return <div className="widget-empty">No expenses this period.</div>;

  return (
    <div className="widget-body widget-scroll">
      {entries.map(([cat, val]) => (
        <div className="cat-bar-row" key={cat}>
          <div className="cat-bar-label"><span>{cat}</span><span>{fmt(val)}</span></div>
          <div className="cat-bar-track">
            <div className="cat-bar-fill" style={{ width: `${(val / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
