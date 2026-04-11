import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from './firebase';

const DAILY_LIMIT = 30;

// Check + increment rate limit. Returns true if allowed.
export async function checkRateLimit(uid) {
  const today = new Date().toISOString().split('T')[0];
  const ref = doc(db, 'users', uid, 'data', 'rateLimit');
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const count = data.date === today ? (data.count ?? 0) : 0;
  if (count >= DAILY_LIMIT) return false;

  await setDoc(ref, { date: today, count: count + 1 });
  return true;
}

// Get Firebase ID token for the current user
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// Build a compact financial summary for the query assistant
export function buildSummary(state) {
  const now = new Date();
  const month = now.getMonth(), year = now.getFullYear();

  const thisMonthTxns = state.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const income   = thisMonthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = thisMonthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  thisMonthTxns.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.cat || 'Other'] = (byCategory[t.cat || 'Other'] || 0) + t.amount;
  });

  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const cur = state.currency;

  const lines = [
    `Currency: ${cur}`,
    `Month: ${monthName}`,
    `Accounts: ${state.accounts.map(a => `${a.name} ${cur}${a.balance.toFixed(2)}`).join(', ')}`,
    `Net worth: ${cur}${state.accounts.reduce((s, a) => s + a.balance, 0).toFixed(2)}`,
    `${monthName} income: ${cur}${income.toFixed(2)}`,
    `${monthName} expenses: ${cur}${expenses.toFixed(2)}`,
    `${monthName} net: ${cur}${(income - expenses).toFixed(2)}`,
    `Spending by category: ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k} ${cur}${v.toFixed(2)}`).join(', ')}`,
    `Budgets: ${state.budgetGroups.map(g => {
      const spent = g.categoryIds.reduce((s, id) => s + (byCategory[id] || 0), 0);
      return `${g.name}: ${cur}${spent.toFixed(2)}/${cur}${g.target.toFixed(2)}`;
    }).join(', ')}`,
    `Recent transactions (last 10): ${[...state.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0,10).map(t => `${t.desc} ${cur}${t.amount} (${t.type}, ${t.date})`).join('; ')}`,
  ];

  return lines.join('\n');
}
