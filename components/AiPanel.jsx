'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { checkRateLimit, getIdToken, buildSummary } from '@/lib/ai';
import AddTransactionModal from './AddTransactionModal';

export default function AiPanel() {
  const { state } = useApp();
  const [open,      setOpen]      = useState(false);
  const [tab,       setTab]       = useState('parse'); // 'parse' | 'query'
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [parsedTxn, setParsedTxn] = useState(null);
  const [messages,  setMessages]  = useState([]); // query chat history
  const inputRef   = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function callApi(type, text) {
    setError('');
    setLoading(true);
    try {
      const user = (await import('@/lib/firebase')).auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const allowed = await checkRateLimit(user.uid);
      if (!allowed) throw new Error("Daily AI limit reached (30/day). Try again tomorrow.");

      const idToken = await getIdToken();

      let context;
      if (type === 'parse') {
        context = { categories: state.categories, accounts: state.accounts };
      } else {
        // query and analyse both get summary + personalContext
        context = {
          summary: buildSummary(state),
          personalContext: state.personalContext ?? '',
        };
      }

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

  async function handleParse() {
    if (!input.trim()) return;
    const result = await callApi('parse', input.trim()).catch(e => { setError(e.message); return null; });
    if (!result) return;
    setParsedTxn(result);
    setInput('');
  }

  async function handleQuery() {
    if (!input.trim()) return;
    const question = input.trim();
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    const result = await callApi('query', question).catch(e => { setError(e.message); return null; });
    if (result) setMessages(m => [...m, { role: 'assistant', text: result }]);
  }

  async function handleAnalyse() {
    setMessages(m => [...m, { role: 'user', text: '✦ Analyse my vault' }]);
    const result = await callApi('analyse', 'vault briefing').catch(e => { setError(e.message); return null; });
    if (result) setMessages(m => [...m, { role: 'assistant', text: result }]);
  }

  function handleSubmit() {
    if (tab === 'parse') handleParse();
    else handleQuery();
  }

  function switchTab(t) {
    setTab(t);
    setError('');
    if (t === 'parse') setMessages([]);
    if (t === 'query') setParsedTxn(null);
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  return (
    <>
      {/* Floating trigger button */}
      <button className="ai-fab" onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 100); }} title="AI Assistant">
        <span className="ai-fab-icon">✦</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-title">✦ Galleon Assistant</div>
            <div className="ai-tabs">
              <button className={`ai-tab${tab === 'parse' ? ' active' : ''}`} onClick={() => switchTab('parse')}>Add transaction</button>
              <button className={`ai-tab${tab === 'query' ? ' active' : ''}`} onClick={() => switchTab('query')}>Ask</button>
            </div>
            <button className="ai-close" onClick={() => setOpen(false)}>&times;</button>
          </div>

          <div className="ai-panel-body">
            {tab === 'parse' ? (
              <div className="ai-parse-hint">
                Describe a transaction in plain English — e.g. <em>"spent £45 on groceries at Tesco today from Barclays"</em>
              </div>
            ) : (
              <div className="ai-messages">
                {messages.length === 0 && (
                  <>
                    <div className="ai-parse-hint">Ask anything about your finances — e.g. <em>"How much did I spend on food this month?"</em></div>
                    <button
                      className="ai-analyse-btn"
                      onClick={handleAnalyse}
                      disabled={loading}
                    >
                      ✦ Analyse my vault
                    </button>
                  </>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`ai-message ${m.role}`}>{m.text}</div>
                ))}
                {loading && <div className="ai-message assistant ai-thinking">Thinking…</div>}
                <div ref={messagesEndRef} />
              </div>
            )}

            {error && <div className="ai-error">{error}</div>}
          </div>

          {tab === 'query' && messages.length > 0 && (
            <div style={{ padding: '0 16px 4px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="ai-analyse-btn"
                onClick={handleAnalyse}
                disabled={loading}
                style={{ fontSize: 11, padding: '4px 10px' }}
              >
                ✦ Analyse my vault
              </button>
            </div>
          )}

          <div className="ai-panel-footer">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={tab === 'parse' ? 'e.g. paid £12 for coffee yesterday…' : 'Ask about your finances…'}
              rows={2}
              disabled={loading}
            />
            <button className="btn primary ai-send" onClick={handleSubmit} disabled={loading || !input.trim()}>
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm parsed transaction */}
      {parsedTxn && (
        <AddTransactionModal
          initialData={parsedTxn}
          onClose={() => setParsedTxn(null)}
        />
      )}
    </>
  );
}
