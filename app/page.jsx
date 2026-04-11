'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppProvider, useApp } from '@/context/AppContext';
import LoginPage from '@/components/LoginPage';
import SetupWizard from '@/components/SetupWizard';
import Nav from '@/components/Nav';
import Embers from '@/components/Embers';
import TransactionsPage from '@/components/TransactionsPage';
import OverviewPage from '@/components/OverviewPage';
import BudgetPage from '@/components/BudgetPage';
import AccountsPage from '@/components/AccountsPage';
import SettingsPage from '@/components/SettingsPage';
import HomePage from '@/components/HomePage';
import AiPanel from '@/components/AiPanel';

export default function Home() {
  const [authUser, setAuthUser] = useState(undefined);
  const [demo, setDemo]         = useState(false);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  if (demo) return (
    <AppProvider uid="demo" demo>
      <AppShell />
    </AppProvider>
  );

  if (authUser === undefined) return <div className="loading-screen">Galleon</div>;
  if (!authUser)              return <LoginPage onDemo={() => setDemo(true)} />;

  return (
    <AppProvider uid={authUser.uid}>
      <AppShell />
    </AppProvider>
  );
}

const PAGES = {
  home:         HomePage,
  transactions: TransactionsPage,
  overview:     OverviewPage,
  budget:       BudgetPage,
  accounts:     AccountsPage,
  settings:     SettingsPage,
};

function AppShell() {
  const { state, saved } = useApp();
  const [activePage, setActivePage] = useState('home');

  if (!state.loaded)    return <div className="loading-screen">Galleon</div>;
  if (!state.setupDone) return <SetupWizard />;

  const PageComponent = PAGES[activePage];

  return (
    <>
      <Embers />
      <Nav activePage={activePage} setActivePage={setActivePage} />
      <main>
        <PageComponent setActivePage={setActivePage} />
      </main>
      {saved && <div className="saved-toast">Saved</div>}
      <AiPanel />
    </>
  );
}
