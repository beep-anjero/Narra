import { DashboardPreview } from "@/features/marketing/dashboard-preview";
import { Hero } from "@/features/marketing/hero";
import { Features } from "@/features/marketing/features";
import { HowItWorks } from "@/features/marketing/how-it-works";
import { SiteFooter } from "@/features/marketing/site-footer";
import { SiteHeader } from "@/features/marketing/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <DashboardPreview />
        <HowItWorks />
        <Features />
      </main>
      <SiteFooter />
    </>
  );
}
