'use client';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useApp } from '@/context/AppContext';
import AddAccountModal from './AddAccountModal';

export default function SettingsPage() {
  const { state, saveSettings, saveHouse, resetAll } = useApp();
  const [newCat,          setNewCat]          = useState('');
  const [currency,        setCurrency]        = useState(state.currency);
  const [vaultNumber,     setVaultNumber]     = useState(state.vaultNumber ?? '');
  const [personalContext, setPersonalContext] = useState(state.personalContext ?? '');
  const [showModal,       setShowModal]       = useState(false);

  async function addCategory() {
    const val = newCat.trim();
    if (!val || state.categories.includes(val)) return;
    await saveSettings({ categories: [...state.categories, val] });
    setNewCat('');
  }

  async function deleteCategory(cat) {
    await saveSettings({ categories: state.categories.filter(c => c !== cat) });
  }

  async function saveCurrency() {
    await saveSettings({ currency: currency || '$' });
  }

  async function saveVaultNumber() {
    await saveSettings({ vaultNumber: vaultNumber.trim() });
  }

  async function savePersonalContext() {
    await saveSettings({ personalContext: personalContext.trim() });
  }

  async function deleteAccount(id) {
    if (!confirm('Remove this account?')) return;
    await saveSettings({ accounts: state.accounts.filter(a => a.id !== id) });
  }

  async function handleReset() {
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    await resetAll();
  }

  const HOUSES = [
    { id: 'gryffindor', name: 'Gryffindor', sigil: '🦁', primary: '#8B1A28', accent: '#C9952A', desc: 'Scarlet & Gold' },
    { id: 'slytherin',  name: 'Slytherin',  sigil: '🐍', primary: '#1A5C35', accent: '#9EB0BE', desc: 'Emerald & Silver' },
    { id: 'ravenclaw',  name: 'Ravenclaw',  sigil: '🦅', primary: '#0F2356', accent: '#9B7520', desc: 'Navy & Bronze' },
    { id: 'hufflepuff', name: 'Hufflepuff', sigil: '🦡', primary: '#252010', accent: '#D4A800', desc: 'Black & Yellow' },
  ];

  return (
    <div className="page">
      <div className="section-title" style={{ marginBottom: 16 }}>Settings</div>

      {/* House picker */}
      <div className="card">
        <div className="card-title">Your House</div>
        <div className="house-picker">
          {HOUSES.map(h => {
            const active = (state.house ?? 'gryffindor') === h.id;
            return (
              <button
                key={h.id}
                className={`house-card${active ? ' active' : ''}`}
                onClick={() => saveHouse(h.id)}
                style={{ '--h-primary': h.primary, '--h-accent': h.accent }}
              >
                <div className="house-sigil">{h.sigil}</div>
                <div className="house-name">{h.name}</div>
                <div className="house-desc">{h.desc}</div>
                {active && <div className="house-check">✓</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Categories</div>
        <div style={{ marginBottom: 14 }}>
          {state.categories.map(c => (
            <span className="cat-chip" key={c}>
              {c}
              <button className="del-cat" onClick={() => deleteCategory(c)}>&times;</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="New category name"
            style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', fontFamily: 'var(--font)', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <button className="btn" onClick={addCategory}>Add</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Vault number</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Shown on your home page. Pick anything — your lucky number, Gringotts vault, anything.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={vaultNumber}
            onChange={e => setVaultNumber(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveVaultNumber()}
            maxLength={12}
            placeholder="e.g. 713"
            style={{ maxWidth: 120, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', fontFamily: 'var(--font)', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <button className="btn" onClick={saveVaultNumber}>Save</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">About you — AI context</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Tell the AI assistant about your life so it can give smarter, personalised advice. E.g. your income situation, free perks, saving goals, lifestyle habits.
        </p>
        <textarea
          value={personalContext}
          onChange={e => setPersonalContext(e.target.value)}
          placeholder="e.g. My office provides free breakfast and lunch on weekdays. I earn $120k/year. I'm saving for a Japan trip in August. I try to limit Ubers to weekends only."
          rows={4}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', fontFamily: 'var(--font)', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', marginBottom: 8 }}
        />
        <button className="btn" onClick={savePersonalContext}>Save</button>
      </div>

      <div className="card">
        <div className="card-title">Currency</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            maxLength={3}
            style={{ maxWidth: 80, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border-md)', fontFamily: 'var(--font)', fontSize: 14, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
          <button className="btn" onClick={saveCurrency}>Save</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Manage accounts</div>
        {state.accounts.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
            <span style={{ fontSize: 14 }}>
              {a.name} <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.type}</span>
            </span>
            <button className="btn sm danger" onClick={() => deleteAccount(a.id)}>Remove</button>
          </div>
        ))}
        <button className="btn" style={{ marginTop: 10 }} onClick={() => setShowModal(true)}>+ Add account</button>
      </div>

      <div className="card">
        <div className="card-title">Data</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Your data is stored in your own Firestore database.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn danger" onClick={handleReset}>Reset all data</button>
          <button className="btn" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </div>

      {showModal && <AddAccountModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
