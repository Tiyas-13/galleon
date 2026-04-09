'use client';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const PAGES = ['transactions', 'overview', 'budget', 'accounts', 'settings'];

export default function Nav({ activePage, setActivePage }) {
  return (
    <nav className="nav">
      <button className="nav-logo-btn" onClick={() => setActivePage('home')}>
        <span className="nav-logo">Galleon</span>
      </button>
      {PAGES.map(page => (
        <button
          key={page}
          className={`nav-btn${activePage === page ? ' active' : ''}`}
          onClick={() => setActivePage(page)}
        >
          {page.charAt(0).toUpperCase() + page.slice(1)}
        </button>
      ))}
    </nav>
  );
}
