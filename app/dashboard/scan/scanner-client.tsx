"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CouponInfo = {
  id: string;
  code: string;
  status: string;
  title: string;
  description: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  expiresAt: string;
  maxUses: number;
};

export function ScannerClient() {
  const [manualCode, setManualCode] = useState("");
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [error, setError] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerId = "qr-scanner-container";

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanner() {
    const { Html5Qrcode } = await import("html5-qrcode");
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
    }
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    setScannerActive(true);

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await scanner.stop();
          setScannerActive(false);
          const code = extractCode(decodedText);
          await validateCode(code);
        },
        () => {}
      );
    } catch {
      setError("Camera access denied or not available.");
      setScannerActive(false);
    }
  }

  function stopScanner() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setScannerActive(false);
  }

  function extractCode(text: string) {
    try {
      const url = new URL(text);
      const parts = url.pathname.split("/");
      return parts[parts.length - 1];
    } catch {
      return text.trim();
    }
  }

  async function validateCode(code: string) {
    setError("");
    setCoupon(null);
    setRedeemed(false);
    if (!code) return;

    const res = await fetch(`/api/coupons/${encodeURIComponent(code)}/validate`);
    if (!res.ok) {
      let message = "Coupon not found";
      try { const body = await res.json(); message = body.error || message; } catch {}
      setError(message);
      return;
    }
    const data = await res.json();
    setCoupon(data);
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    const code = extractCode(manualCode);
    await validateCode(code);
  }

  async function handleRedeem() {
    if (!coupon) return;
    setRedeemLoading(true);
    const res = await fetch(`/api/coupons/${coupon.code}/redeem`, { method: "POST" });
    if (!res.ok) {
      let message = "Failed to redeem";
      try { const body = await res.json(); message = body.error || message; } catch {}
      setError(message);
    } else {
      setRedeemed(true);
      setCoupon((prev) => prev ? { ...prev, status: "REDEEMED" } : null);
    }
    setRedeemLoading(false);
  }

  function reset() {
    setCoupon(null);
    setError("");
    setRedeemed(false);
    setManualCode("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={scannerActive ? stopScanner : startScanner}
              variant={scannerActive ? "outline" : "default"}
            >
              {scannerActive ? "Stop camera" : "Use camera"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={!coupon && !error}>
              Reset
            </Button>
          </div>

          <div id={containerId} className={scannerActive ? "w-full rounded-lg overflow-hidden" : "hidden"} />

          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Paste coupon URL or code"
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              Check
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {coupon && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{coupon.title}</CardTitle>
              <StatusBadge status={coupon.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {coupon.description && (
              <p className="text-sm text-gray-600">{coupon.description}</p>
            )}
            {coupon.recipientName && (
              <div>
                <p className="text-xs text-gray-400">Recipient</p>
                <p className="font-medium">{coupon.recipientName}</p>
                {coupon.recipientPhone && (
                  <p className="text-sm text-gray-500">{coupon.recipientPhone}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Expires</p>
              <p className="text-sm">{new Date(coupon.expiresAt).toLocaleDateString()}</p>
            </div>

            {redeemed && (
              <p className="text-green-700 font-semibold text-sm">
                Coupon successfully redeemed!
              </p>
            )}

            {coupon.status === "ACTIVE" && !redeemed && (
              <Button
                onClick={handleRedeem}
                disabled={redeemLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {redeemLoading ? "Marking as used…" : "Mark as redeemed"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Valid</Badge>;
  if (status === "REDEEMED") return <Badge variant="secondary">Used</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Expired</Badge>;
}
