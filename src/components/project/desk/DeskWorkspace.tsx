/**
 * DeskWorkspace — the column right of the sidebar: topbar, the stack of
 * always-on rails and banners, the scrolling work area, and the optional
 * desktop quick panel.
 *
 * Owning the quick panel here is what makes the simplified user view
 * possible: the panel is a power-user affordance, so it is opt-in and
 * remembered per user rather than pushed at everyone on first load, and it
 * never renders at all in the Studio Room (where the room itself is
 * already the full picture).
 */
import type { ReactNode } from "react";
import { X, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeskWorkspaceProps {
  topbar: ReactNode;
  /** Rails and banners that sit between the topbar and the scroll area. */
  rails?: ReactNode;
  children: ReactNode;
  /** Omit entirely to hide the quick panel (e.g. in the Studio Room). */
  quickPanel?: ReactNode;
  quickPanelOpen?: boolean;
  onQuickPanelOpenChange?: (open: boolean) => void;
}

export function DeskWorkspace({
  topbar,
  rails,
  children,
  quickPanel,
  quickPanelOpen,
  onQuickPanelOpenChange,
}: DeskWorkspaceProps) {
  const hasPanel = Boolean(quickPanel);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {topbar}
      {rails}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {children}

        {hasPanel && !quickPanelOpen && (
          <div className="hidden shrink-0 items-start pr-2 pt-3 xl:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuickPanelOpenChange?.(true)}
              aria-label="Show quick panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          </div>
        )}

        {hasPanel && quickPanelOpen && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-card/30 xl:block">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Panel
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onQuickPanelOpenChange?.(false)}
                aria-label="Hide quick panel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {quickPanel}
          </aside>
        )}
      </div>
    </div>
  );
}

export default DeskWorkspace;
