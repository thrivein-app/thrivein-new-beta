/**
 * DeskTopbar — the Desk's single 56px header row: sidebar controls on the
 * left, the project identity in the middle, the project's own menu on the
 * right. Extracted verbatim from ThriveDesk.tsx so every Desk route shares
 * one header rather than re-deriving its own.
 */
import type { ReactNode } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeskTopbarProps {
  onOpenMobileSidebar: () => void;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  /** Project identity block. */
  children: ReactNode;
  /** Right-aligned actions (settings menu, etc.). */
  actions?: ReactNode;
}

export function DeskTopbar({
  onOpenMobileSidebar,
  sidebarExpanded,
  onToggleSidebar,
  children,
  actions,
}: DeskTopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onOpenMobileSidebar}
        aria-label="Show projects"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden shrink-0 lg:inline-flex"
        onClick={onToggleSidebar}
        aria-label={sidebarExpanded ? "Collapse projects" : "Expand projects"}
        title={sidebarExpanded ? "Collapse projects" : "Expand projects"}
      >
        {sidebarExpanded ? (
          <PanelLeftClose className="h-5 w-5" />
        ) : (
          <PanelLeftOpen className="h-5 w-5" />
        )}
      </Button>
      {children}
      {actions}
    </header>
  );
}

export default DeskTopbar;
