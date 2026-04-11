'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { DEFAULT_WIDGETS } from '@/context/AppContext';
import IncomeVsExpenses   from './widgets/IncomeVsExpenses';
import ExpensesByCategory from './widgets/ExpensesByCategory';
import BudgetOverview     from './widgets/BudgetOverview';
import AccountBalances    from './widgets/AccountBalances';
import TopSpending        from './widgets/TopSpending';
import MonthComparison    from './widgets/MonthComparison';
import TopCategories      from './widgets/TopCategories';

// Load grid only on client — it needs browser APIs
const WidgetGrid = dynamic(() => import('./WidgetGrid'), { ssr: false });

const WIDGET_CATALOG = [
  { type: 'incomeVsExpenses',   label: 'Income vs Expenses',   desc: 'Income, spending and savings rate' },
  { type: 'expensesByCategory', label: 'Expenses by Category', desc: 'Bar chart of spending per category' },
  { type: 'budgetOverview',     label: 'Budget Overview',      desc: 'Progress bars for all your budgets' },
  { type: 'accountBalances',    label: 'Account Balances',     desc: 'Balances and net worth' },
  { type: 'topSpending',        label: 'Top Transactions',     desc: 'Biggest expenses this period' },
  { type: 'monthComparison',    label: 'Month Comparison',     desc: 'This month vs last month spending' },
  { type: 'topCategories',      label: 'Top Categories',       desc: 'Biggest spending categories with % breakdown' },
];

export const WIDGET_COMPONENTS = {
  incomeVsExpenses:   IncomeVsExpenses,
  expensesByCategory: ExpensesByCategory,
  budgetOverview:     BudgetOverview,
  accountBalances:    AccountBalances,
  topSpending:        TopSpending,
  monthComparison:    MonthComparison,
  topCategories:      TopCategories,
};

const PERIODS = [
  { key: 'month', label: 'This month' },
  { key: 'year',  label: 'This year'  },
  { key: 'all',   label: 'All time'   },
];

export default function OverviewPage() {
  const { state, saveSettings } = useApp();
  const [showPicker, setShowPicker] = useState(false);
  const [period,     setPeriod]     = useState('month');
  const widgets = state.widgets ?? DEFAULT_WIDGETS;

  function addWidget(type) {
    if (widgets.find(w => w.type === type)) return;
    const sizes = { incomeVsExpenses: [6,6], expensesByCategory: [6,8], budgetOverview: [6,8], accountBalances: [6,6], topSpending: [6,8], monthComparison: [6,6], topCategories: [6,8] };
    const [w, h] = sizes[type] ?? [6, 6];
    saveSettings({ widgets: [...widgets, { i: type + '-' + Date.now(), type, x: 0, y: Infinity, w, h }] });
    setShowPicker(false);
  }

  function removeWidget(id) {
    saveSettings({ widgets: widgets.filter(w => w.i !== id) });
  }

  function onLayoutChange(layout) {
    const updated = widgets.map(w => {
      const l = layout.find(l => l.i === w.i);
      return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
    });
    saveSettings({ widgets: updated });
  }

  const activeTypes = new Set(widgets.map(w => w.type));

  return (
    <div className="page page-wide">
      <div className="section-header">
        <div className="section-title">Overview</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="period-tabs" style={{ marginBottom: 0 }}>
            {PERIODS.map(p => (
              <button key={p.key} className={`period-tab${period === p.key ? ' active' : ''}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
            ))}
          </div>
          <button className="btn primary" onClick={() => setShowPicker(true)}>+ Add widget</button>
        </div>
      </div>

      <WidgetGrid
        widgets={widgets}
        period={period}
        onLayoutChange={onLayoutChange}
        onRemove={removeWidget}
      />

      {showPicker && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPicker(false)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-title">Add widget</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {WIDGET_CATALOG.map(c => {
                const added = activeTypes.has(c.type);
                return (
                  <button key={c.type} className={`widget-picker-item${added ? ' added' : ''}`} onClick={() => !added && addWidget(c.type)} disabled={added}>
                    <div className="widget-picker-label">{c.label}</div>
                    <div className="widget-picker-desc">{c.desc}</div>
                    {added && <span className="widget-picker-badge">Added</span>}
                  </button>
                );
              })}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowPicker(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
