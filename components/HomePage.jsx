'use client';
import { useState, useEffect } from 'react';
import { useApp, useFmt } from '@/context/AppContext';

const QUOTES = [
  { text: "A budget is telling your money where to go instead of wondering where it went.", attr: "Dave Ramsey" },
  { text: "Do not save what is left after spending; instead spend what is left after saving.", attr: "Warren Buffett" },
  { text: "The stock market is a device for transferring money from the impatient to the patient.", attr: "Warren Buffett" },
  { text: "It's not about having a lot of money. It's about knowing what to do with what you have.", attr: "Anonymous" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", attr: "Epictetus" },
  { text: "Money is a terrible master but an excellent servant.", attr: "P.T. Barnum" },
  { text: "The goal isn't more money. The goal is living life on your own terms.", attr: "Chris Brogan" },
  { text: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.", attr: "Will Rogers" },
  { text: "An investment in knowledge pays the best interest.", attr: "Benjamin Franklin" },
  { text: "Beware of little expenses. A small leak will sink a great ship.", attr: "Benjamin Franklin" },
  { text: "The art is not in making money, but in keeping it.", attr: "Proverb" },
  { text: "Gringotts is the safest place in the world for something you want to keep safe.", attr: "Rubeus Hagrid" },
  { text: "Never trust anything that can think for itself if you can't see where it keeps its brain.", attr: "Arthur Weasley" },
  { text: "It does not do to dwell on dreams and forget to live.", attr: "Albus Dumbledore" },
  { text: "After all this time? Always.", attr: "Severus Snape" },
];

function getCurrentMonthStats(transactions) {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  let income = 0, expenses = 0;
  transactions.forEach(t => {
    const d = new Date(t.date + 'T12:00:00');
    if (d.getMonth() !== month || d.getFullYear() !== year) return;
    if (t.type === 'income')  income   += t.amount;
    if (t.type === 'expense') expenses += t.amount;
  });
  return { income, expenses };
}

export default function HomePage({ setActivePage }) {
  const { state } = useApp();
  const fmt = useFmt();

  const [quoteIdx, setQuoteIdx] = useState(() => new Date().getDate() % QUOTES.length);
  const [quoteVisible, setQuoteVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 500);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const netWorth = state.accounts.reduce((s, a) => s + a.balance, 0);
  const { income, expenses } = getCurrentMonthStats(state.transactions);
  const net = income - expenses;

  const vaultNumber = state.vaultNumber || (
    state.accounts.length > 0
      ? String(Math.abs(Math.floor(netWorth * 7 + 713))).padStart(4, '0')
      : '—'
  );

  const monthName = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="home-page">

      {/* ── Crest ── */}
      <div className="home-crest">
        <div className="home-crest-ring">
          <div className="home-crest-inner">G</div>
        </div>
      </div>

      {/* ── Title ── */}
      <h1 className="home-title">Galleon</h1>
      <p className="home-subtitle">Muggle money. Magical clarity.</p>
      <div className="home-vault-num">Vault No. {vaultNumber}</div>

      {/* ── Divider ── */}
      <div className="home-divider">
        <span className="home-divider-line" />
        <span className="home-divider-gem">✦</span>
        <span className="home-divider-line" />
      </div>

      {/* ── Stats ── */}
      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-label">Net Worth</div>
          <div className={`home-stat-value${netWorth < 0 ? ' negative' : ''}`}>{fmt(netWorth)}</div>
        </div>
        <div className="home-stat-sep" />
        <div className="home-stat">
          <div className="home-stat-label">{monthName} Income</div>
          <div className="home-stat-value income">{fmt(income)}</div>
        </div>
        <div className="home-stat-sep" />
        <div className="home-stat">
          <div className="home-stat-label">{monthName} Spent</div>
          <div className="home-stat-value expenses">{fmt(expenses)}</div>
        </div>
        <div className="home-stat-sep" />
        <div className="home-stat">
          <div className="home-stat-label">Net This Month</div>
          <div className={`home-stat-value${net < 0 ? ' negative' : ' income'}`}>{net >= 0 ? '+' : ''}{fmt(net)}</div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="home-divider">
        <span className="home-divider-line" />
        <span className="home-divider-gem">✦</span>
        <span className="home-divider-line" />
      </div>

      {/* ── Quote ── */}
      <blockquote className="home-quote" style={{ opacity: quoteVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <p>&ldquo;{QUOTES[quoteIdx].text}&rdquo;</p>
        <cite>&mdash; {QUOTES[quoteIdx].attr}</cite>
      </blockquote>

      {/* ── Actions ── */}
      <div className="home-actions">
        <button className="btn primary" onClick={() => setActivePage('transactions')}>Open Ledger</button>
        <button className="btn" onClick={() => setActivePage('overview')}>View Overview</button>
        <button className="btn" onClick={() => setActivePage('budget')}>Budget</button>
      </div>

    </div>
  );
}
