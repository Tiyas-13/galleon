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

export default function IncomeVsExpenses({ period = 'month' }) {
  const { state } = useApp();
  const fmt = useFmt();
  const txns = filterByPeriod(state.transactions, period);
  const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expenses;
  const max = Math.max(income, expenses, 1);

  return (
    <div className="widget-body">
      <div className="widget-stat-row">
        <div className="widget-stat">
          <div className="widget-stat-label">Income</div>
          <div className="widget-stat-value income">{fmt(income)}</div>
        </div>
        <div className="widget-stat">
          <div className="widget-stat-label">Expenses</div>
          <div className="widget-stat-value expenses">{fmt(expenses)}</div>
        </div>
        <div className="widget-stat">
          <div className="widget-stat-label">Net</div>
          <div className={`widget-stat-value ${net >= 0 ? 'income' : 'expenses'}`}>{net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}</div>
        </div>
      </div>
      <div className="widget-bars-simple">
        <div className="widget-bar-row">
          <span>Income</span>
          <div className="widget-bar-track">
            <div className="widget-bar-fill income" style={{ width: `${(income / max) * 100}%` }} />
          </div>
        </div>
        <div className="widget-bar-row">
          <span>Expenses</span>
          <div className="widget-bar-track">
            <div className="widget-bar-fill expenses" style={{ width: `${(expenses / max) * 100}%` }} />
          </div>
        </div>
        <div className="widget-bar-row">
          <span>Savings rate</span>
          <div className="widget-bar-track">
            <div className="widget-bar-fill savings" style={{ width: `${income > 0 ? Math.max(0, (net / income) * 100) : 0}%` }} />
          </div>
          <span className="widget-bar-pct">{income > 0 ? Math.round((net / income) * 100) : 0}%</span>
        </div>
      </div>
    </div>
  );
}
