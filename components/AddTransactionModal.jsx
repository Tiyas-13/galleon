'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const today = () => new Date().toISOString().split('T')[0];

export default function AddTransactionModal({ onClose }) {
  const { state, addTransaction } = useApp();
  const [type,       setType]       = useState('expense');
  const [desc,       setDesc]       = useState('');
  const [amount,     setAmount]     = useState('');
  const [date,       setDate]       = useState(today());
  const [cat,        setCat]        = useState(state.categories[0] ?? '');
  const [from,       setFrom]       = useState(state.accounts[0]?.id ?? '');
  const [to,         setTo]         = useState(state.accounts[1]?.id ?? state.accounts[0]?.id ?? '');
  const [notes,      setNotes]      = useState('');

  // Split fields (only relevant when type === 'expense')
  const [isSplit,    setIsSplit]    = useState(false);
  const [splitMode,  setSplitMode]  = useState('amount'); // 'amount' | 'fraction'
  const [myShare,    setMyShare]    = useState('');
  const [splitParts, setSplitParts] = useState('3');
  const [splitsAcct, setSplitsAcct] = useState(state.accounts[1]?.id ?? state.accounts[0]?.id ?? '');

  const isTransfer  = type === 'transfer';
  const isIncome    = type === 'income';
  const showSplit   = type === 'expense' && isSplit;

  const totalAmt     = parseFloat(amount || 0);
  const computedShare = showSplit
    ? splitMode === 'fraction'
      ? totalAmt / Math.max(1, parseInt(splitParts) || 1)
      : parseFloat(myShare || 0)
    : totalAmt;
  const remainder = showSplit ? Math.max(0, totalAmt - computedShare) : 0;

  function handleTypeChange(t) {
    setType(t);
    if (t !== 'expense') setIsSplit(false);
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0 || !date) {
      alert('Please fill in description, amount, and date.');
      return;
    }

    if (showSplit) {
      const share = computedShare;
      if (isNaN(share) || share <= 0 || share > amt) {
        alert('Your share must be between 0 and the total amount.');
        return;
      }
      await addTransaction({
        type: 'expense', desc: desc.trim(), amount: share,
        date, cat, from, to: null, notes: notes.trim(),
      });
      if (remainder > 0.001) {
        await addTransaction({
          type: 'transfer', desc: `Split: ${desc.trim()}`, amount: remainder,
          date, cat: 'Splits', from, to: splitsAcct, notes: '',
        });
      }
    } else {
      await addTransaction({
        type, desc: desc.trim(), amount: amt, date, notes: notes.trim(),
        cat,
        from,
        to: isTransfer ? to : null,
      });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add transaction</div>

        <div className="type-tabs">
          {['expense', 'income', 'transfer'].map(t => (
            <button
              key={t}
              className={`type-tab${type === t ? ' active' : ''}`}
              onClick={() => handleTypeChange(t)}
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
            <label>{showSplit ? 'Total amount' : 'Amount'}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
          </div>
        </div>

        {type === 'expense' && (
          <label className="split-toggle-row">
            <input
              type="checkbox"
              checked={isSplit}
              onChange={e => setIsSplit(e.target.checked)}
            />
            Split this expense with others
          </label>
        )}

        {showSplit && (
          <>
            <div className="split-hint">
              Only your share counts as an expense. The rest goes to your splits account.
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Your share
                  <span className="split-mode-toggle">
                    <button className={`split-mode-btn${splitMode === 'amount' ? ' active' : ''}`} onClick={() => setSplitMode('amount')} type="button">Amount</button>
                    <button className={`split-mode-btn${splitMode === 'fraction' ? ' active' : ''}`} onClick={() => setSplitMode('fraction')} type="button">Split equally</button>
                  </span>
                </label>
                {splitMode === 'amount' ? (
                  <input type="number" value={myShare} onChange={e => setMyShare(e.target.value)} placeholder="0.00" min="0" step="0.01" />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>1 /</span>
                    <input type="number" value={splitParts} onChange={e => setSplitParts(e.target.value)} min="2" max="20" step="1" style={{ width: 60 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      = {state.currency}{computedShare.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Others owe you</label>
                <input type="number" value={remainder.toFixed(2)} readOnly style={{ opacity: 0.6 }} />
              </div>
            </div>
          </>
        )}

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
          {showSplit && (
            <div className="form-group">
              <label>Splits account</label>
              <select value={splitsAcct} onChange={e => setSplitsAcct(e.target.value)}>
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
