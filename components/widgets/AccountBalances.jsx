'use client';
import { useApp, useFmt } from '@/context/AppContext';

export default function AccountBalances() {
  const { state } = useApp();
  const fmt = useFmt();
  const net = state.accounts.reduce((s, a) => s + a.balance, 0);

  if (!state.accounts.length) return <div className="widget-empty">No accounts yet.</div>;

  return (
    <div className="widget-body">
      {state.accounts.map(a => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{a.type}</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: a.balance >= 0 ? 'var(--text-primary)' : 'var(--crimson)' }}>
            {a.balance < 0 ? '−' : ''}{fmt(Math.abs(a.balance))}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, fontWeight: 700 }}>
        <span style={{ fontSize: 13 }}>Net worth</span>
        <span style={{ fontFamily: 'var(--font-display)', color: net >= 0 ? '#2A6E3A' : 'var(--crimson)' }}>{net < 0 ? '−' : ''}{fmt(Math.abs(net))}</span>
      </div>
    </div>
  );
}
