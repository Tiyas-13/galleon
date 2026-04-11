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

// Build a rich financial summary across all available data
export function buildSummary(state) {
  const now = new Date();
  const cur = state.currency;

  // Helper: month label
  const monthLabel = (d) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Build per-month summaries for last 3 months
  const monthSummaries = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const txns = state.transactions.filter(t => {
      const td = new Date(t.date + 'T12:00:00');
      return td.getMonth() === m && td.getFullYear() === y;
    });
    const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const bycat = {};
    txns.filter(t => t.type === 'expense').forEach(t => {
      bycat[t.cat || 'Other'] = (bycat[t.cat || 'Other'] || 0) + t.amount;
    });
    const topCats = Object.entries(bycat).sort((a,b) => b[1]-a[1]).slice(0,5)
      .map(([k,v]) => `${k} ${cur}${v.toFixed(2)}`).join(', ');
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    monthSummaries.push(
      `${monthLabel(d)}: income ${cur}${income.toFixed(2)}, expenses ${cur}${expenses.toFixed(2)}, net ${cur}${(income-expenses).toFixed(2)}, savings rate ${savingsRate}%, top categories: ${topCats || 'none'}`
    );
  }

  // Current month budget status
  const currentMonth = now.getMonth(), currentYear = now.getFullYear();
  const currentTxns = state.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const currentBycat = {};
  currentTxns.filter(t => t.type === 'expense').forEach(t => {
    currentBycat[t.cat || 'Other'] = (currentBycat[t.cat || 'Other'] || 0) + t.amount;
  });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth = now.getDate();

  const lines = [
    `Today: ${now.toISOString().split('T')[0]} (day ${dayOfMonth} of ${daysInMonth})`,
    `Currency: ${cur}`,
    `Accounts: ${state.accounts.map(a => `${a.name} (${a.type}): ${cur}${a.balance.toFixed(2)}`).join(', ')}`,
    `Net worth: ${cur}${state.accounts.reduce((s, a) => s + a.balance, 0).toFixed(2)}`,
    ``,
    `--- Monthly summaries (most recent first) ---`,
    ...monthSummaries,
    ``,
    `--- Budget status (${monthLabel(now)}) ---`,
    ...state.budgetGroups.map(g => {
      const spent = g.categoryIds.reduce((s, id) => s + (currentBycat[id] || 0), 0);
      const pct = g.target > 0 ? Math.round((spent / g.target) * 100) : 0;
      const projected = dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * daysInMonth) : 0;
      return `${g.name}: ${cur}${spent.toFixed(2)} of ${cur}${g.target.toFixed(2)} (${pct}%, projected end-of-month: ${cur}${projected})`;
    }),
    ``,
    `--- Recent transactions (last 15) ---`,
    [...state.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0,15)
      .map(t => `${t.date} | ${t.type} | ${t.desc} | ${cur}${t.amount} | ${t.cat || ''}`).join('\n'),
  ];

  return lines.join('\n');
}
