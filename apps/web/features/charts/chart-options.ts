import type { EChartsOption } from "echarts";
import type { ChartData } from "./contracts";
import type { VisualizationRecommendation } from "@/features/upload/recommendation-contract";

export function chartOptions(
  recommendation: VisualizationRecommendation,
  chart: ChartData,
): EChartsOption {
  const { chart_type: type, x_column: x, y_column: y } = recommendation;
  const year = String(chart.data[0]?.x ?? "").slice(0, 4);
  const compactDates =
    type === "line" &&
    chart.data.length > 0 &&
    chart.data.every(
      (point) =>
        typeof point.x === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(point.x) &&
        point.x.startsWith(`${year}-`),
    );
  const base: EChartsOption = {
    animation: false,
    color: ["#16705b", "#648dce", "#d19645", "#9b79b5", "#3a8999", "#bf6877", "#71834a", "#9a8271"],
    textStyle: { fontFamily: "inherit" },
    aria: { enabled: true, description: `${recommendation.title}. ${chart.note}` },
    tooltip: {
      trigger: type === "line" || type === "bar" || type === "histogram" ? "axis" : "item",
      renderMode: "richText",
      confine: true,
    },
  };
  if (type === "donut")
    return {
      ...base,
      legend: { bottom: 0, type: "scroll" },
      series: [
        {
          type: "pie",
          radius: ["42%", "65%"],
          center: ["50%", "43%"],
          label: { show: false },
          data: chart.data.map((point) => ({ name: String(point.x), value: point.y })),
        },
      ],
    };
  return {
    ...base,
    grid: { left: 65, right: 25, top: 25, bottom: 90 },
    xAxis: {
      type: type === "scatter" ? "value" : "category",
      name: compactDates ? `${x} (${year})` : x,
      nameLocation: "middle",
      nameGap: 55,
      nameTruncate: { maxWidth: 230 },
      axisLabel: {
        hideOverlap: true,
        width: 90,
        overflow: "truncate",
        ...(compactDates ? { formatter: (value: string | number) => String(value).slice(5) } : {}),
      },
      ...(type !== "scatter" ? { data: chart.data.map((point) => String(point.x)) } : {}),
    },
    yAxis: {
      type: "value",
      name: y ?? "Records",
      nameTruncate: { maxWidth: 180 },
      axisLabel: {
        formatter: (value: number) =>
          Intl.NumberFormat("en", { notation: "compact" }).format(value),
      },
    },
    ...(type === "line" || type === "bar"
      ? { dataZoom: [{ type: "slider", bottom: 5, height: 18 }, { type: "inside" }] }
      : {}),
    series:
      type === "scatter"
        ? [{ type: "scatter", symbolSize: 7, data: chart.data.map((point) => [point.x, point.y]) }]
        : type === "line"
          ? [
              {
                type: "line",
                showSymbol: chart.data.length < 40,
                smooth: false,
                data: chart.data.map((point) => point.y),
              },
            ]
          : [
              {
                type: "bar",
                barMaxWidth: 40,
                ...(type === "histogram" ? { barCategoryGap: "0%" } : {}),
                data: chart.data.map((point) => point.y),
              },
            ],
  };
}
