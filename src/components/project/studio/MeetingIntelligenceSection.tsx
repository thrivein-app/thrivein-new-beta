import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { KretoPresence } from "@/components/brand/KretoPresence";
import { StartMeetingDialog } from "@/components/calls/StartMeetingDialog";
import { CallRecapSheet } from "@/components/calls/CallRecapSheet";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Phone, Video, ListChecks, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

interface TranscriptRow {
  id: string;
  call_id: string | null;
  status: "pending" | "transcribing" | "ready" | "failed";
  summary: string | null;
  actionCount: number;
}

interface Props {
  projectId: string;
  projectTitle?: string;
  /** Studio collaborators, used to pre-fill the invite list. */
  people?: any[];
}

const formatDuration = (sec: number | null) => {
  if (!sec || sec < 1) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

/**
 * "Calls & meetings" — the Studio-side home of Kreto Meeting Intelligence.
 *
 * Entry point to start a call with Kreto listening, plus the history of past
 * calls with their recap state (transcript ready, actions waiting).
 */
export const MeetingIntelligenceSection = ({ projectId, projectTitle, people = [] }: Props) => {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, TranscriptRow>>({});
  const [loading, setLoading] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [recapId, setRecapId] = useState<string | null>(null);
  const [kretoOn, setKretoOn] = useState(true);
  const reducedMotion = useReducedMotion();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("project_video_calls")
      .select("id, started_at, ended_at, duration_seconds")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(20);

    const rows = data ?? [];
    setCalls(rows);

    if (rows.length) {
      const { data: ts } = await supabase
        .from("call_transcripts")
        .select("id, call_id, status, summary")
        .eq("call_kind", "project")
        .in("call_id", rows.map((r) => r.id));

      const map: Record<string, TranscriptRow> = {};
      const ids = (ts ?? []).map((t) => t.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: actions } = await supabase
          .from("call_action_items")
          .select("id, transcript_id, status")
          .in("transcript_id", ids)
          .eq("status", "pending");
        (actions ?? []).forEach((a) => {
          counts[a.transcript_id] = (counts[a.transcript_id] ?? 0) + 1;
        });
      }
      (ts ?? []).forEach((t) => {
        if (!t.call_id) return;
        map[t.call_id] = {
          id: t.id,
          call_id: t.call_id,
          status: t.status as TranscriptRow["status"],
          summary: t.summary,
          actionCount: counts[t.id] ?? 0,
        };
      });
      setTranscripts(map);
    } else {
      setTranscripts({});
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load().catch((e) => {
      console.error("[MeetingIntelligence]", e);
      setLoading(false);
    });
  }, [load]);

  const invitees = useMemo(
    () =>
      (people ?? [])
        .map((p: any) => ({
          id: p?.user_id ?? p?.id,
          name: p?.full_name ?? p?.profiles?.full_name ?? p?.name ?? "Collaborator",
          avatar: p?.avatar_url ?? p?.profiles?.avatar_url ?? null,
          preselected: true,
        }))
        .filter((p) => !!p.id),
    [people],
  );

  const pendingTotal = Object.values(transcripts).reduce((n, t) => n + t.actionCount, 0);

  return (
    <section className="space-y-3 px-4 py-5">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">
            Meeting intelligence
          </p>
          <h2 className="text-lg font-black leading-none tracking-tight">Calls &amp; meetings</h2>
        </div>
        {pendingTotal > 0 && (
          <Badge variant="secondary" className="h-5 shrink-0 px-2 text-[10px]">
            {pendingTotal} to review
          </Badge>
        )}
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-3">
        <div className="flex items-start gap-3">
          <KretoPresence size="compact" state="idle" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">Start a call with Kreto</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              Kreto transcribes the call, pulls out the tasks and decisions, and suggests what to set
              up next. You can turn this off at any time.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2">
          <Label htmlFor="kreto-listens" className="text-xs font-medium leading-snug">
            Kreto listens &amp; takes notes
          </Label>
          <Switch id="kreto-listens" checked={kretoOn} onCheckedChange={setKretoOn} />
        </div>

        <Button className="mt-3 w-full gap-2" onClick={() => setStartOpen(true)}>
          <Video className="h-4 w-4" />
          Start call with Kreto
        </Button>
      </div>

      {!loading && calls.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center space-y-1.5">
          <Phone className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="text-sm font-semibold">No calls yet</p>
          <p className="text-xs text-muted-foreground leading-snug">
            Once a call ends, its recap — summary, decisions and tasks — shows up right here.
          </p>
        </div>
      )}

      {calls.length > 0 && (
        <Carousel
          opts={{ align: "start", dragFree: true, duration: reducedMotion ? 0 : 20 }}
          className="w-full"
          aria-label="Past calls"
        >
          <CarouselContent className="-ml-2">
            {calls.map((c) => {
              const t = transcripts[c.id];
              const dur = formatDuration(c.duration_seconds);
              const ready = t?.status === "ready";
              return (
                <CarouselItem key={c.id} className="basis-auto pl-2">
                  <button
                    type="button"
                    onClick={() => t && setRecapId(t.id)}
                    disabled={!t}
                    className="w-56 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-[hsl(var(--energy)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-70"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {formatDistanceToNow(new Date(c.started_at), { addSuffix: true })}
                        </p>
                        {dur && <p className="text-xs text-muted-foreground">{dur}</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ready && (
                        <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[10px]">
                          <FileText className="h-2.5 w-2.5" /> Transcript
                        </Badge>
                      )}
                      {!!t && t.actionCount > 0 && (
                        <Badge className="h-4 gap-1 border-0 bg-[hsl(var(--energy)/0.15)] px-1.5 text-[10px] text-[hsl(var(--energy))]">
                          <ListChecks className="h-2.5 w-2.5" /> {t.actionCount} actions
                        </Badge>
                      )}
                      {t && (t.status === "pending" || t.status === "transcribing") && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          Kreto is writing…
                        </Badge>
                      )}
                      {!t && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                          No notes
                        </Badge>
                      )}
                    </div>
                  </button>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      )}

      <StartMeetingDialog
        open={startOpen}
        onOpenChange={(v) => {
          setStartOpen(v);
          if (!v) void load().catch(() => {});
        }}
        source="studio"
        title={projectTitle}
        people={invitees}
        projectId={projectId}
      />

      <CallRecapSheet
        open={!!recapId}
        onOpenChange={(v) => {
          if (!v) setRecapId(null);
        }}
        transcriptId={recapId}
      />
    </section>
  );
};

export default MeetingIntelligenceSection;
