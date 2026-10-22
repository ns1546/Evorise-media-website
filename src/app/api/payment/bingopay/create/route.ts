import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma as db } from "@/lib/prisma";
import { createBingoPayCheckout, getBingoPayConfig } from "@/lib/bingopay";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const isAllowed = await checkRateLimit(ip, 10, 60000);
    if (!isAllowed) {
      return NextResponse.json({ message: "অতিরিক্ত অনুরোধ, কিছুক্ষণ পর চেষ্টা করুন।" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "লগইন করা প্রয়োজন (Login Required)" }, { status: 401 });
    }

    const { courseId, phone } = await req.json();
    if (!courseId) {
      return NextResponse.json({ message: "কোর্স আইডি প্রয়োজন" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course || !course.published || course.isDeleted) {
      return NextResponse.json({ message: "কোর্সটি বর্তমানে উপলব্ধ নয়" }, { status: 404 });
    }

    // Check if already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });

    if (existingEnrollment) {
      return NextResponse.json({ message: "আপনি ইতিমধ্যে এই কোর্সে এনরোল করেছেন" }, { status: 409 });
    }

    const effectiveAmount = course.discountPrice && course.discountPrice < course.price
      ? course.discountPrice
      : course.price;

    const orderId = `EVO-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Clean up any stale pending order for this user & course
    await db.order.deleteMany({
      where: {
        userId: user.id,
        courseId: course.id,
        status: "PENDING",
      },
    });

    // Create the PENDING order in DB
    const order = await db.order.create({
      data: {
        id: orderId,
        userId: user.id,
        courseId: course.id,
        amount: effectiveAmount,
        status: "PENDING",
        paymentMethod: "BingoPay",
        senderPhone: phone || user.phone || null,
        updatedAt: new Date(),
      },
    });

    const host = req.headers.get("host") || "evorisemedia.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    const returnUrl = `${appUrl}/api/payment/bingopay/callback?orderId=${order.id}`;
    const cancelUrl = `${appUrl}/checkout/${course.id}?cancelled=true`;
    const webhookUrl = `${appUrl}/api/payment/bingopay/webhook`;

    // Initiate payment session with Bingo Pay Gateway
    const gatewayRes = await createBingoPayCheckout({
      orderId: order.id,
      amount: effectiveAmount,
      currency: "BDT",
      customerName: user.name || "Student",
      customerEmail: user.email || "",
      customerPhone: phone || user.phone || "01700000000",
      courseTitle: course.title,
      returnUrl,
      cancelUrl,
      webhookUrl,
    });

    if (gatewayRes.success && gatewayRes.paymentUrl) {
      return NextResponse.json({
        success: true,
        paymentUrl: gatewayRes.paymentUrl,
        orderId: order.id,
      });
    }

    // If Bingo Pay credentials are not configured in production yet, provide clear instruction
    const config = getBingoPayConfig();
    if (!config.apiKey || !config.merchantId) {
      return NextResponse.json({
        success: false,
        requiresSetup: true,
        message: "Bingo Pay Production Gateway কনফিগারেশন প্রয়োজন। অনুগ্রহ করে .env ফাইলে BINGOPAY_API_KEY এবং BINGOPAY_MERCHANT_ID সেট করুন।",
        orderId: order.id,
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      message: gatewayRes.message || "পেমেন্ট গেটওয়েতে সংযোগ করতে ব্যর্থ হয়েছে।",
    }, { status: 502 });

  } catch (error: any) {
    console.error("BingoPay create error:", error);
    return NextResponse.json({ message: "সার্ভার ত্রুটি, কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
