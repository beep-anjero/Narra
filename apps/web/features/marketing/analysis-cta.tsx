"use client";

import { ArrowRight, FileSpreadsheet, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AnalysisCta({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className={cn("h-11", className)}>
          Analyze a Dataset <ArrowRight aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-11"
            aria-label="Close"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
        <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
          <FileSpreadsheet aria-hidden="true" className="size-6" />
        </div>
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">A clearer view is coming.</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            CSV uploads and personal dashboards aren’t available yet. In the meantime, explore the
            sample preview to see what Narra is being built to do.
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button asChild size="lg" className="mt-2">
            <a href="#dashboard-preview">
              Explore the preview <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
