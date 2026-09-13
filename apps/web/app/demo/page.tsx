import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { demoNameSchema, demos } from "@/features/demo/catalog";
import { demoSnapshot } from "@/features/demo/snapshots";
import { DemoDashboard } from "@/features/demo/demo-dashboard";
export const metadata = { title: "Explore a demo dashboard" };
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const selected = demoNameSchema.safeParse((await searchParams).dataset);
  const name = selected.success ? selected.data : "ecommerce-sales";
  return (
    <div className="page-container py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Brand />
        <Button asChild>
          <Link href="/dashboard/new">Analyze your own CSV</Link>
        </Button>
      </header>
      <main id="main-content" className="mt-12">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Interactive demo · synthetic data
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{demos[name]}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A real Narra analysis of 240 reproducible sample records. Explore automatically
          recommended charts and calculation-backed insights. No account required.
        </p>
        <form className="mt-6 flex flex-wrap items-end gap-3" action="/demo">
          <div>
            <label htmlFor="demo-dataset" className="mb-2 block text-sm font-medium">
              Sample dataset
            </label>
            <select
              id="demo-dataset"
              name="dataset"
              defaultValue={name}
              className="h-10 max-w-full rounded-md border bg-background px-3"
            >
              {Object.entries(demos).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline">Load sample</Button>
          <a
            className="px-2 py-2 text-sm font-medium text-primary underline"
            href={`/api/demo/${name}`}
          >
            Download CSV
          </a>
        </form>
        <DemoDashboard key={name} name={name} initialAnalysis={demoSnapshot(name)} />
      </main>
    </div>
  );
}
