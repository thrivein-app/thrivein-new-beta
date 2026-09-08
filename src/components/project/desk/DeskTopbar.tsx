/**
 * DeskTopbar — the Desk's single 56px header row: the project switcher on
 * the left, the project identity in the middle, the project's own menu on
 * the right. The old sidebar toggles are gone: switching project is now an
 * overlay (StudioSwitcher) that never resizes the workspace.
 */
import type { ReactNode } from "react";

interface DeskTopbarProps {
  /** Project switcher / left-hand controls. */
  leading?: ReactNode;
  /** Project identity block. */
  children: ReactNode;
  /** Right-aligned actions (settings menu, etc.). */
  actions?: ReactNode;
}

export function DeskTopbar({ leading, children, actions }: DeskTopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
      {leading}
      {leading && <span className="hidden text-muted-foreground/40 sm:inline">/</span>}
      {children}
      {actions}
    </header>
  );
}

export default DeskTopbar;
