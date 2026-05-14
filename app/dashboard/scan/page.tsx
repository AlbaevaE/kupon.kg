import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ScannerClient } from "./scanner-client";

export default async function ScanPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Scan QR Code</h1>
      <ScannerClient />
    </div>
  );
}
