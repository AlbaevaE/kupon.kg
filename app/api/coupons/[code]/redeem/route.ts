import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user;

    const { code } = await params;
    const now = new Date();

    const [{ count }, scanEvent] = await prisma.$transaction(async (tx) => {
      const result = await tx.coupon.updateMany({
        where: {
          code,
          status: "ACTIVE",
          expiresAt: { gt: now },
          template: { businessId: user.businessId },
        },
        data: { status: "REDEEMED", redeemedAt: now, redeemedById: user.id },
      });

      if (result.count === 0) {
        return [result, null] as const;
      }

      const coupon = await tx.coupon.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!coupon) return [result, null] as const;

      const event = await tx.scanEvent.create({
        data: {
          couponId: coupon.id,
          scannedById: user.id,
          action: "REDEEMED",
        },
      });

      return [result, event] as const;
    });

    if (count === 0) {
      const coupon = await prisma.coupon.findUnique({
        where: { code },
        include: { template: { select: { businessId: true } } },
      });
      if (!coupon) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }
      if (coupon.template.businessId !== user.businessId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (coupon.status === "REDEEMED") {
        return NextResponse.json({ error: "Coupon already redeemed" }, { status: 409 });
      }
      return NextResponse.json({ error: "Coupon has expired" }, { status: 409 });
    }

    return NextResponse.json({ success: true, scanEventId: scanEvent?.id });
  } catch (err) {
    console.error("[redeem POST]", err);
    return NextResponse.json({ error: "Failed to redeem coupon" }, { status: 500 });
  }
}
