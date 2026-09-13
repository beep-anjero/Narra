import { z } from "zod";
export const demoNameSchema = z.enum([
  "ecommerce-sales",
  "student-performance",
  "marketing-campaign",
  "website-traffic",
  "weather-history",
]);
export type DemoName = z.infer<typeof demoNameSchema>;
export const demos: Record<DemoName, string> = {
  "ecommerce-sales": "Ecommerce sales",
  "student-performance": "Student performance",
  "marketing-campaign": "Marketing campaigns",
  "website-traffic": "Website traffic",
  "weather-history": "Weather history",
};
