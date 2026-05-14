import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;

    const templates = await prisma.couponTemplate.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { coupons: true } } },
    });

    return NextResponse.json(templates);
  } catch (err) {
    console.error("[templates GET]", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, description, expiryMode, validDays, expiresAt, maxUses, allowSelfClaim } = body;

    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    if (expiryMode === "DAYS_FROM_GENERATION" && (!validDays || validDays < 1)) {
      return NextResponse.json({ error: "Valid days must be at least 1" }, { status: 400 });
    }
    if (expiryMode === "FIXED_DATE" && !expiresAt) {
      return NextResponse.json({ error: "Expiry date required" }, { status: 400 });
    }

    const template = await prisma.couponTemplate.create({
      data: {
        businessId: user.businessId,
        title,
        description: description || null,
        expiryMode,
        validDays: expiryMode === "DAYS_FROM_GENERATION" ? Number(validDays) : null,
        expiresAt: expiryMode === "FIXED_DATE" ? new Date(expiresAt) : null,
        maxUses: Number(maxUses) || 1,
        allowSelfClaim: Boolean(allowSelfClaim),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("[templates POST]", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
