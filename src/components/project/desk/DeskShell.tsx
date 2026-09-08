/**
 * DeskShell — the Desk's one layout frame.
 *
 * Before this, /desk/:id built its whole chrome inline in ThriveDesk.tsx:
 * the flex container, the mobile scrim, the sidebar wrapper, the topbar and
 * the workspace column were 200 lines of markup interleaved with data
 * fetching and tab state. Four components now own that chrome
 * (DeskShell / DeskSidebar / DeskTopbar / DeskWorkspace) so the page reads
 * as composition and every Desk surface inherits the same viewport maths,
 * the same safe-area clearance and the same scroll containment.
 */
import type { ReactNode } from "react";

interface DeskShellProps {
  /** <DeskSidebar> */
  sidebar: ReactNode;
  /** Everything to the right of the sidebar — normally <DeskWorkspace>. */
  children: ReactNode;
  /** Mobile drawer state, owned by the page. */
  mobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
}

export function DeskShell({
  sidebar,
  children,
  mobileSidebarOpen,
  onCloseMobileSidebar,
}: DeskShellProps) {
  return (
    <div className="flex h-[calc(100dvh-4rem)] touch-pan-y flex-col overflow-hidden bg-background pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:h-[100dvh] lg:flex-row lg:pb-0">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobileSidebar}
          aria-hidden
        />
      )}
      {sidebar}
      {children}
    </div>
  );
}

export default DeskShell;
