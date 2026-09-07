import Link from "next/link";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Narra home"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30" fill="none">
        <rect x="2" y="16" width="6" height="12" rx="2" fill="currentColor" />
        <rect x="12" y="9" width="6" height="19" rx="2" fill="currentColor" />
        <rect x="22" y="2" width="6" height="26" rx="2" fill="currentColor" />
      </svg>
      <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.06em]">narra</span>
    </Link>
  );
}
