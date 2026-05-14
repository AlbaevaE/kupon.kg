"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewTemplatePage() {
  const router = useRouter();
  const [expiryMode, setExpiryMode] = useState("DAYS_FROM_GENERATION");
  const [allowSelfClaim, setAllowSelfClaim] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      description: fd.get("description") || null,
      expiryMode,
      validDays: expiryMode === "DAYS_FROM_GENERATION" ? fd.get("validDays") : null,
      expiresAt: expiryMode === "FIXED_DATE" ? fd.get("expiresAt") : null,
      maxUses: fd.get("maxUses"),
      allowSelfClaim,
    };

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let message = "Failed to create template";
      try { const data = await res.json(); message = data.error || message; } catch {}
      setError(message);
      setLoading(false);
      return;
    }

    const template = await res.json();
    router.push(`/dashboard/templates/${template.id}`);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Coupon Template</h1>
      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="50% off haircut" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" placeholder="Valid for one cut and blowout…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry type</Label>
              <Select value={expiryMode} onValueChange={(v) => { if (v) setExpiryMode(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAYS_FROM_GENERATION">Days from generation</SelectItem>
                  <SelectItem value="FIXED_DATE">Fixed expiry date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {expiryMode === "DAYS_FROM_GENERATION" && (
              <div className="space-y-1.5">
                <Label htmlFor="validDays">Valid for (days)</Label>
                <Input id="validDays" name="validDays" type="number" min={1} defaultValue={30} required />
              </div>
            )}
            {expiryMode === "FIXED_DATE" && (
              <div className="space-y-1.5">
                <Label htmlFor="expiresAt">Expires on</Label>
                <Input id="expiresAt" name="expiresAt" type="date" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">Max uses per coupon</Label>
              <Input id="maxUses" name="maxUses" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowSelfClaim"
                checked={allowSelfClaim}
                onChange={(e) => setAllowSelfClaim(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="allowSelfClaim">Allow customers to self-claim via public link</Label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating…" : "Create template"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
