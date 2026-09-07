import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Your workspace" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const parameters = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your workspace</h1>
      <p className="mt-3 break-words text-muted-foreground">Logged in as {user.email}.</p>
      {parameters.notice === "logout_failed" && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 p-4 text-destructive"
        >
          Narra could not complete logout. Please try again.
        </p>
      )}
      <Card className="mt-9 max-w-2xl shadow-none">
        <CardContent className="p-7 sm:p-10">
          <CheckCircle2 aria-hidden="true" className="mb-5 size-9 text-primary" />
          <h2 className="text-2xl font-semibold tracking-tight">Your account is ready.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Project creation and CSV analysis are coming next. For now, take a look at the sample
            dashboard to see where Narra is headed.
          </p>
          <Button asChild variant="outline" className="mt-7 h-11">
            <Link href="/#dashboard-preview">
              Explore the preview <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
