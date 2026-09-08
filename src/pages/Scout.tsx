import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SurfaceProactiveCards } from "@/components/agent/SurfaceProactiveCards";
import { OpportunitiesFeed } from "@/components/circle/OpportunitiesFeed";
import { ScoutedGigsSection } from "@/components/opportunity/ScoutedGigsSection";
import { ShortlistedGigs } from "@/components/opportunity/ShortlistedGigs";
import { ScoutLayout, type ScoutTab } from "@/components/opportunity/scout/ScoutLayout";
import { Radar, Store, Bookmark } from "lucide-react";
import { KretoTip } from "@/components/agent/KretoTip";

type Tab = "scouted" | "shortlist" | "marketplace";

const TABS: ScoutTab<Tab>[] = [
  { id: "scouted", label: "For You", icon: Radar, hint: "Real gigs scouted from across the web" },
  { id: "shortlist", label: "Shortlist", icon: Bookmark, hint: "Gigs you saved for later" },
  { id: "marketplace", label: "Open Gigs", icon: Store, hint: "All open gigs on Kretopia" },
];

/**
 * Scout — gigs and talent only. Two purposes: find gigs to work on,
 * find creators to hire. People-discovery for collaboration lives in /circle.
 *
 * The page is now pure composition: ScoutLayout owns the chrome, this file
 * owns which section is showing. No gig is withheld from a new user — the
 * "For You" feed falls back to the whole open marketplace while the first
 * scan runs.
 */
const Scout = () => {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab");
  const initial = TABS.some((t) => t.id === requestedTab) ? (requestedTab as Tab) : "scouted";
  const contextQuery = params.get("q") || "";
  const [tab, setTab] = useState<Tab>(initial);

  const switchTab = (next: Tab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <ScoutLayout tabs={TABS} activeTab={tab} onTabChange={switchTab} contextQuery={contextQuery}>
      {contextQuery && (
        <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--accent-scout))]/30 bg-[hsl(var(--accent-scout))]/5 p-3 text-xs">
          <Radar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--accent-scout))]" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">From your Studio:</p>
            <p className="truncate text-muted-foreground">{contextQuery}</p>
          </div>
        </div>
      )}
      {tab === "scouted" && <ScoutedGigsSection />}
      {tab === "shortlist" && <ShortlistedGigs />}
      {tab === "marketplace" && <OpportunitiesFeed />}
      <SurfaceProactiveCards surface="scout" className="px-0" />
      <KretoTip compact />
    </ScoutLayout>
  );
};

export default Scout;
