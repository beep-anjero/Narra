import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Brand } from "@/components/brand";
import { LogoutButton } from "@/features/auth/logout-button";
import { requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="border-b bg-white">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-5">
          <Brand className="text-primary" />
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden max-w-64 truncate text-sm text-muted-foreground sm:block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="page-container py-12 sm:py-16">
        {children}
      </main>
    </>
  );
}
