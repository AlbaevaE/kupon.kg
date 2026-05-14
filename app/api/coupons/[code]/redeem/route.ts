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
    const user = session.user as any;

    const { code } = await params;

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: { template: true },
    });

    if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    if (coupon.template.businessId !== user.businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (coupon.status === "REDEEMED") {
      return NextResponse.json({ error: "Coupon already redeemed" }, { status: 409 });
    }

    if (coupon.status === "EXPIRED" || new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Coupon has expired" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { status: "REDEEMED", redeemedAt: new Date(), redeemedById: user.id },
      }),
      prisma.scanEvent.create({
        data: {
          couponId: coupon.id,
          scannedById: user.id,
          action: "REDEEMED",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[redeem POST]", err);
    return NextResponse.json({ error: "Failed to redeem coupon" }, { status: 500 });
  }
}
