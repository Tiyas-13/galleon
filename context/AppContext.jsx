'use client';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  doc, getDoc, setDoc,
  collection, getDocs, deleteDoc,
} from 'firebase/firestore';

const AppContext = createContext(null);

export const DEFAULT_CATEGORIES = [
  'Food & Dining','Transport','Shopping','Housing','Health',
  'Entertainment','Travel','Education','Salary','Freelance','Savings','Other',
];

const DEFAULT_STATE = {
  accounts: [], transactions: [], budgetGroups: [],
  categories: [...DEFAULT_CATEGORIES],
  currency: '£', vaultNumber: '', setupDone: false, loaded: false,
};

const DEMO_STATE = {
  currency: '£', setupDone: true, loaded: true,
  categories: [...DEFAULT_CATEGORIES],
  accounts: [
    { id: 'a1', name: 'Barclays Current', type: 'checking',  balance: 2430.50 },
    { id: 'a2', name: 'ISA Savings',      type: 'savings',   balance: 8750.00 },
    { id: 'a3', name: 'Cash',             type: 'cash',      balance: 45.00   },
  ],
  transactions: [
    { id: 't1',  type: 'income',   desc: 'Monthly salary',    amount: 3200,  date: '2026-04-01', cat: 'Salary',        from: 'a1', to: null, notes: '' },
    { id: 't2',  type: 'expense',  desc: 'Tesco grocery run', amount: 67.40, date: '2026-04-02', cat: 'Food & Dining', from: 'a1', to: null, notes: '' },
    { id: 't3',  type: 'expense',  desc: 'TfL monthly pass',  amount: 89.50, date: '2026-04-02', cat: 'Transport',     from: 'a1', to: null, notes: '' },
    { id: 't4',  type: 'expense',  desc: 'Rent',              amount: 1100,  date: '2026-04-01', cat: 'Housing',       from: 'a1', to: null, notes: '' },
    { id: 't5',  type: 'transfer', desc: 'Savings top-up',    amount: 300,   date: '2026-04-01', cat: 'Savings',       from: 'a1', to: 'a2', notes: '' },
    { id: 't6',  type: 'expense',  desc: 'Dinner at Dishoom', amount: 54.00, date: '2026-03-28', cat: 'Food & Dining', from: 'a1', to: null, notes: 'With friends' },
    { id: 't7',  type: 'expense',  desc: 'Cinema tickets',    amount: 28.00, date: '2026-03-26', cat: 'Entertainment', from: 'a3', to: null, notes: '' },
    { id: 't8',  type: 'expense',  desc: 'Amazon — books',    amount: 32.99, date: '2026-03-25', cat: 'Shopping',      from: 'a1', to: null, notes: '' },
    { id: 't9',  type: 'income',   desc: 'Freelance project', amount: 850,   date: '2026-03-20', cat: 'Freelance',     from: 'a1', to: null, notes: 'Website redesign' },
    { id: 't10', type: 'expense',  desc: 'GP prescription',   amount: 9.90,  date: '2026-03-18', cat: 'Health',        from: 'a3', to: null, notes: '' },
    { id: 't11', type: 'expense',  desc: 'Spotify',           amount: 10.99, date: '2026-04-03', cat: 'Entertainment', from: 'a1', to: null, notes: '' },
    { id: 't12', type: 'expense',  desc: 'Eurostar — Paris',  amount: 184,   date: '2026-03-10', cat: 'Travel',        from: 'a1', to: null, notes: 'Easter trip' },
    { id: 't13', type: 'expense',  desc: 'Pret a Manger',     amount: 23.50, date: '2026-04-04', cat: 'Food & Dining', from: 'a3', to: null, notes: '' },
    { id: 't14', type: 'expense',  desc: 'Nike trainers',     amount: 110,   date: '2026-04-05', cat: 'Shopping',      from: 'a1', to: null, notes: '' },
  ],
  budgetGroups: [
    { id: 'bg1', name: 'Essentials', target: 1400, categoryIds: ['Housing', 'Food & Dining', 'Transport'] },
    { id: 'bg2', name: 'Lifestyle',  target: 150,  categoryIds: ['Entertainment', 'Shopping'] },
    { id: 'bg3', name: 'Savings',    target: 300,  categoryIds: ['Savings'] },
  ],
};

export function AppProvider({ uid, demo = false, children }) {
  const [state, setState] = useState(demo ? DEMO_STATE : DEFAULT_STATE);
  const [saved, setSaved] = useState(false);
  const savedTimer        = useRef(null);

  const settingsRef = !demo ? doc(db, 'users', uid, 'data', 'settings') : null;
  const txnsCol     = !demo ? collection(db, 'users', uid, 'transactions') : null;
  const txnRef      = id => !demo ? doc(db, 'users', uid, 'transactions', id) : null;

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (demo) return;
    async function load() {
      const [settingsSnap, txnsSnap] = await Promise.all([
        getDoc(settingsRef),
        getDocs(txnsCol),
      ]);
      const s = settingsSnap.exists() ? settingsSnap.data() : {};
      const transactions = [];
      txnsSnap.forEach(d => transactions.push({ id: d.id, ...d.data() }));
      setState({
        accounts:     s.accounts     ?? [],
        categories:   s.categories   ?? [...DEFAULT_CATEGORIES],
        currency:     s.currency     ?? '£',
        vaultNumber:  s.vaultNumber  ?? '',
        setupDone:    s.setupDone    ?? false,
        budgetGroups: s.budgetGroups ?? [],
        transactions,
        loaded: true,
      });
    }
    load();
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save indicator ────────────────────────────────────────────────────────
  function showSaved() {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function applyBalances(accounts, txn, reverse = false) {
    const sign = reverse ? -1 : 1;
    return accounts.map(a => {
      const b = { ...a };
      if (txn.type === 'expense'  && b.id === txn.from) b.balance -= sign * txn.amount;
      if (txn.type === 'income'   && b.id === txn.from) b.balance += sign * txn.amount;
      if (txn.type === 'transfer' && b.id === txn.from) b.balance -= sign * txn.amount;
      if (txn.type === 'transfer' && b.id === txn.to)   b.balance += sign * txn.amount;
      return b;
    });
  }

  async function writeSettings(next) {
    if (demo) { showSaved(); return; }
    await setDoc(settingsRef, {
      accounts:     next.accounts,
      categories:   next.categories,
      currency:     next.currency,
      vaultNumber:  next.vaultNumber,
      setupDone:    next.setupDone,
      budgetGroups: next.budgetGroups,
    });
    showSaved();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  async function saveSettings(updates) {
    setState(prev => {
      const next = { ...prev, ...updates };
      writeSettings(next);
      return next;
    });
  }

  async function addTransaction(txnData) {
    const txn = { id: 't' + Date.now(), ...txnData };
    setState(prev => {
      const accounts = applyBalances(prev.accounts, txn);
      if (!demo) { const { id, ...data } = txn; setDoc(txnRef(id), data); }
      writeSettings({ ...prev, accounts });
      return { ...prev, transactions: [...prev.transactions, txn], accounts };
    });
  }

  async function updateTransaction(id, newData) {
    setState(prev => {
      const old = prev.transactions.find(t => t.id === id);
      if (!old) return prev;
      let accounts = applyBalances(prev.accounts, old, true); // reverse old
      const updated = { id, ...newData };
      accounts = applyBalances(accounts, updated);            // apply new
      const transactions = prev.transactions.map(t => t.id === id ? updated : t);
      if (!demo) { const { id: tid, ...data } = updated; setDoc(txnRef(tid), data); }
      writeSettings({ ...prev, accounts });
      return { ...prev, transactions, accounts };
    });
  }

  async function deleteTransaction(id) {
    setState(prev => {
      const txn = prev.transactions.find(t => t.id === id);
      if (!txn) return prev;
      const accounts = applyBalances(prev.accounts, txn, true);
      if (!demo) deleteDoc(txnRef(id));
      writeSettings({ ...prev, accounts });
      return { ...prev, transactions: prev.transactions.filter(t => t.id !== id), accounts };
    });
  }

  async function resetAll() {
    const txnsSnap = await getDocs(txnsCol);
    await Promise.all(txnsSnap.docs.map(d => deleteDoc(d.ref)));
    const fresh = {
      accounts: [], categories: [...DEFAULT_CATEGORIES],
      currency: '£', setupDone: false, budgetGroups: [],
    };
    await setDoc(settingsRef, fresh);
    setState({ ...DEFAULT_STATE, ...fresh, loaded: true });
  }

  return (
    <AppContext.Provider value={{ state, saved, saveSettings, addTransaction, updateTransaction, deleteTransaction, resetAll }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() { return useContext(AppContext); }

export function useFmt() {
  const { state } = useApp();
  return n => state.currency + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
