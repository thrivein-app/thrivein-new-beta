import { Link, useLocation } from "react-router-dom";
import { Sun, BadgeCheck, Compass, LayoutGrid, UserSearch, Wallet, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";
import { useAccountTone } from "@/hooks/useAccountTone";

/**
 * Responsive counterpart of the laptop navigation.
 *
 * The order, labels, icons and selected state intentionally mirror Navbar:
 * Today · Studio · Scout · Passport.
 * Company/business accounts keep their existing B2B nav unchanged.
 */
const CREATIVE_ITEMS = [
  { path: "/", icon: Sun, label: "Today", hint: "Today — what to move forward" },
  { path: "/desk", icon: LayoutGrid, label: "Studio", hint: "Projects, rooms, files, tasks" },
  { path: "/scout", icon: Compass, label: "Scout", hint: "Scouted gigs matched to you" },
  { path: "/profile", icon: BadgeCheck, label: "Passport", hint: "Your verified creative identity" },
];

const COMPANY_ITEMS = [
  { path: "/desk", icon: LayoutGrid, label: "Studios", hint: "Your briefs & active projects" },
  { path: "/opportunities", icon: Briefcase, label: "Gigs", hint: "Roles you've posted & talent pool" },
  { path: "/talent-finder", icon: UserSearch, label: "Talent", hint: "Find creators to hire" },
  { path: "/thrivepay", icon: Wallet, label: "Pay", hint: "Pay creators & manage invoices" },
];

const KretopiaBottomNav = memo(() => {
  const location = useLocation();
  const { isBusiness } = useAccountTone();

  const items = isBusiness ? COMPANY_ITEMS : CREATIVE_ITEMS;

  // Hide when a Radix dialog/sheet/drawer is open (keeps parity with legacy BottomNav).
  const [overlayOpen, setOverlayOpen] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const check = () => {
      const locked =
        document.body.hasAttribute("data-scroll-locked") ||
        !!document.querySelector(
          '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"]'
        );
      setOverlayOpen(locked);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scroll-locked", "style"],
      childList: true,
      subtree: true,
    });
    return () => obs.disconnect();
  }, []);

  if (location.pathname === "/auth") return null;
  if (overlayOpen) return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/scout") {
      return (
        location.pathname.startsWith("/scout") ||
        location.pathname === "/opportunities" ||
        location.pathname.startsWith("/opportunity") ||
        location.pathname === "/discover"
      );
    }
    if (path === "/profile") {
      return (
        location.pathname.startsWith("/profile") ||
        location.pathname.startsWith("/passport") ||
        location.pathname.startsWith("/thrivepay") ||
        location.pathname.startsWith("/accounting") ||
        location.pathname.startsWith("/credits")
      );
    }
    if (path === "/desk") return location.pathname.startsWith("/desk");
    return location.pathname === path;
  };

  return (
    <nav
      data-bottom-nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/60 bg-background"
      role="navigation"
      aria-label="Mobile navigation"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
    >
      <div className="grid grid-cols-4 gap-1.5 px-2 py-2 sm:gap-2 sm:px-4">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              title={item.hint}
              aria-label={`${item.label} — ${item.hint}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-xs font-medium transition-colors min-h-[44px] sm:gap-2 sm:px-3 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "touch-manipulation select-none active:scale-95",
                active
                  ? "border-border bg-foreground/[0.04] text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-foreground/[0.02] hover:text-foreground"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

KretopiaBottomNav.displayName = "KretopiaBottomNav";
export default KretopiaBottomNav;
