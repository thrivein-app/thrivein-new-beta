import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";
import kMarkAsset from "@/assets/brand/kretopia-k-mark.png.asset.json";
import { cn } from "@/lib/utils";

interface KretopiaQRCodeProps {
  value: string;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

const QR_SIZE = 240;

/** The canonical Kretopia pass QR: shared by event and Creative Passport passes. */
export function KretopiaQRCode({
  value,
  id,
  className,
  ariaLabel = "Kretopia QR code",
}: KretopiaQRCodeProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || !hostRef.current) return;

    let cancelled = false;
    hostRef.current.innerHTML = "";

    const baseOptions = {
      width: QR_SIZE,
      height: QR_SIZE,
      data: value,
      margin: 8,
      qrOptions: { errorCorrectionLevel: "H" as const },
      dotsOptions: {
        type: "extra-rounded" as const,
        gradient: {
          type: "linear" as const,
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: "#0B0B10" },
            { offset: 1, color: "#FF2DA1" },
          ],
        },
      },
      cornersSquareOptions: { color: "#FF2DA1", type: "extra-rounded" as const },
      cornersDotOptions: { color: "#0B0B10", type: "dot" as const },
      backgroundOptions: { color: "#ffffff" },
    };

    const render = (withLogo: boolean) => {
      if (cancelled || !hostRef.current) return;
      const qr = new QRCodeStyling(
        withLogo
          ? {
              ...baseOptions,
              image: kMarkAsset.url,
              imageOptions: {
                hideBackgroundDots: true,
                imageSize: 0.3,
                margin: 6,
                crossOrigin: "anonymous",
              },
            }
          : baseOptions,
      );
      qr.append(hostRef.current);
    };

    const probe = new Image();
    probe.onload = () => render(true);
    probe.onerror = () => render(false);
    probe.src = kMarkAsset.url;

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      id={id}
      ref={hostRef}
      role="img"
      aria-label={ariaLabel}
      className={cn(
        "h-[264px] w-[264px] overflow-hidden rounded-2xl bg-white p-3 shadow-[0_12px_40px_-12px_hsl(var(--energy)/0.34)] ring-1 ring-[hsl(var(--energy)/0.2)] [&>canvas]:block [&>canvas]:h-[240px] [&>canvas]:w-[240px] [&>svg]:block [&>svg]:h-[240px] [&>svg]:w-[240px]",
        className,
      )}
    />
  );
}

export default KretopiaQRCode;