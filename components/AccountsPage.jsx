'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';
import AddAccountModal from './AddAccountModal';

export default function AccountsPage() {
  const { state }       = useApp();
  const fmt             = useFmt();
  const [showModal, setShowModal] = useState(false);

  const net = state.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Account Balances</div>
        <button className="btn" onClick={() => setShowModal(true)}>+ Add account</button>
      </div>

      {state.accounts.length === 0 ? (
        <div className="empty-state">No accounts yet.</div>
      ) : (
        state.accounts.map(a => (
          <div className="account-card" key={a.id}>
            <div>
              <div className="account-name">{a.name}</div>
              <div className="account-type">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
            </div>
            <div className={`account-balance ${a.balance >= 0 ? 'positive' : 'negative'}`}>
              {a.balance < 0 ? '−' : ''}{fmt(a.balance)}
            </div>
          </div>
        ))
      )}

      <div className="card" style={{ marginTop: 4 }}>
        <div className="card-title">Net worth</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: net >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {net < 0 ? '−' : ''}{fmt(Math.abs(net))}
        </div>
      </div>

      {showModal && <AddAccountModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
