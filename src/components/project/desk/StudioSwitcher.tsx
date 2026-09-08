/**
 * StudioSwitcher — replaces the Desk's left sidebar.
 *
 * The sidebar was a layout-shifting panel: expanding it resized the whole
 * workspace and pushed the content the person was reading. This switcher is
 * an overlay instead — it never changes the width of anything. One button in
 * the topbar shows where you are; opening it gives search, quick filters,
 * every project (dot + deadline) and "Create a Project", then closes.
 *
 * Same component on mobile and desktop, so there is a single mental model.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { Calendar, Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { VoiceFirstCreateModal } from "@/components/project/studio/VoiceFirstCreateModal";

interface SwitcherProject {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  deadline?: string | null;
}

interface StudioSwitcherProps {
  projects: SwitcherProject[];
  activeProjectId?: string;
  activeTitle?: string;
  onProjectCreated?: () => void;
}

type NavFilter = "all" | "active" | "completed";

const STATUS_DOT: Record<string, string> = {
  active: "bg-[hsl(var(--energy))]",
  planning: "bg-muted-foreground/50",
  wrapping: "bg-primary",
  completed: "bg-foreground",
  archived: "bg-muted-foreground/30",
};

const FILTERS: { id: NavFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export function StudioSwitcher({
  projects,
  activeProjectId,
  activeTitle,
  onProjectCreated,
}: StudioSwitcherProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NavFilter>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...projects]
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .filter((p) => {
        if (filter === "active" && p.status !== "active") return false;
        if (filter === "completed" && p.status !== "completed") return false;
        if (q && !p.title.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [projects, query, filter]);

  const current = projects.find((p) => p.id === activeProjectId);
  const label = activeTitle ?? current?.title ?? "Studios";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Switch project"
            className="h-9 shrink-0 gap-1.5 px-2 text-sm font-semibold"
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                STATUS_DOT[current?.status ?? ""] ?? "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            <span className="max-w-[9rem] truncate sm:max-w-[14rem]">{label}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden p-0"
        >
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    filter === f.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="max-h-72">
            <div className="space-y-0.5 p-2">
              {visible.map((p) => {
                const deadline = p.deadline ? new Date(p.deadline) : null;
                const overdue = deadline ? isPast(deadline) && p.status !== "completed" : false;
                const active = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      if (!active) navigate(`/desk/${p.id}`);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        STATUS_DOT[p.status ?? ""] ?? "bg-muted-foreground/50",
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{p.title}</span>
                    {deadline && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 text-[10px]",
                          overdue
                            ? "font-semibold text-[hsl(var(--energy))]"
                            : "text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-2.5 w-2.5" aria-hidden />
                        {format(deadline, "MMM d")}
                      </span>
                    )}
                    {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                  </button>
                );
              })}

              {visible.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  {projects.length === 0
                    ? "No projects yet."
                    : "No projects match that search or filter."}
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => {
                setOpen(false);
                setShowCreate(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create a Project
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <VoiceFirstCreateModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={() => {
          setShowCreate(false);
          onProjectCreated?.();
        }}
      />
    </>
  );
}

export default StudioSwitcher;
