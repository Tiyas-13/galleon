'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage({ onDemo }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  async function handleLogin() {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Incorrect email or password.');
    }
  }

  return (
    <div className="fullscreen-overlay">
      <div className="overlay-box" style={{ maxWidth: 400 }}>
        <div className="overlay-title">Galleon</div>
        <div className="overlay-sub">Sign in to access your data.</div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 18 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn primary" onClick={handleLogin} style={{ width: '100%', marginTop: 8 }}>
          Sign in
        </button>
        <button className="btn" onClick={onDemo} style={{ width: '100%', marginTop: 8 }}>
          Preview with demo data
        </button>
      </div>
    </div>
  );
}
