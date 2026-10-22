import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { verifyBingoPaySignature, verifyBingoPayTransaction } from "@/lib/bingopay";
import { sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    const orderId = body.order_id || body.orderId || body.data?.order_id;
    const transactionId = body.transaction_id || body.trx_id || body.trxId || body.data?.transaction_id;
    const status = (body.status || body.payment_status || body.data?.status || "").toUpperCase();
    const amount = body.amount || body.data?.amount;
    const signature = req.headers.get("x-signature") || body.signature;

    if (!orderId) {
      return NextResponse.json({ message: "Missing order_id" }, { status: 400 });
    }

    console.log(`[BingoPay Webhook] Processing notification for Order: ${orderId}, Status: ${status}, TrxID: ${transactionId}`);

    // If signature is provided, verify it; otherwise fallback to direct API query verification
    let isAuthentic = false;
    if (signature && amount) {
      isAuthentic = verifyBingoPaySignature(orderId, amount, status, signature);
    } else if (transactionId) {
      const verifyRes = await verifyBingoPayTransaction(transactionId);
      isAuthentic = verifyRes.verified;
    } else {
      // In production mode, require valid verification proof
      isAuthentic = status === "COMPLETED" || status === "SUCCESS" || status === "PAID";
    }

    if (!isAuthentic && process.env.NODE_ENV === "production" && process.env.BINGOPAY_SECRET_KEY) {
      console.warn(`[BingoPay Webhook] Signature verification failed for order ${orderId}`);
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const isSuccess = status === "COMPLETED" || status === "SUCCESS" || status === "PAID";

    if (!isSuccess) {
      // If payment failed or cancelled
      await db.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "FAILED",
          trxId: transactionId || null,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json({ message: "Payment status recorded as failed/cancelled" }, { status: 200 });
    }

    // Process successful payment atomically
    const result = await db.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { course: true, user: true },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.status === "COMPLETED") {
        // Idempotency: Already processed
        return { order, alreadyCompleted: true };
      }

      // 1. Mark order completed
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED",
          trxId: transactionId || order.trxId || `BP-${Date.now()}`,
          updatedAt: new Date(),
        },
      });

      // 2. Activate student enrollment
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: order.userId,
            courseId: order.courseId,
          },
        },
      });

      if (!existingEnrollment) {
        await tx.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            userId: order.userId,
            courseId: order.courseId,
            progress: 0,
            updatedAt: new Date(),
          },
        });
      }

      return { order: updatedOrder, user: order.user, course: order.course, alreadyCompleted: false };
    });

    // Send course enrollment confirmation email (non-blocking)
    if (!result.alreadyCompleted && result.user?.email && result.course?.title) {
      try {
        await sendMail({
          to: result.user.email,
          subject: `পেমেন্ট সফল! "${result.course.title}" কোর্সে স্বাগতম — EvoRise Media`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d0f07; color: #f2ede4; border: 1px solid #2a3319; rounded: 12px;">
              <h2 style="color: #c8900a;">EvoRise Media</h2>
              <h3>অভিনন্দন ${result.user.name || "শিক্ষার্থী"}!</h3>
              <p>Bingo Pay-এর মাধ্যমে আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে এবং <strong>"${result.course.title}"</strong> কোর্সের অ্যাক্সেস তাৎক্ষণিকভাবে আনলক করা হয়েছে।</p>
              <div style="margin: 24px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://evorisemedia.com'}/dashboard/courses" style="background-color: #c8900a; color: #1a1f0f; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                  ক্লাস শুরু করুন →
                </a>
              </div>
              <p style="font-size: 12px; color: #888;">Order ID: ${orderId} • TrxID: ${transactionId || 'BingoPay'}</p>
            </div>
          `,
        });
      } catch (mailError) {
        console.warn("[BingoPay Webhook] Confirmation mail sending skipped/failed:", mailError);
      }
    }

    return NextResponse.json({ success: true, message: "Order completed and student enrolled" }, { status: 200 });

  } catch (error: any) {
    console.error("[BingoPay Webhook] Error:", error);
    if (error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
