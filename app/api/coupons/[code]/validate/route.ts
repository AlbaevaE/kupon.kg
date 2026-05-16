import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user;

    const { code } = await params;
    const intent = req.nextUrl.searchParams.get("intent");

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: { template: { include: { business: true } } },
    });

    if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    if (coupon.template.businessId !== user.businessId) {
      return NextResponse.json({ error: "This coupon belongs to a different business" }, { status: 403 });
    }

    const isExpiredDate = new Date(coupon.expiresAt) < new Date();
    const status = coupon.status === "ACTIVE" && isExpiredDate ? "EXPIRED" : coupon.status;

    if (intent === "scan") {
      await prisma.scanEvent.create({
        data: {
          couponId: coupon.id,
          scannedById: user.id,
          action: "VIEWED",
        },
      });
    }

    return NextResponse.json({
      id: coupon.id,
      code: coupon.code,
      status,
      title: coupon.template.title,
      description: coupon.template.description,
      recipientName: coupon.recipientName,
      recipientPhone: coupon.recipientPhone,
      expiresAt: coupon.expiresAt,
      redeemedAt: coupon.redeemedAt,
      maxUses: coupon.template.maxUses,
    });
  } catch (err) {
    console.error("[validate GET]", err);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}
