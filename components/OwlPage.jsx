'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '@/context/AppContext';
import { checkRateLimit, getIdToken, buildSummary } from '@/lib/ai';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REPORTS = 52; // keep one year

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function OwlPage() {
  const { state } = useApp();
  const [reports,     setReports]     = useState(null); // null = loading
  const [generating,  setGenerating]  = useState(false);
  const [error,       setError]       = useState('');
  const [expanded,    setExpanded]    = useState(null); // id of open letter

  // ── Load from Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    if (!state.loaded) return;
    async function load() {
      try {
        const firebase = await import('@/lib/firebase');
        const user = firebase.auth.currentUser;
        if (!user) { setReports([]); return; }
        const ref  = doc(db, 'users', user.uid, 'data', 'owlHistory');
        const snap = await getDoc(ref);
        const existing = snap.exists() ? (snap.data().reports ?? []) : [];
        setReports(existing);

        // Check if a new one is due
        const needsNew = existing.length === 0 ||
          (Date.now() - new Date(existing[0].date).getTime()) >= WEEK_MS;

        if (needsNew) generate(existing, user.uid);
      } catch (e) {
        setReports([]);
        setError('Could not load owl post.');
      }
    }
    load();
  }, [state.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate a new report ──────────────────────────────────────────────────
  async function generate(existing, uid) {
    setGenerating(true);
    setError('');
    try {
      const firebase = await import('@/lib/firebase');
      const user = firebase.auth.currentUser;
      if (!user) throw new Error('Not signed in');

      const allowed = await checkRateLimit(uid ?? user.uid);
      if (!allowed) throw new Error('Daily AI limit reached (30/day). Try again tomorrow.');

      const idToken = await getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          type: 'owl',
          text: 'weekly report',
          context: {
            summary: buildSummary(state),
            personalContext: state.personalContext ?? '',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate report');

      const report = {
        id:      'owl-' + Date.now(),
        date:    new Date().toISOString(),
        type:    data.result.type,
        title:   data.result.title,
        content: data.result.content,
      };

      const updated = [report, ...(existing ?? reports ?? [])].slice(0, MAX_REPORTS);
      setReports(updated);
      setExpanded(report.id); // auto-open the new one

      // Persist
      const ref = doc(db, 'users', user.uid, 'data', 'owlHistory');
      await setDoc(ref, { reports: updated });
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  // ── Manually request a new one ─────────────────────────────────────────────
  async function requestNew() {
    const firebase = await import('@/lib/firebase');
    const user = firebase.auth.currentUser;
    if (!user) return;
    generate(reports, user.uid);
  }

  const isLoading = !state.loaded || reports === null;

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Owl Post</div>
        <button
          className="btn"
          onClick={requestNew}
          disabled={generating || isLoading}
          style={{ fontSize: 13 }}
        >
          {generating ? 'Sending owl…' : '✉ Request report'}
        </button>
      </div>

      {error && (
        <div className="ai-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {isLoading && (
        <div className="empty-state">Loading owl post…</div>
      )}

      {!isLoading && !generating && reports.length === 0 && (
        <div className="owl-empty">
          <div className="owl-empty-icon">🦉</div>
          <div className="owl-empty-title">No post yet</div>
          <div className="owl-empty-sub">Your first owl is on its way — check back shortly, or request one now.</div>
        </div>
      )}

      {generating && (
        <div className={`owl-letter owl-letter--generating`}>
          <div className="owl-letter-seal">🦉</div>
          <div className="owl-letter-meta">Incoming owl…</div>
          <div className="owl-letter-body owl-generating-text">
            The owl is en route from Gringotts…
          </div>
        </div>
      )}

      {!isLoading && reports.map(r => {
        const isHowler = r.type === 'howler';
        const isOpen   = expanded === r.id;
        return (
          <div
            key={r.id}
            className={`owl-letter${isHowler ? ' owl-letter--howler' : ' owl-letter--owl'}${isOpen ? ' owl-letter--open' : ''}`}
            onClick={() => setExpanded(isOpen ? null : r.id)}
          >
            <div className="owl-letter-header">
              <div className="owl-letter-seal">
                {isHowler ? '🔴' : '🦉'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="owl-letter-title">{r.title}</div>
                <div className="owl-letter-meta">{formatDate(r.date)}</div>
              </div>
              <div className="owl-letter-tag">
                {isHowler ? 'Howler' : 'Owl Post'}
              </div>
              <div className="owl-letter-chevron">{isOpen ? '▲' : '▼'}</div>
            </div>

            {isOpen && (
              <div className="owl-letter-body">
                {r.content.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="owl-footer">
        Reports are generated weekly. Each one uses one of your 30 daily AI calls.
      </div>
    </div>
  );
}
