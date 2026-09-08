import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Camera, FileVideo, UserPlus, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CastingCallsRail } from "@/components/opportunity/CastingCallsRail";
import { RecentRecordingsRail } from "@/components/calls/RecentRecordingsRail";

export interface StudioCollaborator {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

type TabKey = "people" | "casting" | "recordings";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "people", label: "People", icon: Users },
  { key: "casting", label: "Casting", icon: Camera },
  { key: "recordings", label: "Recordings", icon: FileVideo },
];

/**
 * Casting & Collaborators — the people surface of Studio home.
 *
 * Previously three rails stacked in one card, each fetching and
 * rendering at full height whether or not you cared. Now one segmented
 * surface: your crew leads, casting and recordings are one tap away, and
 * only the chosen rail mounts — so two of the three queries never run
 * until asked for.
 */
export const CastingCollaboratorsSection = ({
  collaborators,
}: {
  collaborators: StudioCollaborator[];
}) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("people");

  return (
    <section
      aria-labelledby="studio-people-title"
      className="overflow-hidden rounded-3xl border border-border bg-card"
    >
      <header className="relative border-b border-border/70 px-4 py-4 sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ background: "radial-gradient(120% 140% at 100% 0%, hsl(var(--signal-teal)) 0%, transparent 55%)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Casting &amp; Collaborators
            </p>
            <h2 id="studio-people-title" className="mt-0.5 truncate text-lg font-black tracking-[-0.02em]">
              The people around your work
            </h2>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1.5 rounded-full"
            onClick={() => navigate("/match")}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Find people</span>
          </Button>
        </div>

        {/* Segmented control */}
        <div
          role="tablist"
          aria-label="Casting and collaborators"
          className="relative mt-3 flex gap-1 rounded-full border border-border bg-background p-1"
        >
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
                {t.key === "people" && collaborators.length > 0 && (
                  <span className="tabular-nums opacity-70">{collaborators.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-4 py-4 sm:px-5">
        {tab === "people" && (
          collaborators.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" aria-hidden />
              <p className="text-sm font-semibold">No collaborators yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add people to a project and they'll show up here.
              </p>
              <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/match")}>
                Find your first collaborator
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {collaborators.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${c.id}`)}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full p-[2px]" style={{ background: "linear-gradient(135deg, hsl(var(--energy)), hsl(var(--signal-teal)))" }}>
                      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-muted">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-muted-foreground">{c.full_name[0]}</span>
                        )}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.full_name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {c.role || "Collaborator"}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === "casting" && <CastingCallsRail />}
        {tab === "recordings" && <RecentRecordingsRail />}
      </div>
    </section>
  );
};

export default CastingCollaboratorsSection;
