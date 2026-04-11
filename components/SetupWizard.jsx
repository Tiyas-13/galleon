'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';

const ACCOUNT_TYPES = ['checking','savings','credit','cash','investment','other'];

function emptyAccount() {
  return { key: Date.now() + Math.random(), name: '', type: 'checking', balance: '' };
}

export default function SetupWizard() {
  const { saveSettings } = useApp();
  const [accounts,        setAccounts]        = useState([emptyAccount()]);
  const [currency,        setCurrency]        = useState('£');
  const [personalContext, setPersonalContext] = useState('');

  function addAccount() {
    setAccounts(prev => [...prev, emptyAccount()]);
  }

  function removeAccount(key) {
    setAccounts(prev => prev.filter(a => a.key !== key));
  }

  function updateAccount(key, field, value) {
    setAccounts(prev => prev.map(a => a.key === key ? { ...a, [field]: value } : a));
  }

  async function finish() {
    const validAccounts = accounts
      .filter(a => a.name.trim())
      .map(a => ({
        id:      'a' + Date.now() + Math.random(),
        name:    a.name.trim(),
        type:    a.type,
        balance: parseFloat(a.balance) || 0,
      }));

    await saveSettings({
      accounts:       validAccounts,
      currency:       currency || '£',
      personalContext: personalContext.trim(),
      setupDone:      true,
    });
  }

  return (
    <div className="fullscreen-overlay">
      <div className="overlay-box">
        <div className="overlay-title">Galleon</div>
        <div className="overlay-sub">Set up your accounts to get started. You can always add more later.</div>

        {accounts.map(acct => (
          <div className="acct-setup-row" key={acct.key}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={acct.name}
                onChange={e => updateAccount(acct.key, 'name', e.target.value)}
                placeholder="e.g. Chase Checking"
              />
            </div>
            <div className="form-group" style={{ maxWidth: 120 }}>
              <label>Type</label>
              <select value={acct.type} onChange={e => updateAccount(acct.key, 'type', e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ maxWidth: 110 }}>
              <label>Balance</label>
              <input
                type="number"
                value={acct.balance}
                onChange={e => updateAccount(acct.key, 'balance', e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <button className="acct-remove" onClick={() => removeAccount(acct.key)}>&times;</button>
          </div>
        ))}

        <button className="btn" onClick={addAccount} style={{ width: '100%', marginBottom: 20 }}>
          + Add account
        </button>

        <div className="form-group" style={{ marginBottom: 22, maxWidth: 120 }}>
          <label>Currency symbol</label>
          <input
            type="text"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            maxLength={3}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 24 }}>
          <label>About you — AI context <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 12 }}>(optional)</span></label>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
            Tell the AI assistant about your life so it can give smarter, personalised advice. You can always update this in Settings later.
          </p>
          <textarea
            value={personalContext}
            onChange={e => setPersonalContext(e.target.value)}
            placeholder="e.g. I earn £45k/year. My office provides free lunch on weekdays. I'm saving for a house deposit by end of next year."
            rows={3}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', fontFamily: 'var(--font)', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <button className="btn primary" onClick={finish} style={{ width: '100%' }}>
          Get started
        </button>
      </div>
    </div>
  );
}
