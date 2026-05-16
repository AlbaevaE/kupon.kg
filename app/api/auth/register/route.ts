import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isBodyTooLarge, JSON_BODY_LIMIT } from "@/lib/body-limit";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string) {
  const slug = slugify(base);
  const exists = await prisma.business.findUnique({ where: { slug } });
  if (!exists) return slug;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_STR = 200;

export async function POST(req: NextRequest) {
  try {
    if (isBodyTooLarge(req, JSON_BODY_LIMIT)) {
      return NextResponse.json({ error: "Request body too large" }, { status: 413 });
    }
    const body = await req.json();
    const businessName = typeof body?.businessName === "string" ? body.businessName.trim() : "";
    const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!businessName || !ownerName || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (businessName.length > MAX_STR || ownerName.length > MAX_STR || email.length > MAX_STR) {
      return NextResponse.json({ error: "Field too long" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: "Password too long" }, { status: 400 });
    }

    const existing = await prisma.staffMember.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = await uniqueSlug(businessName);

    const business = await prisma.business.create({
      data: {
        name: businessName,
        slug,
        email,
        passwordHash,
        staff: {
          create: {
            name: ownerName,
            email,
            passwordHash,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json({ businessId: business.id }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
