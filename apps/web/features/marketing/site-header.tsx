"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AnalysisCta } from "@/features/marketing/analysis-cta";
import { navigation } from "@/features/marketing/content";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="page-container flex min-h-22 items-center justify-between gap-6">
        <Brand className="text-primary" />
        <nav aria-label="Main navigation" className="hidden items-center gap-4 lg:flex xl:gap-8">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="hidden py-3 text-sm font-medium hover:text-primary lg:block"
          >
            Log in
          </Link>
          <AnalysisCta />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-11 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent showCloseButton={false} className="overflow-y-auto">
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 size-11"
                aria-label="Close navigation"
              >
                <X aria-hidden="true" />
              </Button>
            </SheetClose>
            <SheetHeader>
              <SheetTitle>Explore Narra</SheetTitle>
              <SheetDescription>A clearer way to understand your data.</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2 px-4">
              <SheetClose asChild>
                <Link href="/login" className="rounded-md px-3 py-4 font-medium hover:bg-secondary">
                  Log in
                </Link>
              </SheetClose>
              {navigation.map((item) => (
                <SheetClose asChild key={item.href}>
                  <a
                    href={item.href}
                    className="rounded-md px-3 py-4 font-medium hover:bg-secondary"
                  >
                    {item.label}
                  </a>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
