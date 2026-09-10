"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { ECharts } from "echarts/core";
import { chartOptions } from "./chart-options";
import type { ChartData } from "./contracts";
import type { VisualizationRecommendation } from "@/features/upload/recommendation-contract";

export const ChartRenderer = memo(function ChartRenderer({
  recommendation,
  chart,
}: {
  recommendation: VisualizationRecommendation;
  chart: ChartData;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let disposed = false;
    let instance: ECharts | undefined;
    let observer: ResizeObserver | undefined;
    import("./echarts-runtime")
      .then(({ init }) => {
        if (disposed || !container.current) return;
        instance = init(container.current, undefined, { renderer: "svg" });
        instance.setOption(chartOptions(recommendation, chart));
        observer = new ResizeObserver(() => instance?.resize());
        observer.observe(container.current);
        setState("ready");
      })
      .catch(() => {
        if (!disposed) setState("error");
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      instance?.dispose();
    };
  }, [recommendation, chart]);
  return (
    <>
      {state === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading chart…
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="rounded bg-muted p-3 text-sm">
          This chart could not be displayed. Its data is available below.
        </p>
      )}
      <div
        ref={container}
        className="h-80 w-full min-w-0"
        role="img"
        aria-label={recommendation.title}
      />
    </>
  );
});
