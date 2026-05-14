import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string | null;
    const logo = formData.get("logo") as File | null;

    const update: Record<string, any> = {};
    if (name) update.name = name;
    if (phone !== null) update.phone = phone || null;

    if (logo && logo.size > 0) {
      const bytes = await logo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const ext = logo.name.split(".").pop();
      const filename = `${user.businessId}.${ext}`;
      const dir = path.join(process.cwd(), "public", "logos");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buffer);
      update.logoUrl = `/logos/${filename}`;
    }

    const business = await prisma.business.update({
      where: { id: user.businessId },
      data: update,
    });

    return NextResponse.json({ logoUrl: business.logoUrl, name: business.name });
  } catch (err) {
    console.error("[settings PATCH]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
