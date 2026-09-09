import { Badge } from "@/components/ui/badge";
import type { DatasetAnalysis } from "./contracts";

export function ColumnTypeBadge({
  type,
}: {
  type: DatasetAnalysis["column_metadata"][number]["detected_type"];
}) {
  const labels = {
    numeric: "Numeric",
    categorical: "Categorical",
    datetime: "Date/time",
    boolean: "Boolean",
    text: "Text",
  };
  return <Badge variant="secondary">{labels[type]}</Badge>;
}
