import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ScreenerRow } from "@/lib/market/types";
import { EM_DASH, formatPct, formatPrice, formatRatio, formatTurnover, formatVolume } from "@/lib/market/format";
import {
  defaultScreenerVisibility,
  parseScreenerVisibility,
  PINNED_COLUMN,
  SCREENER_COLS_KEY,
  SCREENER_COLUMN_IDS,
  serializeScreenerVisibility,
} from "@/lib/market/screener-columns";
import { SignedChange } from "@/components/common/signed-value";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export function ScreenerTable({ rows }: { rows: ScreenerRow[] }) {
  const { t, companyName, sectorLabel, locale } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([{ id: "changePct", desc: true }]);
  const [visibility, setVisibility] = useState<VisibilityState>(defaultScreenerVisibility);
  const [hydrated, setHydrated] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setVisibility(parseScreenerVisibility(localStorage.getItem(SCREENER_COLS_KEY)));
    } catch {
      /* private mode */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SCREENER_COLS_KEY, serializeScreenerVisibility(visibility));
    } catch {
      /* private mode */
    }
  }, [visibility, hydrated]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const columns = useMemo<ColumnDef<ScreenerRow>[]>(() => {
    const colHeader = (id: string) => t(`screener.col.${id}` as MessageKey);
    const numeric = (content: ReactNode) => <span className="block text-right tabular">{content}</span>;
    return [
      {
        accessorKey: "symbol",
        header: colHeader("symbol"),
        enableHiding: false,
        cell: ({ row }) => (
          <Link
            to="/stock/$symbol"
            params={{ symbol: row.original.symbol }}
            className="font-medium hover:text-accent"
          >
            {row.original.symbol}
            {row.original.vn30 ? (
              <span className="ml-1 text-[10px] uppercase text-fg-subtle">VN30</span>
            ) : null}
          </Link>
        ),
      },
      {
        accessorKey: "name",
        header: colHeader("name"),
        cell: ({ row }) => (
          <span className="is-clip block text-fg-muted">{companyName(row.original)}</span>
        ),
      },
      {
        accessorKey: "price",
        header: colHeader("price"),
        cell: ({ getValue }) => numeric(formatPrice(getValue<number | null>(), locale)),
      },
      {
        accessorKey: "changePct",
        header: colHeader("changePct"),
        cell: ({ row }) => (
          <span className="flex justify-end">
            <SignedChange pct={row.original.changePct} />
          </span>
        ),
      },
      {
        accessorKey: "volume",
        header: colHeader("volume"),
        cell: ({ getValue }) => numeric(
          <span className="text-fg-muted">{formatVolume(getValue<number | null>(), locale)}</span>,
        ),
      },
      {
        accessorKey: "marketCap",
        header: colHeader("marketCap"),
        cell: ({ getValue }) => numeric(formatTurnover(getValue<number | null>(), locale)),
      },
      {
        accessorKey: "sector",
        header: colHeader("sector"),
        cell: ({ row }) => <span className="is-clip block">{sectorLabel(row.original.sector)}</span>,
      },
      {
        accessorKey: "pe",
        header: colHeader("pe"),
        cell: ({ getValue }) => numeric(formatRatio(getValue<number | null>(), 1, locale)),
      },
      {
        accessorKey: "pb",
        header: colHeader("pb"),
        cell: ({ getValue }) => numeric(formatRatio(getValue<number | null>(), 2, locale)),
      },
      { accessorKey: "exchange", header: colHeader("exchange") },
      {
        accessorKey: "turnover",
        header: colHeader("turnover"),
        cell: ({ getValue }) => numeric(
          <span className="text-fg-muted">{formatTurnover(getValue<number | null>(), locale)}</span>,
        ),
      },
      {
        accessorKey: "roe",
        header: colHeader("roe"),
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return numeric(v == null ? EM_DASH : formatPct(v, locale));
        },
      },
      {
        accessorKey: "dividendYield",
        header: colHeader("dividendYield"),
        cell: ({ getValue }) => {
          const v = getValue<number | null>();
          return numeric(v == null ? EM_DASH : formatPct(v, locale));
        },
      },
    ];
  }, [t, companyName, sectorLabel, locale]);

  const rowKey = rows.map((r) => r.symbol).join(",");

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [rowKey, table]);

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const from = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, rows.length);

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-2 flex w-full min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <p>{t("screener.showing", { from, to, total: rows.length })}</p>
        <div className="relative" ref={pickerRef}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 min-w-11 gap-1.5 px-3"
            aria-expanded={pickerOpen}
            aria-haspopup="true"
            aria-label={t("a11y.columns")}
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Columns3 className="size-4" />
            {t("screener.columns")}
          </Button>
          {pickerOpen ? (
            <div
              role="group"
              aria-label={t("a11y.columns")}
              className="absolute right-0 z-50 mt-1 max-h-[min(24rem,70vh)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-border bg-surface-2 p-1 shadow-[var(--elev-border)]"
            >
              <p className="px-2 py-1.5 text-[11px] text-fg-subtle">{t("screener.columnsHint")}</p>
              {SCREENER_COLUMN_IDS.map((id) => {
                const col = table.getColumn(id);
                if (!col) return null;
                const pinned = id === PINNED_COLUMN;
                return (
                  <label
                    key={id}
                    className={cn(
                      "flex h-11 min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-fg",
                      pinned ? "opacity-80" : "hover:bg-surface-3",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-[var(--accent)]"
                      checked={col.getIsVisible()}
                      disabled={pinned}
                      onChange={col.getToggleVisibilityHandler()}
                    />
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={t(`screener.colTitle.${id}` as MessageKey)}
                    >
                      {t(`screener.col.${id}` as MessageKey)}
                    </span>
                    {pinned ? <span className="text-[11px] uppercase text-fg-subtle">{t("screener.pinned")}</span> : null}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <div className="screener-scroll w-full max-w-full overflow-x-auto rounded-xl border border-border bg-surface-2">
        <table className="screener-grid text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wide text-fg-subtle">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const pinned = header.column.id === PINNED_COLUMN;
                  const numeric = header.column.id !== "symbol" && header.column.id !== "name" && header.column.id !== "sector" && header.column.id !== "exchange";
                  return (
                    <th
                      key={header.id}
                      className={cn("px-2 py-2 font-medium", pinned && "screener-sticky", numeric && "text-right")}
                      title={t(`screener.colTitle.${header.column.id}` as MessageKey)}
                      aria-label={t(`screener.colTitle.${header.column.id}` as MessageKey)}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-1",
                            numeric && "w-full justify-end",
                            header.column.getCanSort() && "hover:text-fg",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : null}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="px-3 py-10 text-center text-fg-muted">
                  {t("screener.empty")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-border/80 hover:bg-surface">
                  {row.getVisibleCells().map((cell) => {
                    const pinned = cell.column.id === PINNED_COLUMN;
                    const numeric = cell.column.id !== "symbol" && cell.column.id !== "name" && cell.column.id !== "sector" && cell.column.id !== "exchange";
                    return (
                      <td
                        key={cell.id}
                        className={cn("px-2 py-2", pinned && "screener-sticky", numeric && "text-right")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
        <label className="flex h-11 items-center gap-2 text-xs text-fg-muted">
          {t("screener.rows")}
          <select
            className="h-11 rounded-md border border-border bg-surface-2 px-2"
            value={pageSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPageSize(n);
              table.setPageSize(n);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>{t("screener.allRows")}</option>
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="size-4" /> {t("screener.prev")}
          </Button>
          <span className="text-xs text-fg-muted">
            {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            className="h-11 px-3"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("screener.next")} <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
