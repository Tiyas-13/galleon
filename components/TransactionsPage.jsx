'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';
import AddTransactionModal from './AddTransactionModal';

export default function TransactionsPage() {
  const { state, deleteTransaction } = useApp();
  const fmt = useFmt();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [filterAcct, setFilterAcct] = useState('');

  const acctMap = Object.fromEntries(state.accounts.map(a => [a.id, a.name]));

  let txns = [...state.transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );
  if (filterType) txns = txns.filter(t => t.type === filterType);
  if (filterCat)  txns = txns.filter(t => t.cat === filterCat);
  if (filterAcct) txns = txns.filter(t => t.from === filterAcct || t.to === filterAcct);

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return;
    deleteTransaction(id);
  }

  return (
    <div className="page">
      <div className="section-header">
        <div className="section-title">Transactions</div>
        <button className="btn primary" onClick={() => setShowModal(true)}>+ Add transaction</button>
      </div>

      <div className="filter-row">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterAcct} onChange={e => setFilterAcct(e.target.value)}>
          <option value="">All accounts</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="txn-list">
        {txns.length === 0 ? (
          <div className="empty-state">No transactions yet.</div>
        ) : (
          txns.map(t => (
            <TransactionItem
              key={t.id}
              txn={t}
              acctMap={acctMap}
              fmt={fmt}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function TransactionItem({ txn, acctMap, fmt, onDelete }) {
  const sign = txn.type === 'expense' ? '−' : txn.type === 'income' ? '+' : '';
  const meta = txn.type === 'transfer'
    ? `${acctMap[txn.from] ?? '?'} → ${acctMap[txn.to] ?? '?'} · ${txn.date}`
    : `${txn.cat} · ${acctMap[txn.from] ?? '?'} · ${txn.date}`;

  return (
    <div className={`txn-item ${txn.type}`}>
      <div className={`txn-dot ${txn.type}`} />
      <div className="txn-info">
        <div className="txn-name">{txn.desc}</div>
        <div className="txn-meta">{meta}{txn.notes ? ` · ${txn.notes}` : ''}</div>
      </div>
      <div className={`txn-amount ${txn.type}`}>{sign}{fmt(txn.amount)}</div>
      <button className="txn-del" onClick={() => onDelete(txn.id)}>&times;</button>
    </div>
  );
}
