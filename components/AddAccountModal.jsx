'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const ACCOUNT_TYPES = ['checking','savings','credit','cash','investment','other'];

export default function AddAccountModal({ onClose }) {
  const { state, saveSettings } = useApp();
  const [name,    setName]    = useState('');
  const [type,    setType]    = useState('checking');
  const [balance, setBalance] = useState('');

  async function handleSave() {
    if (!name.trim()) { alert('Please enter an account name.'); return; }
    const newAccount = {
      id:      'a' + Date.now(),
      name:    name.trim(),
      type,
      balance: parseFloat(balance) || 0,
    };
    await saveSettings({ accounts: [...state.accounts, newAccount] });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add account</div>
        <div className="form-row full">
          <div className="form-group">
            <label>Account name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chase Checking" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Starting balance</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" step="0.01" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Add account</button>
        </div>
      </div>
    </div>
  );
}
