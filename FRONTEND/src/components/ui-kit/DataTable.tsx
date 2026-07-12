import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface ActionMenuItem<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: React.ReactNode;
  className?: string;
}

interface BulkAction<T> {
  label: string;
  onClick: (rows: T[]) => void;
  icon?: React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  actions?: ActionMenuItem<T>[];
  bulkActions?: BulkAction<T>[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCtaLabel?: string;
  onEmptyCtaClick?: () => void;
  searchPlaceholder?: string;
  searchKey?: keyof T;
}

export default function DataTable<T>({
  data,
  columns,
  keyExtractor,
  actions,
  bulkActions,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data matching your criteria.',
  emptyCtaLabel,
  onEmptyCtaClick,
  searchPlaceholder = 'Search...',
  searchKey
}: DataTableProps<T>) {
  // Sort State
  const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Checkbox State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Actions Dropdown state
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Handle Sort
  const handleSort = (key: keyof T | string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Filter & Sort Data
  const filteredSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (searchQuery && searchKey) {
      result = result.filter(row => {
        const value = row[searchKey];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = (a as any)[sortKey];
        const valB = (b as any)[sortKey];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const compare = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base'
        });

        return sortDirection === 'asc' ? compare : -compare;
      });
    }

    return result;
  }, [data, searchQuery, searchKey, sortKey, sortDirection]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredSortedData, currentPage, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSortedData.length / rowsPerPage));

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedData.map(row => keyExtractor(row));
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      const pageIds = paginatedData.map(row => keyExtractor(row));
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const isRowSelected = (rowId: string) => selectedIds.has(rowId);
  const isAllPageRowsSelected = paginatedData.length > 0 && paginatedData.every(row => isRowSelected(keyExtractor(row)));

  const selectedRows = useMemo(() => {
    return data.filter(row => selectedIds.has(keyExtractor(row)));
  }, [data, selectedIds, keyExtractor]);

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Skeleton rows for Loading State
  const skeletonRows = Array.from({ length: Math.min(rowsPerPage, 5) });

  return (
    <div className="bg-white border border-neutral-border rounded-2xl shadow-sm overflow-hidden flex flex-col relative w-full">
      
      {/* Header controls: Search & Info */}
      <div className="p-4 border-b border-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-bg/30">
        {searchKey ? (
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-text-muted" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white"
            />
          </div>
        ) : (
          <div />
        )}

        <div className="text-[11px] font-bold text-neutral-text-muted uppercase tracking-wider">
          Total Items: <span className="text-neutral-text-dark">{filteredSortedData.length}</span>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-x-auto min-h-[250px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-bg/10 border-b border-neutral-border">
              {bulkActions && (
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageRowsSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-neutral-border text-primary-teal focus:ring-primary-teal"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key, col.sortable)}
                  className={`p-4 text-xs font-black text-neutral-text-muted uppercase tracking-wider ${
                    col.sortable ? 'cursor-pointer select-none hover:text-neutral-text-dark' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="p-4 w-16 text-center text-xs font-black text-neutral-text-muted uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-border">
            {loading ? (
              // Loading Skeleton State
              skeletonRows.map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse bg-white">
                  {bulkActions && (
                    <td className="p-4 text-center">
                      <div className="h-4 w-4 bg-neutral-border rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="p-4">
                      <div className="h-4 bg-neutral-border rounded w-3/4" />
                    </td>
                  ))}
                  {actions && (
                    <td className="p-4 text-center">
                      <div className="h-4 bg-neutral-border rounded w-8 mx-auto" />
                    </td>
                  )}
                </tr>
              ))
            ) : error ? (
              // Error State
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0) + (actions ? 1 : 0)} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 bg-red-50 text-red-500 rounded-full border border-red-100">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                    <h4 className="text-sm font-bold text-neutral-text-dark">Failed to load data</h4>
                    <p className="text-xs text-neutral-text-muted max-w-sm leading-relaxed">{error}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="mt-2 text-xs bg-primary-teal text-white font-bold px-4 py-2 rounded-xl hover:bg-primary-teal-dark shadow transition"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0) + (actions ? 1 : 0)} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-neutral-bg border border-neutral-border flex items-center justify-center text-neutral-text-muted text-xl font-bold">
                      ∅
                    </div>
                    <h4 className="text-sm font-bold text-neutral-text-dark">{emptyTitle}</h4>
                    <p className="text-xs text-neutral-text-muted leading-relaxed">{emptyDescription}</p>
                    {emptyCtaLabel && onEmptyCtaClick && (
                      <button
                        onClick={onEmptyCtaClick}
                        className="mt-2 text-xs bg-primary-teal text-white font-bold px-4 py-2 rounded-xl hover:bg-primary-teal-dark shadow transition"
                      >
                        {emptyCtaLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Standard Data Rows
              paginatedData.map((row) => {
                const rowId = keyExtractor(row);
                return (
                  <tr
                    key={rowId}
                    className={`bg-white transition hover:bg-neutral-bg/20 ${
                      isRowSelected(rowId) ? 'bg-primary-teal/5' : ''
                    }`}
                  >
                    {bulkActions && (
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isRowSelected(rowId)}
                          onChange={e => handleSelectRow(rowId, e.target.checked)}
                          className="h-4 w-4 rounded border-neutral-border text-primary-teal focus:ring-primary-teal"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={String(col.key)} className="p-4 text-xs font-semibold text-neutral-text-dark">
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                      </td>
                    ))}
                    {actions && (
                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionId(openActionId === rowId ? null : rowId);
                          }}
                          className="p-1.5 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {/* Actions Menu dropdown */}
                        {openActionId === rowId && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenActionId(null)} />
                            <div className="absolute right-4 mt-1 bg-white border border-neutral-border shadow-lg rounded-xl py-1 z-40 min-w-[140px] text-left">
                              {actions.map((act, aIdx) => (
                                <button
                                  key={aIdx}
                                  onClick={() => {
                                    act.onClick(row);
                                    setOpenActionId(null);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left text-[11px] font-bold hover:bg-neutral-bg flex items-center gap-2 ${
                                    act.className || 'text-neutral-text-dark'
                                  }`}
                                >
                                  {act.icon && <span className="shrink-0">{act.icon}</span>}
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!loading && !error && filteredSortedData.length > 0 && (
        <div className="p-4 border-t border-neutral-border bg-neutral-bg/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-neutral-text-muted">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={e => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-neutral-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white"
            >
              {[5, 10, 25, 50].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Page numbers + quick links */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 border border-neutral-border rounded-lg bg-white text-neutral-text-muted hover:text-neutral-text-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-neutral-border rounded-lg bg-white text-neutral-text-muted hover:text-neutral-text-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Displaying page numbers dynamically */}
            <span className="text-xs font-bold text-neutral-text-muted px-2 select-none">
              Page <span className="text-neutral-text-dark">{currentPage}</span> of <span className="text-neutral-text-dark">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-neutral-border rounded-lg bg-white text-neutral-text-muted hover:text-neutral-text-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-neutral-border rounded-lg bg-white text-neutral-text-muted hover:text-neutral-text-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Checkbox Floating Bulk Actions Bar */}
      <AnimatePresence>
        {bulkActions && selectedRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-text-dark text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 z-40 border border-neutral-border/30 max-w-full w-[90%] sm:w-auto"
            id="floating-bulk-actions-bar"
          >
            <span className="text-xs font-bold select-none text-neutral-border shrink-0">
              {selectedRows.length} selected
            </span>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              {bulkActions.map((act, bIdx) => (
                <button
                  key={bIdx}
                  onClick={() => {
                    act.onClick(selectedRows);
                    clearSelection();
                  }}
                  className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
                    act.className || 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  {act.icon && <span className="shrink-0">{act.icon}</span>}
                  {act.label}
                </button>
              ))}
              <button
                onClick={clearSelection}
                className="text-[10px] font-bold text-white/50 hover:text-white px-2.5 py-1.5 rounded-lg shrink-0"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
