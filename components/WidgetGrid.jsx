'use client';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';

const ResponsiveGridLayout = WidthProvider(Responsive);
import { WIDGET_COMPONENTS } from './OverviewPage';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const LABELS = {
  incomeVsExpenses:   'Income vs Expenses',
  expensesByCategory: 'Expenses by Category',
  budgetOverview:     'Budget Overview',
  accountBalances:    'Account Balances',
  topSpending:        'Top Transactions',
  monthComparison:    'Month Comparison',
  topCategories:      'Top Categories',
};

export default function WidgetGrid({ widgets, period, onLayoutChange, onRemove }) {
  const layouts = {
    lg: widgets.map(w => ({ i: w.i, x: w.x, y: w.y, w: w.w, h: w.h, minW: 3, minH: 4 })),
  };

  return (
    <ResponsiveGridLayout
      className="widget-grid"
      layouts={layouts}
      breakpoints={{ lg: 600, sm: 0 }}
      cols={{ lg: 12, sm: 1 }}
      rowHeight={48}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={onLayoutChange}
      margin={[12, 12]}
    >
      {widgets.map(w => {
        const Component = WIDGET_COMPONENTS[w.type];
        if (!Component) return null;
        return (
          <div key={w.i} className="widget-card">
            <div className="widget-header">
              <div className="widget-drag-handle">
                <span className="widget-drag-icon">⠿</span>
                <span className="widget-title">{LABELS[w.type] ?? w.type}</span>
              </div>
              <button className="widget-close" onClick={() => onRemove(w.i)} title="Remove">&times;</button>
            </div>
            <Component period={period} />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}
