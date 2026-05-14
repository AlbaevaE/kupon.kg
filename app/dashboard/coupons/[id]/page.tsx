import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponQR } from "./coupon-qr";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user as any;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      template: { include: { business: true } },
      scanEvents: {
        orderBy: { createdAt: "desc" },
        include: { scannedBy: { select: { name: true } } },
      },
    },
  });

  if (!coupon || coupon.template.businessId !== user.businessId) redirect("/dashboard");

  const isExpired = coupon.status === "ACTIVE" && new Date(coupon.expiresAt) < new Date();
  const status = isExpired ? "EXPIRED" : coupon.status;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/c/${coupon.code}`;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/templates/${coupon.templateId}`}
          className="text-sm text-gray-500 hover:underline"
        >
          ← {coupon.template.title}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{coupon.template.title}</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {coupon.recipientName && (
            <div>
              <p className="text-sm text-gray-500">Recipient</p>
              <p className="font-medium">{coupon.recipientName}</p>
              {coupon.recipientPhone && (
                <p className="text-sm text-gray-500">{coupon.recipientPhone}</p>
              )}
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Expires</p>
            <p className="font-medium">{new Date(coupon.expiresAt).toLocaleDateString()}</p>
          </div>
          {coupon.redeemedAt && (
            <div>
              <p className="text-sm text-gray-500">Redeemed</p>
              <p className="font-medium">{new Date(coupon.redeemedAt).toLocaleString()}</p>
            </div>
          )}
          <CouponQR code={coupon.code} publicUrl={publicUrl} />
        </CardContent>
      </Card>

      {coupon.scanEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {coupon.scanEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className={e.action === "REDEEMED" ? "text-green-700 font-medium" : "text-gray-600"}>
                    {e.action === "REDEEMED" ? "Redeemed" : "Viewed"}
                  </span>
                  {e.scannedBy && (
                    <span className="text-gray-400"> · {e.scannedBy.name}</span>
                  )}
                </div>
                <span className="text-gray-400">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
  if (status === "REDEEMED") return <Badge variant="secondary">Redeemed</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Expired</Badge>;
}
