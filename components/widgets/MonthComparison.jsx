'use client';
import { useApp, useFmt } from '@/context/AppContext';

export default function MonthComparison() {
  const { state } = useApp();
  const fmt = useFmt();
  const now = new Date();

  function monthSpend(month, year) {
    return state.transactions
      .filter(t => {
        const d = new Date(t.date + 'T12:00:00');
        return t.type === 'expense' && d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((s, t) => s + t.amount, 0);
  }

  const thisMonth = monthSpend(now.getMonth(), now.getFullYear());
  const lastDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthSpend(lastDate.getMonth(), lastDate.getFullYear());
  const diff = thisMonth - lastMonth;
  const pct  = lastMonth > 0 ? Math.round((diff / lastMonth) * 100) : null;

  const thisLabel = now.toLocaleDateString('en-GB', { month: 'short' });
  const lastLabel = lastDate.toLocaleDateString('en-GB', { month: 'short' });
  const max = Math.max(thisMonth, lastMonth, 1);

  return (
    <div className="widget-body">
      <div className="widget-stat-row">
        <div className="widget-stat">
          <div className="widget-stat-label">{lastLabel}</div>
          <div className="widget-stat-value">{fmt(lastMonth)}</div>
        </div>
        <div className="widget-stat">
          <div className="widget-stat-label">{thisLabel}</div>
          <div className="widget-stat-value">{fmt(thisMonth)}</div>
        </div>
        <div className="widget-stat">
          <div className="widget-stat-label">Change</div>
          <div className={`widget-stat-value ${diff <= 0 ? 'income' : 'expenses'}`}>
            {pct !== null ? `${diff > 0 ? '+' : ''}${pct}%` : '—'}
          </div>
        </div>
      </div>
      <div className="widget-bars-simple">
        <div className="widget-bar-row">
          <span>{lastLabel}</span>
          <div className="widget-bar-track">
            <div className="widget-bar-fill expenses" style={{ width: `${(lastMonth / max) * 100}%`, opacity: 0.5 }} />
          </div>
        </div>
        <div className="widget-bar-row">
          <span>{thisLabel}</span>
          <div className="widget-bar-track">
            <div className="widget-bar-fill expenses" style={{ width: `${(thisMonth / max) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
