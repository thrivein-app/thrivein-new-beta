/**
 * ScoutLayout — Scout's page frame, extracted from src/pages/Scout.tsx so
 * the page is composition rather than 140 lines of inline chrome.
 *
 * Owns: the accent scope, SEO, the cinematic header, the section tab list
 * and the two "these leave the page" secondary links (deliberately styled
 * as links, never as tabs). The page supplies only the active section's
 * body.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserSearch, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import { StudioFeatureShell } from "@/components/studio-reference/StudioFeatureShell";
import { SCOUT_TUTORIAL } from "@/components/landing/kretopia/tutorialContent";

export interface ScoutTab<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  hint: string;
}

interface ScoutLayoutProps<T extends string> {
  tabs: ScoutTab<T>[];
  activeTab: T;
  onTabChange: (next: T) => void;
  /** Free-text carried in from a Studio, shown as provenance above results. */
  contextQuery?: string;
  children: ReactNode;
}

export function ScoutLayout<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  contextQuery,
  children,
}: ScoutLayoutProps<T>) {
  return (
    <div className="accent-scout min-h-screen bg-background">
      <SEO
        title="Scout — Find your next gig & collaborator | Kretopia"
        description="One feed for the gigs and people that fit your work — scouted from across the web and curated by Kreto."
      />

      <FeaturePageHeader
        eyebrow="Scout"
        title="Scout."
        accentTitle={<>Gigs &amp; talent, found for you.</>}
        subtitle="One feed for the gigs and people that fit your work — scouted from across the web and curated by Kreto."
        tutorial={{ featureKey: "scout", label: "How Scout works", steps: SCOUT_TUTORIAL }}
        tabs={
          <div className="flex flex-col gap-3">
            <div
              role="tablist"
              aria-label="Scout sections"
              className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1"
            >
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    aria-label={t.hint}
                    onClick={() => onTabChange(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                      active
                        ? "bg-background text-energy shadow-sm ring-1 ring-energy"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", active && "text-energy")} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/circle"
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Find collaborators in Circle"
              >
                Looking for collaborators? Open Circle
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                to={contextQuery ? `/talent-finder?q=${encodeURIComponent(contextQuery)}` : "/talent-finder"}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Open Talent Scout to hire talent"
              >
                <UserSearch className="h-3 w-3" />
                Hiring? Open Talent Scout
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        }
      />

      <StudioFeatureShell>{children}</StudioFeatureShell>
    </div>
  );
}

export default ScoutLayout;
