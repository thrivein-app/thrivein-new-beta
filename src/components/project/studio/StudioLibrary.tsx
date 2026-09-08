import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Search, Plus, ChevronLeft, ChevronRight, Folder, Inbox, FolderInput,
  ArrowUpRight, X, Loader2, AlertTriangle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CtaButton } from "@/components/ui/cta-button";
import { moodGradient, moodLabel } from "./moodGradient";
import { monogram, STATUS_PILL, PAY_DOT, PAY_LABEL, type StudioProject } from "./studioCardHelpers";
import { MoveToFolderSheet } from "./MoveToFolderSheet";
import { StudioFoldersBar, type StudioFolder } from "./StudioFoldersBar";

type PayState = "paid" | "invoiced" | "unsent";
type StatusFilter = "all" | "active" | "needs_invoice" | "awaiting_payment" | "delivered";

/** How many Projects the shelf shows before "Show all" — deliberately
 *  small: the Studio home is a launchpad, not an archive. */
const PREVIEW_COUNT = 4;

const isDelivered = (s?: string | null) => s === "completed" || s === "archived";

interface StudioLibraryProps {
  userId: string;
  projects: StudioProject[];
  invoicesByProject?: Record<string, PayState>;
  moneyVisibleByProject?: Record<string, boolean>;
  canSeeMoney?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreate: () => void;
  /** Folder shelf state, owned by the page so deep links keep working. */
  folders: StudioFolder[];
  folderCounts: Record<string, number>;
  folderFilter: string;
  onSelectFolder: (id: string) => void;
  onFoldersChanged: () => void;
  onMoveToFolder?: (projectId: string, folderId: string | null) => void;
}

/**
 * StudioLibrary — folders and Projects as one illustrated shelf.
 *
 * Before this they were two stacked surfaces (a folder grid + a plain
 * row list) that read as two unrelated widgets. One component now owns
 * the whole "where's my work" question: the folder shelf, the pulse
 * chips, and an illustrated Project wall that shows only the four most
 * recent by default.
 */
export const StudioLibrary = ({
  userId,
  projects,
  invoicesByProject = {},
  moneyVisibleByProject,
  canSeeMoney = true,
  loading = false,
  error = null,
  onRetry,
  onCreate,
  folders,
  folderCounts,
  folderFilter,
  onSelectFolder,
  onFoldersChanged,
  onMoveToFolder,
}: StudioLibraryProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StudioProject | null>(null);

  const pay = (id: string): PayState => invoicesByProject[id] ?? "unsent";
  const moneyVisible = (id: string): boolean =>
    moneyVisibleByProject ? (moneyVisibleByProject[id] ?? false) : canSeeMoney;
  const anyMoneyVisible = moneyVisibleByProject
    ? Object.values(moneyVisibleByProject).some(Boolean)
    : canSeeMoney;

  const atRoot = folderFilter === "all";
  const currentFolder = folders.find((f) => f.id === folderFilter);

  /** Scope: root shows unfiled work when folders exist (so nothing is
   *  listed twice); inside a folder we show exactly that folder. */
  const scoped = useMemo(() => {
    if (folderFilter === "unfiled") return projects.filter((p) => !p.studio_folder_id);
    if (!atRoot) return projects.filter((p) => p.studio_folder_id === folderFilter);
    if (folders.length > 0) return projects.filter((p) => !p.studio_folder_id);
    return projects;
  }, [projects, folderFilter, atRoot, folders.length]);

  const counts = useMemo(() => {
    const active = scoped.filter((p) => !isDelivered(p.status)).length;
    const delivered = scoped.filter((p) => isDelivered(p.status)).length;
    const money = scoped.filter((p) => moneyVisible(p.id));
    return {
      active,
      delivered,
      needsInvoice: money.filter((p) => isDelivered(p.status) && pay(p.id) === "unsent").length,
      awaitingPayment: money.filter((p) => pay(p.id) === "invoiced").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, invoicesByProject, moneyVisibleByProject, canSeeMoney]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped
      .filter((p) => {
        if (q && !`${p.title} ${p.client_name ?? ""}`.toLowerCase().includes(q)) return false;
        switch (filter) {
          case "active": return !isDelivered(p.status);
          case "delivered": return isDelivered(p.status);
          case "needs_invoice": return isDelivered(p.status) && pay(p.id) === "unsent";
          case "awaiting_payment": return pay(p.id) === "invoiced";
          default: return true;
        }
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoped, invoicesByProject, query, filter]);

  const filtering = filter !== "all" || query.trim() !== "";
  const visible = expanded || filtering ? rows : rows.slice(0, PREVIEW_COUNT);
  const hidden = rows.length - visible.length;

  const nextAction = (p: StudioProject) => {
    if (!isDelivered(p.status)) {
      if (p.status === "wrapping") return "Wrap it up";
      if (p.status === "planning") return "Add the first tasks";
      return "Open the work feed";
    }
    if (!moneyVisible(p.id)) return "Review the delivery";
    const state = pay(p.id);
    if (state === "unsent") return "Draft the invoice";
    if (state === "invoiced") return "Chase the payment";
    return "Log the credits";
  };

  const CHIPS: { key: StatusFilter; label: string; value: number; money?: boolean }[] = [
    { key: "active", label: "In progress", value: counts.active },
    { key: "needs_invoice", label: "Needs an invoice", value: counts.needsInvoice, money: true },
    { key: "awaiting_payment", label: "Awaiting payment", value: counts.awaitingPayment, money: true },
    { key: "delivered", label: "Delivered", value: counts.delivered },
  ];

  return (
    <section
      aria-labelledby="studio-library-title"
      className="overflow-hidden rounded-3xl border border-border bg-card"
    >
      {/* Illustrated header band */}
      <header className="relative border-b border-border/70 px-4 py-4 sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ background: "radial-gradient(120% 140% at 0% 0%, hsl(var(--energy)) 0%, transparent 55%)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!atRoot && (
              <button
                type="button"
                onClick={() => { onSelectFolder("all"); setExpanded(false); }}
                className="-ml-1 mb-1 inline-flex items-center gap-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> All folders
              </button>
            )}
            <div className="flex items-center gap-2">
              {!atRoot && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted">
                  {folderFilter === "unfiled"
                    ? <Inbox className="h-4 w-4" aria-hidden />
                    : <Folder className="h-4 w-4" aria-hidden />}
                </span>
              )}
              <h2 id="studio-library-title" className="truncate text-lg font-black tracking-[-0.02em]">
                {atRoot ? "Your work" : folderFilter === "unfiled" ? "Unfiled" : currentFolder?.name ?? "Folder"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {scoped.length} {scoped.length === 1 ? "project" : "projects"}
              {counts.active > 0 && <> · {counts.active} moving</>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {scoped.length > PREVIEW_COUNT && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label={searchOpen ? "Close search" : "Search projects"}
                onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setQuery(""); }}
              >
                {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            )}
            <Button size="sm" className="h-9 gap-1.5 rounded-full" onClick={onCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">New project</span>
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects and clients"
              aria-label="Search projects"
              className="h-10 rounded-full pl-9"
            />
          </div>
        )}
      </header>

      {/* Folder shelf — only at root, keeps every folder action it had */}
      {atRoot && (projects.length > 0 || folders.length > 0) && (
        <div className="border-b border-border/70 px-4 py-4 sm:px-5">
          <StudioFoldersBar
            userId={userId}
            folders={folders}
            counts={folderCounts}
            selected={folderFilter}
            onSelect={onSelectFolder}
            onChanged={onFoldersChanged}
            onDropProject={onMoveToFolder}
          />
        </div>
      )}

      <div className="px-4 py-4 sm:px-5">
        {/* Pulse chips — compact, each one filters the wall below */}
        {scoped.length > 0 && (
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
            {CHIPS.filter((c) => (anyMoneyVisible || !c.money) && c.value > 0).map((c) => {
              const on = filter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Filter by ${c.label}`}
                  onClick={() => setFilter(on ? "all" : c.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    on
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="tabular-nums">{c.value}</span> {c.label}
                </button>
              );
            })}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-destructive" aria-hidden />
            <p className="text-sm font-semibold">We couldn't load your projects.</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
          </div>
        ) : scoped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl" style={{ background: moodGradient("creative") }}>
              <Sparkles className="h-5 w-5 text-black" aria-hidden />
            </span>
            <h3 className="text-base font-bold">{atRoot ? "Nothing here yet" : "This folder is empty"}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              A project keeps the brief, the work, the people and the proof in one place.
            </p>
            <div className="mt-5 flex justify-center">
              <CtaButton onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Start a project
              </CtaButton>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing matches this view.{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => { setFilter("all"); setQuery(""); }}
            >
              Clear
            </button>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2">
              {visible.map((p) => {
                const pill = STATUS_PILL[p.status ?? "active"] ?? STATUS_PILL.planning;
                const state = pay(p.id);
                return (
                  <li key={p.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => navigate(`/desk/${p.id}`)}
                      className="w-full overflow-hidden rounded-2xl border border-border bg-background text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {/* Illustrated cover — real cover image when the
                          project has one, otherwise its mood gradient. */}
                      <span className="relative block h-20 overflow-hidden" style={{ background: moodGradient(p.mood) }}>
                        {p.cover_url && (
                          <img src={p.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                        <span
                          aria-hidden
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(180deg, transparent 30%, hsl(var(--background)/0.85) 100%)" }}
                        />
                        <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl bg-black/25 text-xs font-black text-white ring-1 ring-white/25">
                          {monogram(p.title)}
                        </span>
                        <span className={cn("absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold", pill.tone)}>
                          {pill.label}
                        </span>
                        <span className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/70">
                          {moodLabel(p.mood)}
                        </span>
                      </span>

                      <span className="block p-3">
                        <span className="block truncate text-sm font-bold">{p.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {p.client_name || p.description || "No client set"}
                        </span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{formatDistanceToNowStrict(new Date(p.updated_at))} ago</span>
                          {moneyVisible(p.id) && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full", PAY_DOT[state])} aria-hidden />
                              {PAY_LABEL[state]}
                            </span>
                          )}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-foreground">
                          {nextAction(p)}
                          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                        </span>
                      </span>
                    </button>

                    {onMoveToFolder && folders.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-[5.5rem] h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Move ${p.title} to a folder`}
                        onClick={() => setMoveTarget(p)}
                      >
                        <FolderInput className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {(hidden > 0 || (expanded && !filtering)) && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1 rounded-full text-xs font-bold"
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? "Show less" : `Show all ${rows.length}`}
                  <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "-rotate-90")} aria-hidden />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {onMoveToFolder && (
        <MoveToFolderSheet
          open={!!moveTarget}
          onOpenChange={(v) => !v && setMoveTarget(null)}
          folders={folders}
          currentFolderId={moveTarget?.studio_folder_id ?? null}
          projectTitle={moveTarget?.title}
          onMove={(folderId) => {
            if (moveTarget) onMoveToFolder(moveTarget.id, folderId);
            setMoveTarget(null);
          }}
        />
      )}
    </section>
  );
};

export default StudioLibrary;
