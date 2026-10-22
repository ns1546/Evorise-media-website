import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") || searchParams.get("order_id");
  const transactionId = searchParams.get("transaction_id") || searchParams.get("trx_id");
  const status = (searchParams.get("status") || "").toUpperCase();

  const host = req.headers.get("host") || "evorisemedia.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  if (!orderId) {
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { course: true },
    });

    if (!order) {
      return NextResponse.redirect(`${baseUrl}/dashboard`);
    }

    // If order is still pending but callback says success, sync it
    if (order.status === "PENDING" && (status === "SUCCESS" || status === "COMPLETED" || status === "PAID")) {
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          trxId: transactionId || order.trxId || `BP-${Date.now()}`,
          updatedAt: new Date(),
        },
      });

      // Ensure enrollment exists
      const existingEnrollment = await db.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: order.userId,
            courseId: order.courseId,
          },
        },
      });

      if (!existingEnrollment) {
        await db.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            userId: order.userId,
            courseId: order.courseId,
            progress: 0,
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.redirect(`${baseUrl}/checkout/success?orderId=${order.id}`);
  } catch (error) {
    console.error("[BingoPay Callback] Error:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard`);
  }
}
