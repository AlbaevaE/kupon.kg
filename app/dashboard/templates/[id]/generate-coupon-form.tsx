"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GenerateCouponForm({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/templates/${templateId}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName: fd.get("recipientName") || null,
        recipientPhone: fd.get("recipientPhone") || null,
      }),
    });

    if (!res.ok) {
      setError("Failed to generate coupon");
      setLoading(false);
      return;
    }

    const coupon = await res.json();
    router.push(`/dashboard/coupons/${coupon.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1">
        <Label htmlFor="recipientName">Recipient name (optional)</Label>
        <Input id="recipientName" name="recipientName" placeholder="Aizat" className="w-48" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="recipientPhone">Phone (optional)</Label>
        <Input id="recipientPhone" name="recipientPhone" placeholder="+996 700 000 000" className="w-48" />
      </div>
      {error && <p className="text-sm text-red-600 w-full">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Generating…" : "Generate QR"}
      </Button>
    </form>
  );
}
