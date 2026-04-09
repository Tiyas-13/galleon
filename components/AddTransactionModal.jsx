'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const today = () => new Date().toISOString().split('T')[0];

export default function AddTransactionModal({ onClose }) {
  const { state, addTransaction } = useApp();
  const [type,   setType]   = useState('expense');
  const [desc,   setDesc]   = useState('');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(today());
  const [cat,    setCat]    = useState(state.categories[0] ?? '');
  const [from,   setFrom]   = useState(state.accounts[0]?.id ?? '');
  const [to,     setTo]     = useState(state.accounts[1]?.id ?? state.accounts[0]?.id ?? '');
  const [notes,  setNotes]  = useState('');

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0 || !date) {
      alert('Please fill in description, amount, and date.');
      return;
    }
    await addTransaction({
      type, desc: desc.trim(), amount: amt, date, notes: notes.trim(),
      cat,
      from,
      to: type === 'transfer' ? to : null,
    });
    onClose();
  }

  const isTransfer = type === 'transfer';
  const isIncome   = type === 'income';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add transaction</div>

        <div className="type-tabs">
          {['expense', 'income', 'transfer'].map(t => (
            <button
              key={t}
              className={`type-tab${type === t ? ' active' : ''}`}
              onClick={() => setType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Grocery run" />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={cat} onChange={e => setCat(e.target.value)}>
              {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{isIncome ? 'To account' : 'From account'}</label>
            <select value={from} onChange={e => setFrom(e.target.value)}>
              {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {isTransfer && (
            <div className="form-group">
              <label>To account</label>
              <select value={to} onChange={e => setTo(e.target.value)}>
                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="form-row full">
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra details..." />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Save transaction</button>
        </div>
      </div>
    </div>
  );
}
