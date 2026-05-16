"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SelfClaimForm({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/claim/${templateId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: fd.get("name"),
        recipientPhone: fd.get("phone"),
      }),
    });

    if (!res.ok) {
      let message = "Failed to claim coupon. Please try again.";
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {}
      setError(message);
      setLoading(false);
      return;
    }

    const { code } = await res.json();
    router.push(`/c/${code}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Enter your details to get your coupon QR code.</p>
      <div className="space-y-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required placeholder="Aizat Bekova" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" name="phone" type="tel" required placeholder="+996 700 000 000" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Claiming…" : "Get my coupon"}
      </Button>
    </form>
  );
}
