import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user as any;

  const templates = await prisma.couponTemplate.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { coupons: true } } },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupon Templates</h1>
        {user.role === "OWNER" && (
          <Button render={<Link href="/dashboard/templates/new" />}>
            New template
          </Button>
        )}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No templates yet.{" "}
            {user.role === "OWNER" && (
              <Link href="/dashboard/templates/new" className="text-blue-600 hover:underline">
                Create your first one.
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <Link key={t.id} href={`/dashboard/templates/${t.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  {t.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {t._count.coupons} coupon{t._count.coupons !== 1 ? "s" : ""} generated ·{" "}
                    {t.expiryMode === "DAYS_FROM_GENERATION"
                      ? `${t.validDays} day validity`
                      : `Expires ${new Date(t.expiresAt!).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {t.allowSelfClaim && <Badge variant="secondary">Self-claim</Badge>}
                  <Badge variant={t.isActive ? "default" : "outline"}>
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
