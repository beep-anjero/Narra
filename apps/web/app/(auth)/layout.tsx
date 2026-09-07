import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChartNoAxesCombined } from "lucide-react";

import { Brand } from "@/components/brand";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <aside
        aria-label="About Narra"
        className="hidden flex-col justify-between bg-primary p-12 text-white lg:flex xl:p-16"
      >
        <Brand />
        <div className="max-w-lg py-14">
          <ChartNoAxesCombined aria-hidden="true" className="mb-8 size-10 opacity-80" />
          <p className="text-4xl leading-tight font-medium tracking-tight xl:text-5xl">
            A clearer story
            <br />
            in your data.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-white/80">
            One place for your questions, your datasets, and the patterns worth exploring.
          </p>
        </div>
        <p className="text-sm text-white/75">Narra · Made for curious minds</p>
      </aside>
      <div className="flex min-h-dvh flex-col px-6 py-7 sm:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Brand className="text-primary lg:hidden" />
          <Link
            href="/"
            className="inline-flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Narra
          </Link>
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
