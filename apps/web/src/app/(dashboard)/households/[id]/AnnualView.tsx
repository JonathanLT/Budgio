'use client';

import { formatCurrency, MONTHS_FR } from '@/lib/utils';

interface MonthRow {
  year: number;
  month: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

interface AnnualData {
  year: number;
  openingBalance: number;
  months: MonthRow[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

interface Props {
  data: AnnualData;
  onSelectMonth: (year: number, month: number) => void;
}

export function AnnualView({ data, onSelectMonth }: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="space-y-4">
      {/* Opening balance */}
      <div className="bg-theme-bg border border-theme-border rounded-xl px-5 py-3 flex items-center justify-between">
        <span className="text-sm text-theme-muted">Solde au 1er janvier {data.year}</span>
        <span className={`font-semibold ${data.openingBalance >= 0 ? 'text-theme-text' : 'text-red-500'}`}>
          {data.openingBalance >= 0 ? '+' : ''}{formatCurrency(data.openingBalance)}
        </span>
      </div>

      {/* Monthly table */}
      <div className="bg-theme-surface rounded-xl border border-theme-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-theme-border text-xs text-theme-muted uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Mois</th>
              <th className="text-right px-4 py-3 font-medium">Entrées</th>
              <th className="text-right px-4 py-3 font-medium">Sorties</th>
              <th className="text-right px-5 py-3 font-medium">Solde fin de mois</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border">
            {data.months.map((row) => {
              const isFuture = data.year > currentYear || (data.year === currentYear && row.month > currentMonth);
              const isCurrent = data.year === currentYear && row.month === currentMonth;
              const hasData = row.totalIn !== 0 || row.totalOut !== 0;

              return (
                <tr
                  key={row.month}
                  onClick={() => !isFuture && onSelectMonth(row.year, row.month)}
                  className={`transition-colors ${
                    isFuture
                      ? 'opacity-35 cursor-default'
                      : 'cursor-pointer hover:bg-theme-bg'
                  } ${isCurrent ? 'bg-brand-50 dark:bg-brand-600/10' : ''}`}
                >
                  <td className="px-5 py-3 font-medium text-theme-text">
                    <span className={isCurrent ? 'text-brand-600 font-semibold' : ''}>
                      {MONTHS_FR[row.month - 1]}
                    </span>
                    {isCurrent && (
                      <span className="ml-2 text-xs text-brand-500 font-normal">← maintenant</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {hasData || !isFuture ? (
                      <span className={row.totalIn > 0 ? 'text-green-600 font-medium' : 'text-theme-muted'}>
                        {row.totalIn > 0 ? `+${formatCurrency(row.totalIn)}` : '—'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {hasData || !isFuture ? (
                      <span className={row.totalOut < 0 ? 'text-red-500 font-medium' : 'text-theme-muted'}>
                        {row.totalOut < 0 ? formatCurrency(row.totalOut) : '—'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={`font-semibold ${
                      row.closingBalance >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-500'
                    }`}>
                      {row.closingBalance >= 0 ? '+' : ''}{formatCurrency(row.closingBalance)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-theme-border bg-theme-bg text-sm font-semibold">
              <td className="px-5 py-3 text-theme-text">Total {data.year}</td>
              <td className="px-4 py-3 text-right tabular-nums text-green-600">
                {data.totalIn > 0 ? `+${formatCurrency(data.totalIn)}` : '—'}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-red-500">
                {data.totalOut < 0 ? formatCurrency(data.totalOut) : '—'}
              </td>
              <td className="px-5 py-3 text-right tabular-nums">
                <span className={data.closingBalance >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-red-500'}>
                  {data.closingBalance >= 0 ? '+' : ''}{formatCurrency(data.closingBalance)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
