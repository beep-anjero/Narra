"use client";
import { useState } from "react";
import { GeneratedDashboard } from "@/features/dashboard/generated-dashboard";
import { InsightPanel } from "@/features/insights/insight-card";
import { FilterPanel } from "@/features/filters/filter-panel";
import { PreviewTable } from "@/features/upload/preview-table";
import type { DatasetAnalysis } from "@/features/upload/contracts";
import type { DemoName } from "./catalog";
export function DemoDashboard({
  name,
  initialAnalysis,
}: {
  name: DemoName;
  initialAnalysis: DatasetAnalysis;
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  return (
    <>
      <FilterPanel projectId="demo" demoName={name} analysis={analysis} onChange={setAnalysis} />
      <GeneratedDashboard analysis={analysis} />
      <InsightPanel insights={analysis.insights} />
      <details className="mt-8">
        <summary className="cursor-pointer font-medium text-primary">
          Explore the source data
        </summary>
        <PreviewTable preview={analysis.preview} columns={analysis.column_metadata} />
      </details>
    </>
  );
}
