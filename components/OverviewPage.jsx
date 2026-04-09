'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';

const PERIODS = [
  { key: 'day',   label: 'Today' },
  { key: 'month', label: 'This month' },
  { key: 'year',  label: 'This year' },
  { key: 'all',   label: 'All time' },
];

function filterByPeriod(txns, period) {
  const now = new Date();
  return txns.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (period === 'day')   return d.toDateString() === now.toDateString();
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year')  return d.getFullYear() === now.getFullYear();
    return true;
  });
}

export default function OverviewPage() {
  const { state }    = useApp();
  const fmt          = useFmt();
  const [period, setPeriod] = useState('month');

  const txns = filterByPeriod(state.transactions, period);
  const exp  = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const inc  = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const tra  = txns.filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
  const net  = inc - exp;

  const ec = {}, ic = {};
  txns.filter(t => t.type === 'expense').forEach(t => { ec[t.cat] = (ec[t.cat] || 0) + t.amount; });
  txns.filter(t => t.type === 'income').forEach(t => { ic[t.cat] = (ic[t.cat] || 0) + t.amount; });

  return (
    <div className="page">
      <div className="section-title" style={{ marginBottom: 16 }}>Overview</div>

      <div className="period-tabs">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-tab${period === p.key ? ' active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="metric-grid">
        <Metric label="Total expenses" value={fmt(exp)} type="expense" />
        <Metric label="Total income"   value={fmt(inc)} type="income" />
        <Metric label="Net"            value={(net >= 0 ? '+' : '−') + fmt(Math.abs(net))} type={`net${net < 0 ? ' negative' : ''}`} valueType={net >= 0 ? 'income' : 'expense'} />
        <Metric label="Transfers"      value={fmt(tra)} type="transfer" />
      </div>

      <div className="card">
        <div className="card-title">Expenses by category</div>
        <CategoryBars data={ec} fmt={fmt} />
      </div>
      <div className="card">
        <div className="card-title">Income by category</div>
        <CategoryBars data={ic} fmt={fmt} isIncome />
      </div>
    </div>
  );
}

function Metric({ label, value, type, valueType }) {
  return (
    <div className={`metric ${type}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${valueType ?? type}`}>{value}</div>
    </div>
  );
}

function CategoryBars({ data, fmt, isIncome = false }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = entries[0]?.[1] || 1;
  if (!entries.length) return <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>None in this period.</div>;
  return entries.map(([cat, val]) => (
    <div className="cat-bar-row" key={cat}>
      <div className="cat-bar-label"><span>{cat}</span><span>{fmt(val)}</span></div>
      <div className="cat-bar-track">
        <div className={`cat-bar-fill${isIncome ? ' income' : ''}`} style={{ width: `${(val / max * 100).toFixed(1)}%` }} />
      </div>
    </div>
  ));
}
