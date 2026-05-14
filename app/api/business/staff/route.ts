import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const staff = await prisma.staffMember.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(staff);
  } catch (err) {
    console.error("[staff GET]", err);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const existing = await prisma.staffMember.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const staff = await prisma.staffMember.create({
      data: { name, email, passwordHash, businessId: user.businessId, role: "STAFF" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    console.error("[staff POST]", err);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
