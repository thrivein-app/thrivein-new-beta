import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Check, Copy, Loader2, Square, ArrowUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { KretoMark } from "@/components/brand/KretoMark";
import { streamCopilot, extractActions, type CopilotMessage } from "@/lib/thriveCopilot";
import { cn } from "@/lib/utils";

/**
 * KretoAnswerModal — the centered, full-answer surface for "Ask Kreto
 * anything" on Today. Deliberately NOT the side drawer: the answer is the
 * main event here, so it gets the middle of the screen, generous reading
 * width, and streams token-by-token so the first words land instantly.
 * Reuses the existing streamCopilot engine (same thread, same limits) —
 * no new backend.
 */

interface KretoAnswerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The question to answer. Streaming starts the moment it's set. */
  prompt: string | null;
}

export function KretoAnswerModal({ open, onOpenChange, prompt }: KretoAnswerModalProps) {
  const [turns, setTurns] = useState<CopilotMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const startedFor = useRef<string | null>(null);

  const run = useCallback(async (question: string, history: CopilotMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setError(null);
    setAnswer("");
    let acc = "";
    await streamCopilot({
      messages: [...history, { role: "user", content: question }].slice(-8),
      surface: "home",
      onDelta: (d) => {
        acc += d;
        setAnswer(acc);
      },
      onDone: () => {
        setStreaming(false);
        setTurns((t) => [...t, { role: "user", content: question }, { role: "assistant", content: acc }]);
      },
      onError: (e) => {
        setStreaming(false);
        setError(e);
      },
      signal: controller.signal,
    });
  }, []);

  // Kick off as soon as a prompt arrives.
  useEffect(() => {
    if (!open || !prompt) return;
    if (startedFor.current === prompt) return;
    startedFor.current = prompt;
    setTurns([]);
    void run(prompt, []);
  }, [open, prompt, run]);

  // Reset when closed so the next question starts clean.
  useEffect(() => {
    if (open) return;
    abortRef.current?.abort();
    startedFor.current = null;
    setAnswer("");
    setTurns([]);
    setError(null);
    setStreaming(false);
    setFollowUp("");
  }, [open]);

  // Keep the newest text in view while it streams.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [answer, turns.length]);

  const visible = extractActions(answer).visible;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(visible);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  };

  const askFollowUp = () => {
    const q = followUp.trim();
    if (!q || streaming) return;
    setFollowUp("");
    void run(q, turns);
  };

  const priorTurns = turns.slice(0, -1); // everything except the answer currently rendered live

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden rounded-3xl border-border/70 bg-card"
        aria-describedby={undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
          <KretoMark size="sm" state={streaming ? "active" : "idle"} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Kreto</p>
            <h2 className="text-sm font-semibold text-foreground truncate">
              {prompt ?? "Ask Kreto anything"}
            </h2>
          </div>
          {streaming ? (
            <button
              type="button"
              onClick={() => { abortRef.current?.abort(); setStreaming(false); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Square className="h-3 w-3" /> Stop
            </button>
          ) : (
            visible && (
              <button
                type="button"
                onClick={copy}
                aria-label="Copy answer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )
          )}
        </div>

        {/* Answer */}
        <div
          ref={scrollRef}
          className="max-h-[62vh] overflow-y-auto px-5 py-4 space-y-5 overscroll-contain"
        >
          {priorTurns.map((t, i) => (
            <div key={i} className={cn(t.role === "user" && "flex justify-end")}>
              {t.role === "user" ? (
                <p className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {t.content}
                </p>
              ) : (
                <Markdown text={extractActions(t.content).visible} />
              )}
            </div>
          ))}

          {!visible && streaming && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Kreto is answering…
            </p>
          )}

          {visible && <Markdown text={visible} />}

          {error && (
            <p className="text-sm text-destructive">
              {error}{" "}
              <button
                type="button"
                onClick={() => prompt && run(prompt, turns)}
                className="underline font-semibold"
              >
                Retry
              </button>
            </p>
          )}
        </div>

        {/* Follow-up */}
        <form
          onSubmit={(e) => { e.preventDefault(); askFollowUp(); }}
          className="flex items-center gap-2 border-t border-border/60 px-3 py-3"
        >
          <input
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Ask a follow-up…"
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !followUp.trim()}
            aria-label="Send follow-up"
            className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform disabled:opacity-40 enabled:hover:scale-105"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed prose-p:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-2">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{text}</ReactMarkdown>
    </div>
  );
}

export default KretoAnswerModal;
