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
    txns.forEach(t => {
      if (t.type === 'income') return;
      if (t.type === 'transfer' && !t.cat) return;
      const delta = t.type === 'transfer'
        ? (t.reversal ? -t.amount : t.amount)
        : t.amount;
      bycat[t.cat || 'Other'] = (bycat[t.cat || 'Other'] || 0) + delta;
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
  // Mirror BudgetPage calcMonthlySpend:
  // - skip income
  // - skip uncategorised transfers
  // - categorised transfers count with reversal support (reversal = subtract, e.g. withdrawing savings)
  const currentBycat = {};
  currentTxns.forEach(t => {
    if (t.type === 'income') return;
    if (t.type === 'transfer' && !t.cat) return;
    const delta = t.type === 'transfer'
      ? (t.reversal ? -t.amount : t.amount)
      : t.amount;
    const key = t.cat || 'Other';
    currentBycat[key] = (currentBycat[key] || 0) + delta;
  });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth = now.getDate();

  // Current month income breakdown by category
  const currentIncomeTxns = currentTxns.filter(t => t.type === 'income');
  const currentIncomeTotal = currentIncomeTxns.reduce((s, t) => s + t.amount, 0);
  const currentIncomeBycat = {};
  currentIncomeTxns.forEach(t => {
    const key = t.cat || 'Other';
    currentIncomeBycat[key] = (currentIncomeBycat[key] || 0) + t.amount;
  });
  const incomeBycatStr = Object.entries(currentIncomeBycat)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${cur}${v.toFixed(2)}`)
    .join(', ') || 'none';

  // Current month totals — kept separate so net is not distorted by transfers
  const currentExpenseTotal = currentTxns
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const currentTransferTotal = currentTxns
    .filter(t => t.type === 'transfer' && t.cat && !t.reversal)
    .reduce((s, t) => s + t.amount, 0);
  const currentSpendTotal = Object.values(currentBycat).reduce((s, v) => s + v, 0);

  const lines = [
    `Today: ${now.toISOString().split('T')[0]} (day ${dayOfMonth} of ${daysInMonth})`,
    `Currency: ${cur}`,
    `Accounts: ${state.accounts.map(a => `${a.name} (${a.type}): ${cur}${a.balance.toFixed(2)}`).join(', ')}`,
    `Net worth: ${cur}${state.accounts.reduce((s, a) => s + a.balance, 0).toFixed(2)}`,
    ``,
    `--- Monthly summaries (most recent first) ---`,
    `Note: use these for understanding typical income and spending patterns — do not project current-month figures linearly, as salary and lump-sum transfers skew day-rate estimates.`,
    ...monthSummaries,
    ``,
    `--- ${monthLabel(now)}: income so far (day ${dayOfMonth} of ${daysInMonth}) ---`,
    `Total income received: ${cur}${currentIncomeTotal.toFixed(2)}`,
    `By category: ${incomeBycatStr}`,
    ``,
    `--- ${monthLabel(now)}: spending so far ---`,
    `Expenses (money actually spent): ${cur}${currentExpenseTotal.toFixed(2)}`,
    `Savings/transfers (still your money, moved between accounts): ${cur}${currentTransferTotal.toFixed(2)}`,
    `Net income minus expenses: ${cur}${(currentIncomeTotal - currentExpenseTotal).toFixed(2)}`,
    `Note: transfers between accounts do not reduce net worth — do not subtract them from income when assessing financial health.`,
    ``,
    `--- Budget status (${monthLabel(now)}) ---`,
    `Note: figures show actual spending to date — do not multiply up to project end-of-month totals.`,
    ...state.budgetGroups.map(g => {
      const spent = g.categoryIds.reduce((s, id) => s + (currentBycat[id] || 0), 0);
      const pct = g.target > 0 ? Math.round((spent / g.target) * 100) : 0;
      if (g.isSavings) {
        return `${g.name}: ${cur}${spent.toFixed(2)} saved of ${cur}${g.target.toFixed(2)} goal (${pct}% of goal) [SAVINGS GROUP — exceeding this target is positive, never flag as overspending]`;
      }
      return `${g.name}: ${cur}${spent.toFixed(2)} of ${cur}${g.target.toFixed(2)} (${pct}% used) [SPENDING budget]`;
    }),
    ``,
    `--- Recent transactions (last 20) ---`,
    [...state.transactions].sort((a,b) => b.date.localeCompare(a.date)).slice(0,20)
      .map(t => `${t.date} | ${t.type} | ${t.desc} | ${cur}${t.amount} | ${t.cat || ''}`).join('\n'),
  ];

  return lines.join('\n');
}
