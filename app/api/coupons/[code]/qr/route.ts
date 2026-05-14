import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import QRCode from "qrcode";

export async function GET(
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

    if (!coupon || coupon.template.businessId !== user.businessId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = `${appUrl}/c/${code}`;

    const png = await QRCode.toBuffer(url, { width: 400, margin: 2 });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="coupon-${code.slice(0, 8)}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[qr GET]", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
