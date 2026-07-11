import { ReactNode } from 'react';

interface DataTableProps {
  headers: string[];
  rows: Array<ReactNode[]>;
  ariaLabel?: string;
}

export default function DataTable({ headers, rows, ariaLabel }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white px-3 font-serif">
      <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label={ariaLabel || 'Data table'}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold tracking-tight text-slate-700">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-slate-700 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
