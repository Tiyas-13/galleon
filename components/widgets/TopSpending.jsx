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

export default function TopSpending({ period = 'month' }) {
  const { state } = useApp();
  const fmt = useFmt();
  const txns = filterByPeriod(state.transactions, period).filter(t => t.type === 'expense');
  const sorted = [...txns].sort((a, b) => b.amount - a.amount).slice(0, 8);

  if (!sorted.length) return <div className="widget-empty">No expenses this period.</div>;

  return (
    <div className="widget-body widget-scroll">
      {sorted.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--gold)', minWidth: 16 }}>#{i + 1}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.cat} · {t.date}</div>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--crimson-light)' }}>−{fmt(t.amount)}</div>
        </div>
      ))}
    </div>
  );
}
