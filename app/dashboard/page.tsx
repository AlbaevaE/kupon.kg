import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RedemptionChart } from "./redemption-chart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalActive, totalRedeemed, redeemedThisMonth, templates, recentEvents, dailyData] =
    await Promise.all([
      prisma.coupon.count({
        where: {
          template: { businessId: user.businessId },
          status: "ACTIVE",
          expiresAt: { gt: now },
        },
      }),
      prisma.coupon.count({
        where: { template: { businessId: user.businessId }, status: "REDEEMED" },
      }),
      prisma.coupon.count({
        where: {
          template: { businessId: user.businessId },
          status: "REDEEMED",
          redeemedAt: { gte: startOfMonth },
        },
      }),
      prisma.couponTemplate.findMany({
        where: { businessId: user.businessId },
        include: {
          _count: { select: { coupons: true } },
          coupons: { where: { status: "REDEEMED" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.scanEvent.findMany({
        where: {
          action: "REDEEMED",
          coupon: { template: { businessId: user.businessId } },
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          coupon: { include: { template: true } },
          scannedBy: { select: { name: true } },
        },
      }),
      prisma.scanEvent.findMany({
        where: {
          action: "REDEEMED",
          coupon: { template: { businessId: user.businessId } },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),
    ]);

  const totalGenerated = templates.reduce((s, t) => s + t._count.coupons, 0);
  const redemptionRate =
    totalGenerated > 0 ? Math.round((totalRedeemed / totalGenerated) * 100) : 0;

  const chartData = buildDailyChart(dailyData.map((e) => e.createdAt), thirtyDaysAgo);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active coupons" value={totalActive} />
        <StatCard label="Redeemed (all time)" value={totalRedeemed} />
        <StatCard label="Redeemed this month" value={redeemedThisMonth} />
        <StatCard label="Redemption rate" value={`${redemptionRate}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redemptions — last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <RedemptionChart data={chartData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Templates performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Redeemed</TableHead>
                <TableHead>Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const rate =
                  t._count.coupons > 0
                    ? Math.round((t.coupons.length / t._count.coupons) * 100)
                    : 0;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t._count.coupons}</TableCell>
                    <TableCell>{t.coupons.length}</TableCell>
                    <TableCell>{rate}%</TableCell>
                  </TableRow>
                );
              })}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 py-6">
                    No templates yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent redemptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{e.coupon.template.title}</span>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function buildDailyChart(dates: Date[], from: Date) {
  const map: Record<string, number> = {};
  const days = 30;
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map[key] = 0;
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}
