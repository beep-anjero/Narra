"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inspectDataset, uploadDataset } from "@/lib/api/datasets";
import type { DatasetUpload } from "@/lib/api/datasets";
import { validateUpload, type DatasetAnalysis, type DatasetPreview } from "./contracts";
import type { CsvImportOptions } from "@/lib/api/analytics";
import { PreviewTable } from "./preview-table";
import { SchemaSummary } from "./schema-summary";
import { StatisticsPanel } from "./statistics-panel";
import { GeneratedDashboard } from "@/features/dashboard/generated-dashboard";
import { InsightPanel } from "@/features/insights/insight-card";
import { FilterPanel } from "@/features/filters/filter-panel";

export function CsvUploader({
  projectId,
  maxBytes,
  initialAnalysis = null,
  view = "dashboard",
}: {
  projectId: string;
  maxBytes: number;
  initialAnalysis?: DatasetAnalysis | null;
  view?: "dashboard" | "data" | "insights";
}) {
  const inputId = useId();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [preparedUpload, setPreparedUpload] = useState<DatasetUpload | null>(null);
  const [options, setOptions] = useState<CsvImportOptions>({ delimiter: "auto" });
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(initialAnalysis);
  const [saved, setSaved] = useState(Boolean(initialAnalysis));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  function selectFiles(files: FileList | null) {
    if (busy || !files?.length) return;
    setAnalysis(null);
    setPreview(null);
    setPreparedUpload(null);
    setError(null);
    setNotice("");
    setFile(null);
    if (files.length !== 1) {
      setError("Choose one CSV file at a time.");
      return;
    }
    const selected = files[0];
    if (!selected) return;
    const invalid = validateUpload(selected, maxBytes);
    if (invalid) {
      setError(invalid);
      return;
    }
    setFile(selected);
  }

  async function inspect() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const inspected = await inspectDataset(projectId, file, options, setProgress, preparedUpload);
      setPreview(inspected.preview);
      setPreparedUpload(inspected.upload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The CSV could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!file || !preparedUpload || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setProgress(0);
    setAnalysis(null);
    setError(null);
    setNotice("");
    try {
      const result = await uploadDataset(
        projectId,
        preparedUpload,
        setProgress,
        controller.signal,
        options,
      );
      if (!controller.signal.aborted) {
        setAnalysis(result);
        setSaved(true);
        setNotice("Dataset analyzed and saved. Your dashboard is ready.");
        router.refresh();
      }
    } catch (cause) {
      if (controller.signal.aborted) setNotice("Upload canceled.");
      else setError(cause instanceof Error ? cause.message : "The upload failed. Please retry.");
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section
      className="mt-10 rounded-xl border bg-card p-6 sm:p-8"
      aria-labelledby={`${inputId}-title`}
    >
      <h2 id={`${inputId}-title`} className="text-2xl font-semibold">
        {saved ? "Your dataset" : "Upload your dataset"}
      </h2>
      {!saved && (
        <>
          <p id={`${inputId}-help`} className="mt-3 text-sm text-muted-foreground">
            Choose a UTF-8 CSV with a header row. Up to {(maxBytes / 1048576).toLocaleString()} MiB.
            Narra validates the file, detects column types, and calculates statistics before showing
            a preview.
          </p>
          <div
            className={`mt-6 rounded-xl border-2 border-dashed p-7 text-center ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              selectFiles(event.dataTransfer.files);
            }}
          >
            <Upload className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" />
            <p className="font-medium">Drag and drop your CSV here</p>
            <label htmlFor={inputId} className="mt-4 block text-sm font-medium">
              Or choose a CSV file
            </label>
            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              aria-describedby={`${inputId}-help`}
              className="mt-3 max-w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-4 file:py-2 focus-visible:outline-2 focus-visible:outline-ring"
              onChange={(event) => {
                selectFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
          {file && (
            <div className="mt-5 flex items-center gap-3 text-sm">
              <FileSpreadsheet className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="min-w-0 break-words">
                {file.name}{" "}
                <span className="text-muted-foreground">({file.size.toLocaleString()} bytes)</span>
              </p>
            </div>
          )}
          {file && (
            <fieldset className="mt-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
              <legend className="px-1 text-sm font-medium">CSV import options</legend>
              <label className="text-sm">
                Delimiter
                <select
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
                  value={options.delimiter}
                  onChange={(event) => {
                    setPreview(null);
                    setOptions({
                      ...options,
                      delimiter: event.target.value as CsvImportOptions["delimiter"],
                    });
                  }}
                >
                  <option value="auto">Detect automatically</option>
                  <option value="comma">Comma</option>
                  <option value="semicolon">Semicolon</option>
                  <option value="tab">Tab</option>
                </select>
              </label>
              <label className="text-sm">
                Header row
                <input
                  className="mt-1 block w-full rounded-md border bg-background px-3 py-2"
                  type="number"
                  min="1"
                  max="100"
                  value={options.headerRow ?? ""}
                  placeholder="Detect automatically"
                  disabled={options.headerless}
                  onChange={(event) => {
                    setPreview(null);
                    setOptions({
                      ...options,
                      headerRow: event.target.value ? Number(event.target.value) : undefined,
                    });
                  }}
                />
              </label>
              <label className="flex items-center gap-2 self-end py-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(options.headerless)}
                  onChange={(event) => {
                    setPreview(null);
                    setOptions({ ...options, headerless: event.target.checked });
                  }}
                />
                This file has no header
              </label>
            </fieldset>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Button disabled={!file || busy} onClick={preview ? submit : inspect}>
              {busy ? "Processing…" : preview ? "Analyze and save" : "Inspect CSV"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={() => active.current?.abort()}>
                Cancel upload
              </Button>
            )}
          </div>
          {preview && (
            <div className="mt-5 rounded-lg border p-4">
              <p className="font-medium">Check before saving</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.column_count} columns · {preview.row_count.toLocaleString()} rows ·{" "}
                {preview.encoding ?? "UTF-8"} ·{" "}
                {preview.delimiter === "tab" ? "tab" : `“${preview.delimiter ?? ","}”`} delimiter ·
                header row {preview.header_row ?? 1}
              </p>
              {preview.generated_headers && (
                <p className="mt-2 text-sm text-amber-700">
                  No header was used. Narra generated Column 1, Column 2, and so on.
                </p>
              )}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      {preview.columns.map((column) => (
                        <th className="border-b px-2 py-2" key={column}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td className="border-b px-2 py-2" key={cellIndex}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {busy && (
            <div className="mt-5">
              <p role="status" className="mb-2 text-sm">
                {progress < 100
                  ? `Uploading dataset · ${progress}%`
                  : "Validating, analyzing, and saving your dataset…"}
              </p>
              {progress === 100 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Reading columns · Detecting types · Calculating statistics · Finding patterns ·
                  Generating charts · Saving your dashboard
                </p>
              )}
              <progress
                className="h-2 w-full accent-primary"
                value={progress}
                max={100}
                aria-label="Upload progress"
              />
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-5 text-sm text-primary">
          {notice}
        </p>
      )}
      <p className="mt-5 text-xs text-muted-foreground">
        {saved
          ? `${analysis?.preview.filename ?? "Dataset"} · Saved privately to your project. Filters change this view; the original analysis stays saved.`
          : "Your CSV and generated dashboard will be saved automatically. One dataset per project."}
      </p>
      {analysis && (
        <>
          <FilterPanel projectId={projectId} analysis={analysis} onChange={setAnalysis} />
          {view === "dashboard" && <GeneratedDashboard analysis={analysis} />}
          {view !== "data" && <InsightPanel insights={analysis.insights} />}
          {view === "data" && (
            <>
              <StatisticsPanel statistics={analysis.statistics} />
              <PreviewTable preview={analysis.preview} columns={analysis.column_metadata} />
              <SchemaSummary columns={analysis.column_metadata} />
            </>
          )}
        </>
      )}
    </section>
  );
}
