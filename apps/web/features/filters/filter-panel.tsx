"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDashboardStore, emptyDraft } from "@/stores/dashboard-store";
import { applyDashboardFilters } from "@/lib/api/filters";
import type { DatasetAnalysis } from "@/features/upload/contracts";
import { filterRequestSchema, type FilterRequest } from "./contracts";

export function FilterPanel({
  projectId,
  analysis,
  onChange,
}: {
  projectId: string;
  analysis: DatasetAnalysis;
  onChange: (analysis: DatasetAnalysis) => void;
}) {
  const id = useId();
  const [store] = useState(createDashboardStore);
  const state = useStore(store);
  const [totalRows] = useState(analysis.preview.row_count);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const context = analysis.filter_context;
  if (!context)
    return (
      <p className="mt-8 text-sm text-muted-foreground">
        Dashboard filters are unavailable for this upload. The dataset may exceed the temporary
        filter capacity or the service may need updating.
      </p>
    );

  async function apply(reset = false) {
    if (!context || active.current) return;
    const filters: FilterRequest["filters"] = [];
    if (!reset)
      for (const column of state.selectedColumns) {
        const field = context.fields.find((item) => item.column === column);
        const draft = state.draft[column] ?? emptyDraft();
        if (field?.kind === "categorical" && draft.values.length)
          filters.push({ column, kind: "categorical", values: draft.values });
        if (field?.kind === "numeric" && (draft.minimum !== "" || draft.maximum !== ""))
          filters.push({
            column,
            kind: "numeric",
            minimum: draft.minimum === "" ? null : Number(draft.minimum),
            maximum: draft.maximum === "" ? null : Number(draft.maximum),
          });
        if (field?.kind === "datetime" && (draft.start || draft.end))
          filters.push({
            column,
            kind: "datetime",
            start: draft.start || null,
            end: draft.end || null,
          });
      }
    const request = filterRequestSchema.safeParse({ token: context.token, filters });
    if (!request.success) {
      store.setState({ error: "Enter valid values with minimum/start before maximum/end." });
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    store.setState({ busy: true, error: null });
    try {
      const result = await applyDashboardFilters(projectId, request.data, controller.signal);
      if (!controller.signal.aborted) {
        onChange(result);
        store.setState({
          activeFilters: filters,
          ...(reset ? { draft: {}, selectedColumns: [] } : {}),
        });
      }
    } catch (error) {
      if (!controller.signal.aborted)
        store.setState({
          error: error instanceof Error ? error.message : "The dashboard could not be updated.",
        });
    } finally {
      if (active.current === controller) {
        active.current = null;
        store.setState({ busy: false });
      }
    }
  }
  return (
    <section
      className="mt-8 rounded-xl border bg-muted/20 p-5"
      aria-label="Dashboard filters"
      aria-busy={state.busy}
    >
      <h2 className="text-lg font-semibold">Filter your dashboard</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Changes are drafts until applied. Filters update every chart, KPI, insight, statistic, and
        preview together. Date bounds include the entire UTC day.
      </p>
      <label htmlFor={`${id}-add`} className="mt-4 block text-sm font-medium">
        Add a filter
      </label>
      <select
        id={`${id}-add`}
        className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        value=""
        disabled={state.busy || state.selectedColumns.length >= 20}
        onChange={(event) => {
          if (event.target.value) state.addColumn(event.target.value);
        }}
      >
        <option value="">Choose a column</option>
        {context.fields
          .filter((field) => !state.selectedColumns.includes(field.column))
          .map((field) => (
            <option key={field.column} value={field.column}>
              {field.column} ({field.kind})
            </option>
          ))}
      </select>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {state.selectedColumns.map((column, index) => {
          const field = context.fields.find((item) => item.column === column);
          const draft = state.draft[column] ?? emptyDraft();
          if (!field) return null;
          return (
            <fieldset key={column} disabled={state.busy} className="min-w-0 rounded-lg border p-4">
              <legend className="max-w-full break-words px-1 text-sm font-medium">{column}</legend>
              {field.kind === "categorical" ? (
                <>
                  <label
                    htmlFor={`${id}-${index}-values`}
                    className="text-xs text-muted-foreground"
                  >
                    Select values (multiple allowed)
                  </label>
                  <select
                    id={`${id}-${index}-values`}
                    multiple
                    className="mt-2 block h-28 w-full rounded border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                    value={draft.values}
                    onChange={(event) =>
                      state.edit(column, {
                        values: Array.from(event.target.selectedOptions, (option) => option.value),
                      })
                    }
                  >
                    {field.values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(field.kind === "numeric"
                    ? (["minimum", "maximum"] as const)
                    : (["start", "end"] as const)
                  ).map((bound) => (
                    <div key={bound}>
                      <label htmlFor={`${id}-${index}-${bound}`} className="text-xs capitalize">
                        {bound}
                      </label>
                      <Input
                        id={`${id}-${index}-${bound}`}
                        className="mt-2"
                        type={field.kind === "numeric" ? "number" : "date"}
                        step={field.kind === "numeric" ? "any" : undefined}
                        value={draft[bound]}
                        onChange={(event) => state.edit(column, { [bound]: event.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => state.remove(column)}
                aria-label={`Remove ${column} filter`}
              >
                Remove
              </Button>
            </fieldset>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button disabled={state.busy} onClick={() => void apply()}>
          Apply filters
        </Button>
        <Button variant="outline" disabled={state.busy} onClick={() => void apply(true)}>
          Reset filters
        </Button>
      </div>
      <p role="status" className="mt-3 text-sm">
        {state.busy
          ? "Updating dashboard… Previous results remain visible."
          : `${analysis.preview.row_count.toLocaleString()} of ${totalRows.toLocaleString()} rows · ${state.activeFilters.length} applied filters`}
      </p>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.error} Previous results remain unchanged.
        </p>
      )}
      {!analysis.preview.row_count && (
        <p className="mt-3 text-sm">
          No rows match the applied filters. Adjust the ranges or reset filters.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Filtering is temporary. If this analysis expires or the service restarts, upload the CSV
        again.
      </p>
    </section>
  );
}
