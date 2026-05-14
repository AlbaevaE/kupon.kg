import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { SelfClaimForm } from "./self-claim-form";

export default async function SelfClaimPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;

  const template = await prisma.couponTemplate.findUnique({
    where: { id: templateId },
    include: { business: true },
  });

  if (!template || !template.allowSelfClaim || !template.isActive) notFound();

  const isExpiredTemplate =
    template.expiryMode === "FIXED_DATE" &&
    template.expiresAt &&
    new Date(template.expiresAt) < new Date();

  if (isExpiredTemplate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8 text-center">
          <p className="text-2xl mb-2">⏰</p>
          <h1 className="text-xl font-bold">Offer expired</h1>
          <p className="text-gray-500 mt-2">This coupon offer is no longer available.</p>
        </div>
      </div>
    );
  }

  const business = template.business;

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
          </div>
        </div>

        <div className="px-6 py-5">
          <h1 className="text-xl font-bold">{template.title}</h1>
          {template.description && (
            <p className="text-gray-600 mt-1 text-sm">{template.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {template.expiryMode === "DAYS_FROM_GENERATION"
              ? `Valid for ${template.validDays} days after claiming`
              : `Expires ${new Date(template.expiresAt!).toLocaleDateString()}`}
          </p>

          <div className="mt-6">
            <SelfClaimForm templateId={template.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
