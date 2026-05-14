"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  business: { name: string; phone: string | null; logoUrl: string | null };
}

export function SettingsForm({ business }: Props) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(business.logoUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/business/settings", {
      method: "PATCH",
      body: formData,
    });

    if (!res.ok) {
      setError("Failed to save settings");
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" defaultValue={business.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" defaultValue={business.phone ?? ""} placeholder="+996 700 000 000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="logo">Logo</Label>
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Logo preview"
                width={80}
                height={80}
                className="rounded-lg object-contain border mb-2"
              />
            )}
            <Input id="logo" name="logo" type="file" accept="image/*" onChange={handleFileChange} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Settings saved!</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
