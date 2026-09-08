import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KretoPresence } from "@/components/brand/KretoPresence";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Caption {
  text: string;
  speaker?: string | null;
  at?: string | number | null;
}

interface Props {
  /** The call row id (project_video_calls.id / direct_video_calls.id / meetings.id). */
  callId: string | null;
  /** Which family of call this is — matches call_transcripts.call_kind. */
  callKind?: "project" | "direct" | "circle" | "meeting" | "event";
  /** When false, Kreto is muted for this call and nothing is captured. */
  enabled?: boolean;
  className?: string;
}

/** Words that mark a line worth highlighting in the live feed. */
const SIGNAL_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "Decision", re: /\b(we(?:'ll| will)|let'?s|decided|agreed|going with)\b/i },
  { label: "Deadline", re: /\b(by |before |due |deadline|friday|monday|tuesday|wednesday|thursday|next week|tomorrow)\b/i },
  { label: "Action", re: /\b(i'?ll|you'?ll|can you|need to|send|share|book|draft|follow up)\b/i },
];

function signalFor(text: string): string | null {
  for (const s of SIGNAL_PATTERNS) if (s.re.test(text)) return s.label;
  return null;
}

/**
 * Kreto's live note panel for an in-progress call. It mirrors the rolling
 * captions Kreto writes to `call_transcripts.live_captions` and flags the
 * moments that usually turn into tasks — decisions, deadlines, commitments.
 *
 * Read-only and best-effort: if no transcript row exists yet, it simply shows
 * the listening state instead of erroring.
 */
export const KretoLiveNotes = ({
  callId,
  callKind = "project",
  enabled = true,
  className,
}: Props) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!callId || !enabled) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("call_transcripts")
        .select("id, live_captions")
        .eq("call_kind", callKind)
        .eq("call_id", callId)
        .maybeSingle();
      if (cancelled || !data) return;
      setTranscriptId(data.id);
      setCaptions(Array.isArray(data.live_captions) ? (data.live_captions as unknown as Caption[]) : []);
    };

    void load().catch((e) => console.error("[KretoLiveNotes load]", e));

    const channel = supabase
      .channel(`kreto-live-${callKind}-${callId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_transcripts", filter: `call_id=eq.${callId}` },
        () => void load().catch(() => {}),
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [callId, callKind, enabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [captions.length]);

  const lines = useMemo(
    () => captions.filter((c) => typeof c?.text === "string" && c.text.trim().length > 0),
    [captions],
  );

  if (!enabled) {
    return (
      <aside className={cn("rounded-2xl border border-dashed border-border/60 p-4 text-center", className)}>
        <p className="text-sm font-semibold">Kreto is off for this call</p>
        <p className="mt-1 text-xs text-muted-foreground leading-snug">
          No transcript, no notes, nothing stored. Turn Kreto on before the next call to get tasks out of it.
        </p>
      </aside>
    );
  }

  return (
    <aside
      className={cn("flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card/40", className)}
      aria-live="polite"
      aria-label="Kreto live notes"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <KretoPresence size="micro" state="listening" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-none">Kreto live notes</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {lines.length > 0 ? "Listening — key moments get flagged" : "Kreto is listening…"}
          </p>
        </div>
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--energy))] motion-safe:animate-pulse"
          aria-hidden
        />
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-2 p-3">
          {lines.length === 0 && (
            <li className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground leading-snug">
              Nothing captured yet. As soon as people start talking, the notes show up here — and the
              full recap with tasks lands right after the call.
            </li>
          )}
          {lines.map((c, i) => {
            const signal = signalFor(c.text);
            return (
              <li key={`${i}-${c.text.slice(0, 12)}`} className="text-sm leading-snug">
                {c.speaker && (
                  <span className="mr-1.5 text-[11px] font-semibold text-muted-foreground">{c.speaker}</span>
                )}
                <span>{c.text}</span>
                {signal && (
                  <Badge variant="outline" className="ml-2 h-4 px-1.5 align-middle text-[10px]">
                    {signal}
                  </Badge>
                )}
              </li>
            );
          })}
          <div ref={bottomRef} />
        </ul>
      </ScrollArea>

      {transcriptId && (
        <footer className="border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
          Full recap — summary, decisions, tasks — arrives a minute or two after you hang up.
        </footer>
      )}
    </aside>
  );
};

export default KretoLiveNotes;
