export const navigation = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Dashboard preview", href: "#dashboard-preview" },
] as const;

// Illustrative marketing data only. This is not the analytics service or demo flow.
export const revenuePreview = [
  { month: "Jan", revenue: 15480 },
  { month: "Feb", revenue: 18250 },
  { month: "Mar", revenue: 16800 },
  { month: "Apr", revenue: 22900 },
  { month: "May", revenue: 25400 },
  { month: "Jun", revenue: 29600 },
] as const;

export const categoryPreview = [
  { name: "Electronics", share: 36, color: "bg-primary" },
  { name: "Home & living", share: 28, color: "bg-chart-2" },
  { name: "Clothing", share: 22, color: "bg-chart-3" },
  { name: "Other", share: 14, color: "bg-chart-4" },
] as const;

export const previewTotal = revenuePreview.reduce((total, month) => total + month.revenue, 0);
export const juneChange = (
  (revenuePreview[5].revenue / revenuePreview[4].revenue - 1) *
  100
).toFixed(1);

export const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
