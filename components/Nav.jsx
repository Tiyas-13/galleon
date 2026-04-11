'use client';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const PAGES = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'overview',     label: 'Overview'     },
  { id: 'budget',       label: 'Budget'       },
  { id: 'accounts',     label: 'Accounts'     },
  { id: 'assistant',    label: '✦ Assistant'  },
  { id: 'settings',     label: 'Settings'     },
];

export default function Nav({ activePage, setActivePage }) {
  return (
    <nav className="nav">
      <button className="nav-logo-btn" onClick={() => setActivePage('home')}>
        <span className="nav-logo">Galleon</span>
      </button>
      {PAGES.map(({ id, label }) => (
        <button
          key={id}
          className={`nav-btn${activePage === id ? ' active' : ''}`}
          onClick={() => setActivePage(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
