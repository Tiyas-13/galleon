'use client';
import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { checkRateLimit, getIdToken } from '@/lib/ai';
import AddTransactionModal from './AddTransactionModal';

// Floating FAB — parse-only (natural language → pre-filled transaction modal)
// Full chat + analysis lives in the dedicated AI page.
export default function AiPanel() {
  const { state } = useApp();
  const [open,      setOpen]      = useState(false);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [parsedTxn, setParsedTxn] = useState(null);
  const inputRef = useRef(null);

  async function handleParse() {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    setLoading(true);
    try {
      const firebase = await import('@/lib/firebase');
      const user = firebase.auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const allowed = await checkRateLimit(user.uid);
      if (!allowed) throw new Error('Daily AI limit reached (30/day). Try again tomorrow.');

      const idToken = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken, type: 'parse', text,
          context: { categories: state.categories, accounts: state.accounts },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      setParsedTxn(data.result);
      setInput('');
      setOpen(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="ai-fab"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 100); }}
        title="Add transaction with AI"
      >
        <span className="ai-fab-icon">✦</span>
      </button>

      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-title">✦ Quick add</div>
            <button className="ai-close" onClick={() => setOpen(false)}>&times;</button>
          </div>

          <div className="ai-panel-body">
            <div className="ai-parse-hint">
              Describe a transaction in plain English — e.g. <em>"spent £45 on groceries at Tesco today"</em>
            </div>
            {error && <div className="ai-error">{error}</div>}
          </div>

          <div className="ai-panel-footer">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleParse(); } }}
              placeholder="e.g. paid £12 for coffee yesterday…"
              rows={2}
              disabled={loading}
            />
            <button
              className="btn primary ai-send"
              onClick={handleParse}
              disabled={loading || !input.trim()}
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      {parsedTxn && (
        <AddTransactionModal initialData={parsedTxn} onClose={() => setParsedTxn(null)} />
      )}
    </>
  );
}
