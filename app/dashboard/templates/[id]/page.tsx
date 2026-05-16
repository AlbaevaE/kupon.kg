import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GenerateCouponForm } from "./generate-coupon-form";

const PAGE_SIZE = 50;

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();
  if (!session) redirect("/auth/login");
  const user = session.user;

  const page = Math.max(0, Number.parseInt(pageParam ?? "0", 10) || 0);

  const template = await prisma.couponTemplate.findUnique({
    where: { id },
  });

  if (!template || template.businessId !== user.businessId) redirect("/dashboard/templates");

  const [coupons, totalCoupons] = await Promise.all([
    prisma.coupon.findMany({
      where: { templateId: id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { scanEvents: true } } },
      take: PAGE_SIZE,
      skip: page * PAGE_SIZE,
    }),
    prisma.coupon.count({ where: { templateId: id } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCoupons / PAGE_SIZE));
  const hasPrev = page > 0;
  const hasNext = (page + 1) * PAGE_SIZE < totalCoupons;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">{template.title}</h1>
          <Badge variant={template.isActive ? "default" : "outline"}>
            {template.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {template.description && <p className="text-gray-600">{template.description}</p>}
        <p className="text-sm text-gray-400 mt-1">
          {template.expiryMode === "DAYS_FROM_GENERATION"
            ? `${template.validDays} day validity from generation`
            : `Fixed expiry: ${new Date(template.expiresAt!).toLocaleDateString()}`}
          {" · "}Max {template.maxUses} use{template.maxUses !== 1 ? "s" : ""} per coupon
        </p>
        {template.allowSelfClaim && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Badge variant="secondary">Self-claim enabled</Badge>
            <a
              href={`${appUrl}/claim/${template.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Share public claim link →
            </a>
          </div>
        )}
      </div>

      {user.role === "OWNER" && (
        <Card>
          <CardHeader>
            <CardTitle>Generate coupon</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerateCouponForm templateId={template.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generated coupons ({totalCoupons})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {totalCoupons === 0 ? (
            <p className="text-sm text-gray-500 p-4">No coupons generated yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => {
                  const isExpired = c.status === "ACTIVE" && new Date(c.expiresAt) < new Date();
                  const status = isExpired ? "EXPIRED" : c.status;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.recipientName ?? "—"}</p>
                        {c.recipientPhone && (
                          <p className="text-xs text-gray-400">{c.recipientPhone}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(c.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">{c._count.scanEvents}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/coupons/${c.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View QR
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalCoupons > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <p className="text-gray-500">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                {hasPrev ? (
                  <Link
                    href={`/dashboard/templates/${id}?page=${page - 1}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="rounded border px-3 py-1 text-gray-300">← Previous</span>
                )}
                {hasNext ? (
                  <Link
                    href={`/dashboard/templates/${id}?page=${page + 1}`}
                    className="rounded border px-3 py-1 hover:bg-gray-50"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="rounded border px-3 py-1 text-gray-300">Next →</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
  if (status === "REDEEMED") return <Badge variant="secondary">Redeemed</Badge>;
  return <Badge variant="outline" className="text-orange-600 border-orange-300">Expired</Badge>;
}
