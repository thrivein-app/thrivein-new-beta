/**
 * DeskSidebar — the Desk's project navigator, with real progressive
 * disclosure instead of an on/off switch.
 *
 * Previously "collapsed" meant `lg:w-0` — the sidebar simply vanished, so
 * moving between projects always cost a round trip through the toggle. The
 * collapsed state is now a 56px rail: the projects you actually switch
 * between stay one click away as initial chips (most recently updated
 * first), with the active one marked, plus a "new" affordance. Expanding
 * reveals the full navigator (search, filters, deadlines) unchanged.
 *
 * Mobile behaviour is untouched: an off-canvas drawer over a scrim.
 */
import { Plus, PanelLeftOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WorkspaceSidebar } from "@/components/project/WorkspaceSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProject {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  deadline?: string | null;
}

interface DeskSidebarProps {
  projects: SidebarProject[];
  activeProjectId?: string;
  /** Mobile drawer. */
  open: boolean;
  onClose: () => void;
  /** Desktop: false renders the compact rail rather than hiding the sidebar. */
  expanded: boolean;
  onExpand: () => void;
  onProjectCreated?: () => void;
}

const RAIL_LIMIT = 6;

function initials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function DeskSidebar({
  projects,
  activeProjectId,
  open,
  onClose,
  expanded,
  onExpand,
  onProjectCreated,
}: DeskSidebarProps) {
  const navigate = useNavigate();

  const recent = [...projects]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .slice(0, RAIL_LIMIT);

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-all duration-200 lg:relative",
        open ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0",
        expanded ? "lg:w-64" : "lg:w-14 lg:overflow-hidden",
      )}
    >
      {/* Full navigator — always the mobile drawer's content, and the
          desktop content once expanded. */}
      <div className={cn("h-full", expanded ? "" : "lg:hidden")}>
        <WorkspaceSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onClose={onClose}
          onProjectCreated={onProjectCreated}
        />
      </div>

      {/* Collapsed rail — desktop only. */}
      {!expanded && (
        <nav
          aria-label="Recent projects"
          className="hidden h-full flex-col items-center gap-1.5 py-3 lg:flex"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onExpand}
                aria-label="Show all projects"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Show all projects</TooltipContent>
          </Tooltip>

          <div className="my-1 h-px w-6 bg-border" aria-hidden />

          {recent.map((p) => {
            const active = p.id === activeProjectId;
            return (
              <Tooltip key={p.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => navigate(`/desk/${p.id}`)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {initials(p.title)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{p.title}</TooltipContent>
              </Tooltip>
            );
          })}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onExpand}
                aria-label="New project"
                className="mt-1 grid h-9 w-9 place-items-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">New project</TooltipContent>
          </Tooltip>
        </nav>
      )}
    </div>
  );
}

export default DeskSidebar;
