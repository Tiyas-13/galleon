'use client';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '@/context/AppContext';
import { checkRateLimit, getIdToken, buildSummary } from '@/lib/ai';
import AddTransactionModal from './AddTransactionModal';

const HISTORY_LIMIT = 40; // messages kept in Firestore
const CONTEXT_WINDOW = 12; // messages sent to Claude each call

export default function AiPage() {
  const { state } = useApp();
  const [messages,  setMessages]  = useState(null); // null = loading
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [parsedTxn, setParsedTxn] = useState(null);
  const inputRef       = useRef(null);
  const messagesEndRef = useRef(null);

  // ── Load history from Firestore ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const user = (await import('@/lib/firebase')).auth.currentUser;
        if (!user) { setMessages([]); return; }
        const ref  = doc(db, 'users', user.uid, 'data', 'chatHistory');
        const snap = await getDoc(ref);
        setMessages(snap.exists() ? (snap.data().messages ?? []) : []);
      } catch {
        setMessages([]);
      }
    }
    load();
  }, []);

  // ── Save history to Firestore ──────────────────────────────────────────────
  async function persistMessages(msgs) {
    try {
      const user = (await import('@/lib/firebase')).auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'data', 'chatHistory');
      // keep only last HISTORY_LIMIT
      const trimmed = msgs.slice(-HISTORY_LIMIT);
      await setDoc(ref, { messages: trimmed });
    } catch { /* non-fatal */ }
  }

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Core API caller ────────────────────────────────────────────────────────
  async function callApi(type, text, currentMessages = []) {
    setError('');
    setLoading(true);
    try {
      const firebase = await import('@/lib/firebase');
      const user = firebase.auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const allowed = await checkRateLimit(user.uid);
      if (!allowed) throw new Error('Daily AI limit reached (30/day). Try again tomorrow.');

      const idToken = await getIdToken();

      // Build conversation history for Claude (last N messages)
      const history = currentMessages
        .slice(-CONTEXT_WINDOW)
        .map(m => ({ role: m.role, text: m.text }));

      const context = type === 'parse'
        ? { categories: state.categories, accounts: state.accounts }
        : { summary: buildSummary(state), personalContext: state.personalContext ?? '', history };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, type, text, context }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      return data.result;
    } finally {
      setLoading(false);
    }
  }

  // ── Send a chat message ────────────────────────────────────────────────────
  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');

    const userMsg  = { role: 'user',      text: question,  ts: Date.now() };
    const updated  = [...(messages ?? []), userMsg];
    setMessages(updated);

    const result = await callApi('query', question, updated).catch(e => {
      setError(e.message); return null;
    });

    if (result) {
      const aiMsg   = { role: 'assistant', text: result, ts: Date.now() };
      const final   = [...updated, aiMsg];
      setMessages(final);
      persistMessages(final);
    }
  }

  // ── Analyse vault ──────────────────────────────────────────────────────────
  async function handleAnalyse() {
    if (loading) return;
    const userMsg = { role: 'user', text: '✦ Analyse my vault', ts: Date.now() };
    const updated = [...(messages ?? []), userMsg];
    setMessages(updated);

    const result = await callApi('analyse', 'vault briefing', updated).catch(e => {
      setError(e.message); return null;
    });

    if (result) {
      const aiMsg = { role: 'assistant', text: result, ts: Date.now() };
      const final = [...updated, aiMsg];
      setMessages(final);
      persistMessages(final);
    }
  }

  // ── Parse transaction (opens confirm modal) ────────────────────────────────
  async function handleParse() {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');

    const result = await callApi('parse', question).catch(e => {
      setError(e.message); return null;
    });
    if (result) setParsedTxn(result);
  }

  async function clearHistory() {
    if (!confirm('Clear all chat history?')) return;
    setMessages([]);
    try {
      const firebase = await import('@/lib/firebase');
      const user = firebase.auth.currentUser;
      if (user) {
        const ref = doc(db, 'users', user.uid, 'data', 'chatHistory');
        await setDoc(ref, { messages: [] });
      }
    } catch { /* non-fatal */ }
  }

  const isLoaded = messages !== null;

  return (
    <div className="ai-page">
      {/* Header */}
      <div className="ai-page-header">
        <div>
          <div className="ai-page-title">✦ Galleon Assistant</div>
          <div className="ai-page-sub">Your personal finance advisor — ask anything, or get a vault briefing.</div>
        </div>
        {isLoaded && messages.length > 0 && (
          <button className="btn sm" onClick={clearHistory} style={{ opacity: 0.6, fontSize: 11 }}>
            Clear history
          </button>
        )}
      </div>

      {/* Analyse button */}
      <div className="ai-page-actions">
        <button className="ai-analyse-btn ai-analyse-large" onClick={handleAnalyse} disabled={loading || !isLoaded}>
          ✦ Analyse my vault
        </button>
        {!state.personalContext && (
          <span className="ai-context-nudge">
            Add personal context in Settings for smarter advice
          </span>
        )}
      </div>

      {/* Chat area */}
      <div className="ai-page-chat">
        {!isLoaded && (
          <div className="ai-page-empty">Loading…</div>
        )}
        {isLoaded && messages.length === 0 && (
          <div className="ai-page-empty">
            <div className="ai-page-empty-icon">✦</div>
            <div>No conversation yet.</div>
            <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
              Ask a question below, or tap "Analyse my vault" for a full briefing.
            </div>
          </div>
        )}

        {isLoaded && messages.map((m, i) => (
          <div key={i} className={`ai-page-msg ${m.role}`}>
            <div className="ai-page-msg-label">{m.role === 'user' ? 'You' : '✦ Galleon'}</div>
            <div className="ai-page-msg-text">{m.text}</div>
          </div>
        ))}

        {loading && (
          <div className="ai-page-msg assistant">
            <div className="ai-page-msg-label">✦ Galleon</div>
            <div className="ai-page-msg-text ai-thinking">Thinking…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="ai-error" style={{ margin: '0 0 8px' }}>{error}</div>}

      {/* Input */}
      <div className="ai-page-footer">
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder='Ask about your finances — e.g. "How much did I spend on food last month?"'
          rows={2}
          disabled={loading || !isLoaded}
        />
        <button
          className="btn primary ai-send"
          onClick={handleSend}
          disabled={loading || !input.trim() || !isLoaded}
        >
          {loading ? '…' : '↑'}
        </button>
      </div>

      {parsedTxn && (
        <AddTransactionModal initialData={parsedTxn} onClose={() => setParsedTxn(null)} />
      )}
    </div>
  );
}
