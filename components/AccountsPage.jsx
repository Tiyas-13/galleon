'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';
import AddAccountModal from './AddAccountModal';

export default function AccountsPage() {
  const { state, saveSettings } = useApp();
  const fmt = useFmt();
  const [showModal,    setShowModal]    = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [editBalance,  setEditBalance]  = useState('');
  const [editName,     setEditName]     = useState('');

  const net = state.accounts.reduce((s, a) => s + a.balance, 0);

  function startEdit(a) {
    setEditingId(a.id);
    setEditBalance(a.balance.toString());
    setEditName(a.name);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    const balance = parseFloat(editBalance);
    if (isNaN(balance)) return;
    const accounts = state.accounts.map(a =>
      a.id === id ? { ...a, name: editName.trim() || a.name, balance } : a
    );
    await saveSettings({ accounts });
    setEditingId(null);
  }

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
            {editingId === a.id ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-md)', fontSize: 14, fontFamily: 'var(--font)', background: 'var(--bg-input)' }}
                  />
                  <input
                    type="number"
                    value={editBalance}
                    onChange={e => setEditBalance(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(a.id); if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                    style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-md)', fontSize: 14, fontFamily: 'var(--font)', background: 'var(--bg-input)', maxWidth: 160 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn primary sm" onClick={() => saveEdit(a.id)}>Save</button>
                  <button className="btn sm" onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="account-name">{a.name}</div>
                  <div className="account-type">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={`account-balance ${a.balance >= 0 ? 'positive' : 'negative'}`}>
                    {a.balance < 0 ? '−' : ''}{fmt(Math.abs(a.balance))}
                  </div>
                  <button className="btn sm" onClick={() => startEdit(a)}>Edit</button>
                </div>
              </>
            )}
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
