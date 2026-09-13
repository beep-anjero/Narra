import "server-only";
import sales from "./generated/ecommerce-sales.json";
import students from "./generated/student-performance.json";
import marketing from "./generated/marketing-campaign.json";
import traffic from "./generated/website-traffic.json";
import weather from "./generated/weather-history.json";
import { analysisSchema } from "@/features/upload/contracts";
import type { DemoName } from "./catalog";
const snapshots = {
  "ecommerce-sales": sales,
  "student-performance": students,
  "marketing-campaign": marketing,
  "website-traffic": traffic,
  "weather-history": weather,
};
export function demoSnapshot(name: DemoName) {
  return analysisSchema.parse(snapshots[name]);
}
