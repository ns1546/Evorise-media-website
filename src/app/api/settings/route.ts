import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const setting = await db.setting.findUnique({
      where: { id: "global" },
      select: {
        facebookPixelId: true,
        bkashNumber: true,
        nagadNumber: true,
        rocketNumber: true,
        whatsappNumber: true,
        supportEmail: true,
        noticeText: true,
      }
    });

    return NextResponse.json(
      setting || {
        facebookPixelId: null,
        bkashNumber: "01700000000",
        nagadNumber: "01700000000",
        rocketNumber: null,
        whatsappNumber: "01700000000",
        supportEmail: "support@evorisemedia.com",
        noticeText: null,
      }
    );
  } catch (error) {
    console.error("Public settings fetch error:", error);
    return NextResponse.json({
      facebookPixelId: null,
      bkashNumber: "01700000000",
      nagadNumber: "01700000000",
      whatsappNumber: "01700000000",
      supportEmail: "support@evorisemedia.com",
    });
  }
}
