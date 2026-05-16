import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBodyTooLarge, JSON_BODY_LIMIT } from "@/lib/body-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (isBodyTooLarge(req, JSON_BODY_LIMIT)) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { recipientName, recipientPhone } = body;

    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.couponTemplate.findUnique({ where: { id } });
      if (!template || template.businessId !== user.businessId) {
        return { error: "not_found" } as const;
      }

      const issued = await tx.coupon.count({ where: { templateId: template.id } });
      if (issued >= template.maxUses) {
        return { error: "limit_reached" } as const;
      }

      const expiresAt =
        template.expiryMode === "DAYS_FROM_GENERATION"
          ? new Date(Date.now() + (template.validDays ?? 30) * 86400000)
          : template.expiresAt!;

      const coupon = await tx.coupon.create({
        data: {
          templateId: template.id,
          recipientName: recipientName || null,
          recipientPhone: recipientPhone || null,
          expiresAt,
        },
      });

      return { coupon } as const;
    });

    if ("error" in result) {
      if (result.error === "not_found") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Coupon limit reached for this template" },
        { status: 409 }
      );
    }

    return NextResponse.json(result.coupon, { status: 201 });
  } catch (err) {
    console.error("[coupons POST]", err);
    return NextResponse.json({ error: "Failed to generate coupon" }, { status: 500 });
  }
}
