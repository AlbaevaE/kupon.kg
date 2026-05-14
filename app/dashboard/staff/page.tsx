import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StaffList } from "./staff-list";

export default async function StaffPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user as any;
  if (user.role !== "OWNER") redirect("/dashboard");

  const staff = await prisma.staffMember.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Staff</h1>
      <StaffList initialStaff={staff} />
    </div>
  );
}
