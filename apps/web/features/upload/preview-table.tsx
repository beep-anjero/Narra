"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnTypeBadge } from "./column-type-badge";
import type { DatasetAnalysis, DatasetPreview } from "./contracts";

export function PreviewTable({
  preview,
  columns,
}: {
  preview: DatasetPreview;
  columns: DatasetAnalysis["column_metadata"];
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<{ column: number; descending: boolean } | null>(null);
  const matching = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const rows = preview.rows
      .map((cells, index) => ({ cells, index }))
      .filter(({ cells }) => cells.some((value) => value.toLocaleLowerCase().includes(needle)));
    if (sort) {
      const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
      rows.sort((a, b) => {
        const left = a.cells[sort.column] ?? "";
        const right = b.cells[sort.column] ?? "";
        if (!left.trim() || !right.trim())
          return Number(!left.trim()) - Number(!right.trim()) || a.index - b.index;
        return collator.compare(left, right) * (sort.descending ? -1 : 1) || a.index - b.index;
      });
    }
    return rows;
  }, [preview.rows, query, sort]);
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const current = Math.min(page, pages - 1);
  const rows = matching.slice(current * pageSize, (current + 1) * pageSize);
  return (
    <section className="mt-8 min-w-0" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-semibold">
        Dataset preview
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {preview.row_count.toLocaleString()} validated rows · {preview.column_count} columns.
        {preview.truncated
          ? ` Preview limited to the first ${preview.rows.length} rows.`
          : " All rows are available in this preview."}
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-search`} className="text-sm font-medium">
            Search preview
          </label>
          <Input
            id={`${id}-search`}
            className="mt-2"
            placeholder="Search cell values…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <div>
          <label htmlFor={`${id}-size`} className="block text-sm font-medium">
            Rows per page
          </label>
          <select
            id={`${id}-size`}
            className="mt-2 h-9 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Search and natural text sorting apply only to the preview. Statistics always describe the
        full dataset.
      </p>
      <div
        className="mt-4 overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
        role="region"
        aria-label="CSV preview table"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Preview of {preview.filename}. Blank cells are labeled Missing.
          </caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="px-4 py-3">
                Row
              </th>
              {preview.columns.map((name, index) => (
                <th
                  key={name}
                  scope="col"
                  aria-sort={
                    sort?.column === index ? (sort.descending ? "descending" : "ascending") : "none"
                  }
                  className="min-w-40 max-w-64 px-4 py-3"
                >
                  <button
                    type="button"
                    className="mb-2 block w-full break-words text-left font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={() => {
                      setSort({
                        column: index,
                        descending: sort?.column === index && !sort.descending,
                      });
                      setPage(0);
                    }}
                    aria-label={`Sort by ${name}`}
                  >
                    {name} {sort?.column === index ? (sort.descending ? "↓" : "↑") : "↕"}
                  </button>
                  {columns[index] && <ColumnTypeBadge type={columns[index].detected_type} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cells, index }) => (
              <tr key={index} className="border-t">
                <th scope="row" className="px-4 py-3 font-normal text-muted-foreground">
                  {index + 1}
                </th>
                {cells.map((value, column) => (
                  <td key={column} className="max-w-64 whitespace-pre-wrap break-words px-4 py-3">
                    {value.trim() === "" ? (
                      <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground italic">
                        Missing
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={preview.column_count + 1}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No preview rows match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {matching.length ? current * pageSize + 1 : 0}–
          {Math.min((current + 1) * pageSize, matching.length)} of {matching.length} preview rows ·
          Page {current + 1} of {pages}
        </p>
        <nav aria-label="Preview pagination" className="flex gap-2">
          <Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </nav>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This preview is temporary and clears when you leave or reload the page. Original values are
        preserved; blank and whitespace-only cells are marked Missing.
      </p>
    </section>
  );
}
