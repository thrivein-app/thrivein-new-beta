import { useMemo, useState } from "react";
import { Copy, Check, Share2, Mail, MessageCircle, ChevronDown, Link2 } from "lucide-react";
import {
  GlassModal,
  GlassModalContent,
  GlassModalHeader,
  GlassModalTitle,
  GlassModalDescription,
  GlassModalTrigger,
} from "@/components/ui/glass/GlassModal";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "@/hooks/use-toast";
import { getProfessionLayout } from "@/lib/passport/professionProfiles";
import { targetsFor, type ShareTargetMeta } from "@/lib/passport/shareTargets";

interface Props {
  userId: string;
  profile: { full_name?: string | null; role?: string | null; sub_roles?: string[] | null; passport_profession?: string | null };
  /** Whether the user has a paid plan — controls Site availability. */
  canPublishSite?: boolean;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Profession-aware share modal. Centered Liquid Glass dialog (focus trap +
 * Escape-close via Radix) listing share targets ordered by what makes the
 * user bookable — comp card for models, EPK for musicians, reel for
 * filmmakers, etc.
 */
export const PassportShareSheet = ({
  userId,
  profile,
  canPublishSite = false,
  trigger,
  defaultOpen,
  onOpenChange,
}: Props) => {
  const layout = useMemo(() => getProfessionLayout(profile), [profile]);
  const targets = useMemo(() => targetsFor(layout.shareTargets), [layout]);
  const availableTargets = useMemo(
    () => targets.filter((target) => !target.paidOnly || canPublishSite),
    [canPublishSite, targets],
  );
  const [selectedId, setSelectedId] = useState<string>(availableTargets[0]?.id ?? "profile");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const selectedTarget = availableTargets.find((target) => target.id === selectedId) ?? availableTargets[0];

  const copy = async (t: ShareTargetMeta, silent = false) => {
    try {
      await navigator.clipboard.writeText(t.href(userId));
      if (!silent) {
        setCopiedId(t.id);
        setTimeout(() => setCopiedId(null), 1500);
      }
      toast({ title: "Link copied", description: t.label });
      return true;
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
      return false;
    }
  };

  const nativeShare = async (t: ShareTargetMeta) => {
    const url = t.href(userId);
    const title = profile.full_name ? `${profile.full_name} — ${t.shortLabel}` : t.label;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user canceled */
      }
    }
    void copy(t);
  };

  const whatsapp = (t: ShareTargetMeta) =>
    `https://wa.me/?text=${encodeURIComponent(`${profile.full_name ?? "Passport"} — ${t.label}: ${t.href(userId)}`)}`;
  const email = (t: ShareTargetMeta) =>
    `mailto:?subject=${encodeURIComponent(`${profile.full_name ?? "Creative"} — ${t.shortLabel}`)}&body=${encodeURIComponent(
      `Take a look at ${profile.full_name ?? "my"} ${t.label.toLowerCase()} on Kretopia:\n\n${t.href(userId)}`,
    )}`;

  if (!selectedTarget) return null;

  const shareActions = [
    {
      label: "Share anywhere",
      description: "Apps & AirDrop",
      icon: Share2,
      onClick: () => nativeShare(selectedTarget),
    },
    {
      label: "WhatsApp",
      description: "Send directly",
      icon: MessageCircle,
      href: whatsapp(selectedTarget),
    },
    {
      label: "Email",
      description: "Personal message",
      icon: Mail,
      href: email(selectedTarget),
    },
    {
      label: copiedId === selectedTarget.id ? "Copied" : "Copy link",
      description: "Paste anywhere",
      icon: copiedId === selectedTarget.id ? Check : Copy,
      onClick: () => copy(selectedTarget),
    },
  ];

  return (
    <GlassModal open={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <GlassModalTrigger asChild>{trigger}</GlassModalTrigger>}
      <GlassModalContent className="overflow-hidden border-border bg-card p-0 sm:max-w-lg sm:p-0">
        <div className="relative border-b border-border bg-muted/30 px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[hsl(var(--signal-pink))] via-[hsl(var(--signal-amber))] to-[hsl(var(--signal-teal))]" />
          <BrandLogo size="md" className="mb-7" />
          <GlassModalHeader className="space-y-2 text-left">
            <GlassModalTitle className="text-2xl font-black leading-tight">
              Share your {layout.label}
            </GlassModalTitle>
            <GlassModalDescription className="max-w-sm text-sm leading-relaxed">
              Put your work, credits and creative identity in the right hands.
            </GlassModalDescription>
          </GlassModalHeader>
        </div>

        <div className="space-y-5 px-5 pb-6 pt-5 sm:px-7 sm:pb-7">
          <div className="space-y-2">
            <label htmlFor="passport-share-target" className="text-xs font-semibold text-muted-foreground">
              What are you sharing?
            </label>
            <div className="relative">
              <select
                id="passport-share-target"
                value={selectedTarget.id}
                onChange={(event) => setSelectedId(event.target.value)}
                className="h-12 w-full appearance-none rounded-md border border-border bg-background px-4 pr-10 text-sm font-semibold text-foreground outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {availableTargets.map((target) => (
                  <option key={target.id} value={target.id}>{target.label}</option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/25 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Link2 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{selectedTarget.label}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedTarget.href(userId)}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2" aria-label="Share options">
            {shareActions.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background transition-colors group-hover:border-primary/50 group-hover:bg-primary/10">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
                  <span className="sr-only">{action.description}</span>
                </>
              );

              return action.href ? (
                <Button key={action.label} asChild variant="ghost" className="group h-auto min-w-0 flex-col gap-2 px-1 py-2 text-foreground">
                  <a href={action.href} target={action.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={`${action.label}: ${action.description}`}>
                    {content}
                  </a>
                </Button>
              ) : (
                <Button key={action.label} variant="ghost" className="group h-auto min-w-0 flex-col gap-2 px-1 py-2 text-foreground" onClick={action.onClick} aria-label={`${action.label}: ${action.description}`}>
                  {content}
                </Button>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-muted-foreground">
            Powered by Kretopia · Your Creative Passport
          </p>
        </div>
      </GlassModalContent>
    </GlassModal>
  );
};
