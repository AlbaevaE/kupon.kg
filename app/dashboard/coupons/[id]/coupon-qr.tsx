"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CouponQR({ code, publicUrl }: { code: string; publicUrl: string }) {
  const [copied, setCopied] = useState(false);
  const qrSrc = `/api/coupons/${code}/qr`;

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-4 flex justify-center bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="QR code" width={200} height={200} className="rounded" />
      </div>
      <div className="flex gap-2">
        <a
          href={qrSrc}
          download={`coupon-${code.slice(0, 8)}.png`}
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors"
        >
          Download PNG
        </a>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted transition-colors"
        >
          Open page
        </a>
      </div>
    </div>
  );
}
