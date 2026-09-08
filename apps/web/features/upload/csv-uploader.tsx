"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDataset } from "@/lib/api/datasets";
import { validateUpload, type DatasetPreview } from "./contracts";
import { PreviewTable } from "./preview-table";

export function CsvUploader({ projectId, maxBytes }: { projectId: string; maxBytes: number }) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  function selectFiles(files: FileList | null) {
    if (busy || !files?.length) return;
    setPreview(null);
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

  async function submit() {
    if (!file || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setProgress(0);
    setPreview(null);
    setError(null);
    setNotice("");
    try {
      const result = await uploadDataset(projectId, file, setProgress, controller.signal);
      if (!controller.signal.aborted) {
        setPreview(result);
        setNotice("CSV validated successfully.");
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
        Upload your dataset
      </h2>
      <p id={`${inputId}-help`} className="mt-3 text-sm text-muted-foreground">
        Choose a UTF-8 CSV with a header row. Up to {(maxBytes / 1048576).toLocaleString()} MiB.
        Narra validates the file before showing a preview.
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
      <div className="mt-5 flex flex-wrap gap-3">
        <Button disabled={!file || busy} onClick={submit}>
          {busy ? "Processing…" : "Validate CSV"}
        </Button>
        {busy && (
          <Button variant="outline" onClick={() => active.current?.abort()}>
            Cancel upload
          </Button>
        )}
      </div>
      {busy && (
        <div className="mt-5">
          <p role="status" className="mb-2 text-sm">
            {progress < 100 ? `Uploading dataset · ${progress}%` : "Reading and validating CSV…"}
          </p>
          <progress
            className="h-2 w-full accent-primary"
            value={progress}
            max={100}
            aria-label="Upload progress"
          />
        </div>
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
        Your project details are saved. Dataset storage and automatic analysis are not available
        yet.
      </p>
      {preview && <PreviewTable preview={preview} />}
    </section>
  );
}
