import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBodyTooLarge, JSON_BODY_LIMIT } from "@/lib/body-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    if (isBodyTooLarge(req, JSON_BODY_LIMIT)) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    const { templateId } = await params;

    const body = await req.json().catch(() => ({}));
    const recipientName =
      typeof body.recipientName === "string" ? body.recipientName.trim() : "";
    const recipientPhone =
      typeof body.recipientPhone === "string" ? body.recipientPhone.trim() : "";

    if (!recipientName || !recipientPhone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }
    if (recipientName.length > 100 || recipientPhone.length > 30) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    const coupon = await prisma.$transaction(async (tx) => {
      const template = await tx.couponTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) return { error: "not_found" } as const;
      if (!template.allowSelfClaim || !template.isActive) {
        return { error: "not_available" } as const;
      }
      if (
        template.expiryMode === "FIXED_DATE" &&
        template.expiresAt &&
        template.expiresAt < new Date()
      ) {
        return { error: "expired" } as const;
      }

      const issued = await tx.coupon.count({ where: { templateId: template.id } });
      if (issued >= template.maxUses) {
        return { error: "limit_reached" } as const;
      }

      const expiresAt =
        template.expiryMode === "DAYS_FROM_GENERATION"
          ? new Date(Date.now() + (template.validDays ?? 30) * 86400000)
          : template.expiresAt!;

      const created = await tx.coupon.create({
        data: {
          templateId: template.id,
          recipientName,
          recipientPhone,
          expiresAt,
        },
      });

      return { coupon: created } as const;
    });

    if ("error" in coupon) {
      switch (coupon.error) {
        case "not_found":
          return NextResponse.json({ error: "Offer not found" }, { status: 404 });
        case "not_available":
          return NextResponse.json(
            { error: "This offer is not available" },
            { status: 404 }
          );
        case "expired":
          return NextResponse.json({ error: "Offer expired" }, { status: 410 });
        case "limit_reached":
          return NextResponse.json(
            { error: "All coupons for this offer have been claimed" },
            { status: 409 }
          );
      }
    }

    return NextResponse.json(
      { code: coupon.coupon.code },
      { status: 201 }
    );
  } catch (err) {
    console.error("[claim POST]", err);
    return NextResponse.json({ error: "Failed to claim coupon" }, { status: 500 });
  }
}
