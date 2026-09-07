import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AnalysisCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("h-11", className)}>
      <Link href="/register">
        Analyze a Dataset <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  );
}
