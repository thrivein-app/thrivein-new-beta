import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/BrandLogo";
import { HoloCard } from "@/components/passport/HoloCard";
import { KretopiaQRCode } from "@/components/brand/KretopiaQRCode";
import { passportId } from "@/lib/passportId";

interface ProfileQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  /** Kept for compatibility; official passes always use the Kretopia mark. */
  userAvatar?: string;
}

export const ProfileQRDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
}: ProfileQRDialogProps) => {
  const { toast } = useToast();
  const connectUrl = `https://www.kretopia.com/profile/${userId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(connectUrl);
      toast({
        title: "Link Copied!",
        description: "Share this link to connect with others",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const qrHost = document.getElementById("profile-qr-code");
    const qrCanvas = qrHost?.querySelector("canvas");
    if (!qrCanvas) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 1200;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qrCanvas, 100, 170, 800, 800);
    ctx.fillStyle = "#0B0B10";
    ctx.font = "700 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(userName, canvas.width / 2, 92);
    ctx.font = "500 28px monospace";
    ctx.fillText(passportId(userId), canvas.width / 2, 1045);
    ctx.font = "500 28px sans-serif";
    ctx.fillText("Scan to open this Creative Passport", canvas.width / 2, 1110);

    const downloadLink = document.createElement("a");
    downloadLink.download = `kretopia-${userName.replace(/\s+/g, "-")}.png`;
    downloadLink.href = canvas.toDataURL("image/png");
    downloadLink.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${userName} on Kretopia`,
          text: `Scan my QR code or use this link to connect with me on Kretopia`,
          url: connectUrl,
        });
      } catch (error) {
        // User cancelled share or error occurred
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 bg-transparent p-0 shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>Your Creative Passport QR code</DialogTitle>
        </DialogHeader>

        <HoloCard maxTilt={4}>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
            <div className="relative overflow-hidden bg-background px-5 pb-6 pt-5 text-center">
              <div aria-hidden className="passport-qr-header-glow pointer-events-none absolute inset-0" />
              <div className="relative flex flex-col items-center">
                <BrandLogo size="sm" lockup />
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--energy))]">
                  Creative Passport
                </p>
                <h2 className="mt-2 text-xl font-bold leading-tight text-foreground">{userName}</h2>
                <p className="mt-1 font-mono text-[11px] tracking-wide text-muted-foreground">{passportId(userId)}</p>
              </div>
            </div>

            <div className="relative h-3 bg-card">
              <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
              <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
              <div className="mx-3 mt-1.5 border-t border-dashed border-border" />
            </div>

            <div className="relative px-5 pb-5 pt-5">
              <div aria-hidden className="passport-qr-glow pointer-events-none absolute -inset-x-2 top-2 h-64 rounded-[32px] blur-2xl" />
              <div className="relative flex flex-col items-center">
                <KretopiaQRCode id="profile-qr-code" value={connectUrl} ariaLabel={`QR code for ${userName}'s Creative Passport`} />
                <p className="mt-3 text-center text-sm text-muted-foreground">Scan to open this Creative Passport</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 px-5 pb-5">
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button onClick={handleShare} variant="outline" size="sm" className="gap-1.5">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button onClick={handleCopyLink} variant="outline" size="sm" className="gap-1.5">
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <p className="pb-5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground/50">
              Kretopia · Where Creativity Lives
            </p>
          </div>
        </HoloCard>
      </DialogContent>
    </Dialog>
  );
};
