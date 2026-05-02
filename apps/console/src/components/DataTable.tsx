// Reusable data table — every CRUD page shares this. Handles loading,
// empty state, search, error, row actions, and pagination uniformly so
// each page only writes its column definitions.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  /** Make this column the searchable text source. */
  searchable?: (row: T) => string;
  className?: string;
}

interface Props<T extends { id: string }> {
  title: string;
  description?: string;
  rows: T[];
  loading: boolean;
  error: string | null;
  columns: Column<T>[];
  onRefresh?: () => void;
  onCreate?: { label: string; onClick: () => void };
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
}

export function DataTable<T extends { id: string }>({
  title, description, rows, loading, error, columns,
  onRefresh, onCreate, onRowClick, emptyMessage, searchPlaceholder = 'Search…',
  pageSize = 25, toolbar,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [search]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => columns.some((c) => c.searchable && c.searchable(r).toLowerCase().includes(q)));
  }, [rows, columns, search]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && <p className="text-slate-400 mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button onClick={onRefresh} className="btn-ghost inline-flex items-center gap-1" title="Refresh">
              <RefreshCw size={14} /> Refresh
            </button>
          )}
          {onCreate && (
            <button onClick={onCreate.onClick} className="btn-primary inline-flex items-center gap-1">
              <Plus size={14} /> {onCreate.label}
            </button>
          )}
        </div>
      </div>

      <div className="card !p-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[16rem]">
          <Search size={14} className="absolute left-3 top-3 text-slate-500" />
          <input
            className="input pl-9"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {toolbar}
      </div>

      {error && (
        <div className="card border-red-500/30 bg-red-500/10 text-red-200">
          <p className="font-medium">Cannot load</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-slate-500 text-sm text-center">Loading…</div>
        ) : pageRows.length === 0 ? (
          <div className="p-12 text-slate-500 text-sm text-center">{emptyMessage ?? 'Nothing to show.'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-800">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`text-left px-4 py-3 text-xs uppercase tracking-wider text-slate-400 ${c.className ?? ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-800 last:border-0 ${onRowClick ? 'hover:bg-slate-900/50 cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{filtered.length} row{filtered.length === 1 ? '' : 's'}{search ? ` (filtered)` : ''}</span>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost !py-1 !px-2 disabled:opacity-50"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span>page {page + 1} / {pageCount}</span>
            <button
              className="btn-ghost !py-1 !px-2 disabled:opacity-50"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
