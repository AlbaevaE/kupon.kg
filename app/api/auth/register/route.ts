import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base: string) {
  let slug = slugify(base);
  let exists = await prisma.business.findUnique({ where: { slug } });
  let i = 1;
  while (exists) {
    slug = `${slugify(base)}-${i++}`;
    exists = await prisma.business.findUnique({ where: { slug } });
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const { businessName, ownerName, email, password } = await req.json();

    if (!businessName || !ownerName || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
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
