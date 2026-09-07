import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Narra — A clearer story in your data",
    template: "%s | Narra",
  },
  description:
    "Meet Narra: a new way to turn CSV datasets into understandable dashboards. Explore the preview of automatic charts, statistics, and transparent insights.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
