import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import QRCode from "qrcode";

const getCachedQrDataUrl = unstable_cache(
  async (url: string) => QRCode.toDataURL(url, { width: 300, margin: 2 }),
  ["coupon-qr"],
);

export default async function PublicCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: { template: { include: { business: true } } },
  });

  if (!coupon) notFound();

  const isExpiredDate = new Date(coupon.expiresAt) < new Date();
  const status = coupon.status === "ACTIVE" && isExpiredDate ? "EXPIRED" : coupon.status;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const qrDataUrl = await getCachedQrDataUrl(`${appUrl}/c/${code}`);

  const business = coupon.template.business;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full overflow-hidden">
        <div className="bg-gray-900 px-6 py-5 flex items-center gap-3">
          {business.logoUrl ? (
            <Image
              src={business.logoUrl}
              alt={business.name}
              width={48}
              height={48}
              className="rounded-full object-cover bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg">
              {business.name[0]}
            </div>
          )}
          <div>
            <p className="text-white font-semibold">{business.name}</p>
            {business.phone && <p className="text-gray-400 text-sm">{business.phone}</p>}
          </div>
        </div>

        <div className="px-6 py-5">
          <h1 className="text-xl font-bold text-gray-900">{coupon.template.title}</h1>
          {coupon.template.description && (
            <p className="text-gray-600 mt-1 text-sm">{coupon.template.description}</p>
          )}

          <div className="mt-4 flex items-center justify-between">
            <StatusChip status={status} />
            <p className="text-sm text-gray-500">
              Expires {new Date(coupon.expiresAt).toLocaleDateString()}
            </p>
          </div>

          {coupon.recipientName && (
            <p className="mt-2 text-sm text-gray-500">For: {coupon.recipientName}</p>
          )}

          <div className="mt-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Coupon QR code" className="w-48 h-48" />
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Show this QR code at {business.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        Valid
      </span>
    );
  }
  if (status === "REDEEMED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        Used
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
      Expired
    </span>
  );
}
