'use client';
import { useApp, useFmt } from '@/context/AppContext';

// Reconstruct net worth month-by-month by walking backwards from current state.
// Only income and expenses change total net worth — transfers move money internally.
function buildHistory(transactions, accounts) {
  const currentNW = accounts.reduce((s, a) => s + a.balance, 0);

  // Net change per month: income adds, expenses subtract, transfers ignored
  const changeByMonth = {};
  transactions.forEach(t => {
    if (t.type === 'transfer') return;
    const d = new Date(t.date + 'T12:00:00');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    changeByMonth[key] = (changeByMonth[key] || 0) + (t.type === 'income' ? t.amount : -t.amount);
  });

  // Always include current month even if no transactions yet
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!changeByMonth[currentKey]) changeByMonth[currentKey] = 0;

  const months = Object.keys(changeByMonth).sort(); // ascending

  // Walk backwards: NW at end of month[i-1] = NW at end of month[i] - change[i]
  const rows = [];
  let nw = currentNW;
  for (let i = months.length - 1; i >= 0; i--) {
    const key   = months[i];
    const change = changeByMonth[key];
    const d     = new Date(key + '-01T12:00:00');
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    rows.unshift({ key, label, netWorth: nw, change });
    nw -= change;
  }
  return rows;
}

export default function NetWorthHistory() {
  const { state }  = useApp();
  const fmt        = useFmt();
  const history    = buildHistory(state.transactions, state.accounts);
  const currentNW  = state.accounts.reduce((s, a) => s + a.balance, 0);
  const first      = history[0];
  const last       = history[history.length - 1];
  const totalGain  = history.length > 1 ? last.netWorth - first.netWorth : 0;
  const isUp       = totalGain >= 0;

  // ── SVG chart ──────────────────────────────────────────────────────────────
  const VW = 300, VH = 70;
  const pad = 4;
  const nwValues = history.map(h => h.netWorth);
  const minY = Math.min(...nwValues);
  const maxY = Math.max(...nwValues);
  const rangeY = maxY - minY || 1;

  function toX(i) {
    return history.length === 1 ? VW / 2 : pad + (i / (history.length - 1)) * (VW - pad * 2);
  }
  function toY(nw) {
    return VH - pad - ((nw - minY) / rangeY) * (VH - pad * 2);
  }

  const linePts  = history.map((h, i) => `${toX(i)},${toY(h.netWorth)}`).join(' ');
  const areaPts  = [
    `${toX(0)},${VH}`,
    ...history.map((h, i) => `${toX(i)},${toY(h.netWorth)}`),
    `${toX(history.length - 1)},${VH}`,
  ].join(' ');

  const lineColor = isUp ? 'var(--savings-green)' : 'var(--primary)';

  return (
    <div className="widget-body nw-widget">

      {/* ── Top stats ── */}
      <div className="widget-stat-row" style={{ marginBottom: 14 }}>
        <div className="widget-stat">
          <div className="widget-stat-label">Net worth</div>
          <div className={`widget-stat-value ${currentNW >= 0 ? 'income' : 'expenses'}`}>
            {fmt(currentNW)}
          </div>
        </div>
        {history.length > 1 && (
          <div className="widget-stat">
            <div className="widget-stat-label">All-time change</div>
            <div className={`widget-stat-value ${isUp ? 'income' : 'expenses'}`}>
              {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
            </div>
          </div>
        )}
      </div>

      {/* ── Line chart ── */}
      {history.length > 1 && (
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: 70, display: 'block', marginBottom: 14 }}
        >
          <defs>
            <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={areaPts} fill="url(#nw-grad)" />
          <polyline
            points={linePts}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* Dot on latest point */}
          <circle
            cx={toX(history.length - 1)}
            cy={toY(last.netWorth)}
            r="3"
            fill={lineColor}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {/* ── Monthly table ── */}
      <div className="nw-table-wrap">
        <table className="nw-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Change</th>
              <th>Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map(row => {
              const sign = row.change > 0 ? '+' : '';
              return (
                <tr key={row.key}>
                  <td className="nw-month">{row.label}</td>
                  <td className={row.change > 0 ? 'nw-pos' : row.change < 0 ? 'nw-neg' : 'nw-flat'}>
                    {row.change === 0 ? '—' : `${sign}${fmt(row.change)}`}
                  </td>
                  <td className="nw-total">{fmt(row.netWorth)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
