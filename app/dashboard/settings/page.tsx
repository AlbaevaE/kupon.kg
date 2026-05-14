import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user as any;
  if (user.role !== "OWNER") redirect("/dashboard");

  const business = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!business) redirect("/auth/login");

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Business Settings</h1>
      <SettingsForm business={business} />
    </div>
  );
}
