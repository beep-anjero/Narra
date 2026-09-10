// @vitest-environment node
import { expect, it } from "vitest";
import { init } from "@/features/charts/echarts-runtime";
import { chartOptions } from "@/features/charts/chart-options";
import type { VisualizationRecommendation } from "@/features/upload/recommendation-contract";

it.each(["line", "bar", "scatter", "histogram", "donut"] as const)(
  "renders real %s options to SVG",
  (type) => {
    const recommendation: VisualizationRecommendation = {
      chart_type: type,
      title: "Example",
      x_column: "X",
      y_column: type === "scatter" ? "Y" : null,
      aggregation: "count",
      reason: "Reason",
      valid_rows: 2,
      score: 0.8,
    };
    const data = {
      recommendation_index: 0,
      data: [
        { x: type === "scatter" ? 1 : "A", y: 2 },
        { x: type === "scatter" ? 2 : "B", y: 3 },
      ],
      note: "All rows",
      error: null,
    };
    const instance = init(null, undefined, { renderer: "svg", ssr: true, width: 640, height: 320 });
    try {
      const options = chartOptions(recommendation, data);
      instance.setOption(options);
      expect(instance.renderToSVGString()).toContain("<svg");
      expect(instance.renderToSVGString()).toContain("<path");
      expect(options.animation).toBe(false);
      expect(options.tooltip).toMatchObject({ renderMode: "richText", confine: true });
    } finally {
      instance.dispose();
    }
  },
);
