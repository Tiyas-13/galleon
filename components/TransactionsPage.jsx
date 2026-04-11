'use client';
import { useState } from 'react';
import { useApp, useFmt } from '@/context/AppContext';
import AddTransactionModal from './AddTransactionModal';

export default function TransactionsPage() {
  const { state, deleteTransaction } = useApp();
  const fmt = useFmt();
  const [showModal,  setShowModal]  = useState(false);
  const [editTxn,    setEditTxn]    = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [filterAcct, setFilterAcct] = useState('');

  function setFilter(fn) {
    fn();
    setPage(1);
  }
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const acctMap = Object.fromEntries(state.accounts.map(a => [a.id, a.name]));

  let txns = [...state.transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );
  if (filterType) txns = txns.filter(t => t.type === filterType);
  if (filterCat)  txns = txns.filter(t => t.cat === filterCat);
  if (filterAcct) txns = txns.filter(t => t.from === filterAcct || t.to === filterAcct);

  const totalCount = txns.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paged = txns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
        <select value={filterType} onChange={e => setFilter(() => setFilterType(e.target.value))}>
          <option value="">All types</option>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
          <option value="transfer">Transfer</option>
        </select>
        <select value={filterCat} onChange={e => setFilter(() => setFilterCat(e.target.value))}>
          <option value="">All categories</option>
          {[...state.categories].sort((a,b) => a.localeCompare(b)).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterAcct} onChange={e => setFilter(() => setFilterAcct(e.target.value))}>
          <option value="">All accounts</option>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="txn-list">
        {totalCount === 0 ? (
          <div className="empty-state">No transactions yet.</div>
        ) : (
          paged.map(t => (
            <TransactionItem
              key={t.id}
              txn={t}
              acctMap={acctMap}
              fmt={fmt}
              onEdit={() => setEditTxn(t)}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
          <span className="pagination-info">{page} / {totalPages} &nbsp;·&nbsp; {totalCount} transactions</span>
          <button className="btn sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next →</button>
        </div>
      )}

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
      {editTxn   && <AddTransactionModal initialData={editTxn} onClose={() => setEditTxn(null)} />}
    </div>
  );
}

function TransactionItem({ txn, acctMap, fmt, onEdit, onDelete }) {
  const sign = txn.type === 'expense' ? '−' : txn.type === 'income' ? '+' : '';
  const meta = txn.type === 'transfer'
    ? `${acctMap[txn.from] ?? '?'} → ${acctMap[txn.to] ?? '?'} · ${txn.date}`
    : `${txn.cat} · ${acctMap[txn.from] ?? '?'} · ${txn.date}`;

  return (
    <div className={`txn-item ${txn.type}`} onClick={onEdit} style={{ cursor: 'pointer' }}>
      <div className={`txn-dot ${txn.type}`} />
      <div className="txn-info">
        <div className="txn-name">{txn.desc}</div>
        <div className="txn-meta">{meta}{txn.notes ? ` · ${txn.notes}` : ''}</div>
      </div>
      <div className={`txn-amount ${txn.type}`}>{sign}{fmt(txn.amount)}</div>
      <button className="txn-del" onClick={e => { e.stopPropagation(); onDelete(txn.id); }}>&times;</button>
    </div>
  );
}
