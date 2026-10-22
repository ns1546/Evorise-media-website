import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { verifyUddoktaPayPayment } from "@/lib/uddoktapay";
import crypto from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoice_id");
  const orderId = searchParams.get("orderId");

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`).replace(/\/+$/, "");

  if (!invoiceId) {
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  try {
    const verification = await verifyUddoktaPayPayment(invoiceId);

    if (verification.status === "COMPLETED") {
      const courseId = verification.metadata?.courseId;
      const userId = verification.metadata?.userId;
      const finalOrderId = verification.metadata?.orderId || orderId;

      if (finalOrderId) {
        await db.order.update({
          where: { id: finalOrderId },
          data: {
            status: "COMPLETED",
            trxId: verification.transaction_id || invoiceId,
            updatedAt: new Date(),
          },
        }).catch(() => {});
      }

      if (courseId && userId) {
        const existingEnrollment = await db.enrollment.findUnique({
          where: {
            userId_courseId: { userId, courseId }
          },
        });

        if (!existingEnrollment) {
          await db.enrollment.create({
            data: {
              id: crypto.randomUUID(),
              userId,
              courseId,
              progress: 0,
              updatedAt: new Date(),
            },
          });
        }
      }

      return NextResponse.redirect(`${appUrl}/dashboard?payment=success`);
    } else {
      return NextResponse.redirect(`${appUrl}/dashboard?payment=failed`);
    }
  } catch (error) {
    console.error("[UddoktaPay Callback Error]:", error);
    return NextResponse.redirect(`${appUrl}/dashboard?error=verification_failed`);
  }
}
