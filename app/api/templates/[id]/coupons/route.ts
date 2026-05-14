import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    const { id } = await params;
    const template = await prisma.couponTemplate.findUnique({ where: { id } });
    if (!template || template.businessId !== user.businessId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { recipientName, recipientPhone } = body;

    let expiresAt: Date;
    if (template.expiryMode === "DAYS_FROM_GENERATION") {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (template.validDays ?? 30));
    } else {
      expiresAt = template.expiresAt!;
    }

    const coupon = await prisma.coupon.create({
      data: {
        templateId: template.id,
        recipientName: recipientName || null,
        recipientPhone: recipientPhone || null,
        expiresAt,
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    console.error("[coupons POST]", err);
    return NextResponse.json({ error: "Failed to generate coupon" }, { status: 500 });
  }
}
