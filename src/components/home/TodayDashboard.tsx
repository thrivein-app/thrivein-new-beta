import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlarmClock, CheckCircle2, FolderKanban, Inbox, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { TodaySectionShell } from "./TodaySectionShell";

interface Metrics {
  dueToday: number;
  overdue: number;
  approvals: number;
  activeProjects: number;
  doneThisWeek: number;
}

const EMPTY: Metrics = { dueToday: 0, overdue: 0, approvals: 0, activeProjects: 0, doneThisWeek: 0 };

interface TileProps {
  icon: ReactNode;
  value: number;
  label: string;
  tone?: "default" | "urgent" | "good";
  fresh?: boolean;
  onClick: () => void;
  delay: number;
}

function Tile({ icon, value, label, tone = "default", fresh, onClick, delay }: TileProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay, ease: [0.2, 0.65, 0.3, 0.95] }}
      className={cn(
        "group relative text-left rounded-2xl border bg-background/60 px-3.5 py-3 transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        tone === "urgent"
          ? "border-destructive/30 hover:border-destructive/60"
          : tone === "good"
          ? "border-energy/25 hover:border-energy/50"
          : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-xl",
            tone === "urgent"
              ? "bg-destructive/10 text-destructive"
              : tone === "good"
              ? "bg-energy/10 text-energy"
              : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </span>
        {fresh && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Just now
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-black leading-none tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{label}</p>
    </motion.button>
  );
}

interface TodayDashboardProps {
  /** Rendered under the metrics — e.g. the Momentum projects strip. */
  children?: ReactNode;
}

/**
 * TODAY DASHBOARD — the "Progress" section rebuilt as a real, live dashboard.
 * Every number is a real count from the user's own data (tasks, approvals,
 * projects). It refreshes itself on Realtime changes and on a slow poll, so
 * the surface feels current without a page reload. Nothing here invents data:
 * a zero stays a zero.
 */
export function TodayDashboard({ children }: TodayDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const prev = useRef<Metrics>(EMPTY);

  const load = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const mine = `assigned_to.eq.${user.id},created_by.eq.${user.id}`;

    const [dueToday, overdue, approvals, activeProjects, doneThisWeek] = await Promise.all([
      supabase
        .from("project_tasks")
        .select("id", { count: "exact", head: true })
        .or(mine)
        .neq("status", "done")
        .eq("due_date", today)
        .then((r) => r.count ?? 0, () => 0),
      supabase
        .from("project_tasks")
        .select("id", { count: "exact", head: true })
        .or(mine)
        .neq("status", "done")
        .lt("due_date", today)
        .then((r) => r.count ?? 0, () => 0),
      supabase
        .from("agent_proposals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .then((r) => r.count ?? 0, () => 0),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .neq("status", "completed")
        .neq("status", "archived")
        .then((r) => r.count ?? 0, () => 0),
      supabase
        .from("project_tasks")
        .select("id", { count: "exact", head: true })
        .or(mine)
        .eq("status", "done")
        .gte("updated_at", weekAgo.toISOString())
        .then((r) => r.count ?? 0, () => 0),
    ]);

    const next: Metrics = { dueToday, overdue, approvals, activeProjects, doneThisWeek };
    const changed = loadedOnce(prev.current) && JSON.stringify(next) !== JSON.stringify(prev.current);
    prev.current = next;
    setMetrics(next);
    setUpdatedAt(new Date());
    setLoaded(true);
    if (changed) {
      setFresh(true);
      setTimeout(() => setFresh(false), 6000);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = () => {
      if (!cancelled) load().catch(() => {});
    };
    run();

    const poll = setInterval(run, 90_000);
    const channel = supabase
      .channel(`today-dashboard-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks" }, run)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_proposals" }, run)
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  if (!user || !loaded) return null;

  return (
    <TodaySectionShell
      icon={<Activity className="h-4 w-4" />}
      eyebrow="Live"
      title="Your dashboard"
      seeAllTo="/desk"
      trailing={
        updatedAt ? (
          <span className="hidden sm:inline text-[10px] text-muted-foreground">
            Updated {updatedAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Tile
          icon={<AlarmClock className="h-3.5 w-3.5" />}
          value={metrics.overdue}
          label={metrics.overdue > 0 ? "Overdue — needs you" : "Nothing overdue"}
          tone={metrics.overdue > 0 ? "urgent" : "good"}
          fresh={fresh}
          onClick={() => navigate("/desk")}
          delay={0}
        />
        <Tile
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          value={metrics.dueToday}
          label="Due today"
          fresh={fresh}
          onClick={() => navigate("/desk")}
          delay={0.05}
        />
        <Tile
          icon={<Inbox className="h-3.5 w-3.5" />}
          value={metrics.approvals}
          label="Kreto waiting on you"
          fresh={fresh}
          onClick={() => navigate("/inbox")}
          delay={0.1}
        />
        <Tile
          icon={<FolderKanban className="h-3.5 w-3.5" />}
          value={metrics.activeProjects}
          label="Studios in motion"
          tone="good"
          onClick={() => navigate("/desk")}
          delay={0.15}
        />
      </div>

      {metrics.doneThisWeek > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          <span className="font-bold text-foreground tabular-nums">{metrics.doneThisWeek}</span> done this week — Kreto is
          keeping score.
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </TodaySectionShell>
  );
}

function loadedOnce(m: Metrics) {
  return m !== EMPTY;
}

export default TodayDashboard;
