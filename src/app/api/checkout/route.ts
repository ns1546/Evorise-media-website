import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma as db } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Professional Zod Validation Schema
const checkoutSchema = z.object({
  courseId: z.string().min(1, "Invalid Course ID"),
  paymentMethod: z.enum(["bKash", "Nagad", "Rocket", "Upay", "bkash", "nagad", "rocket", "upay"]),
  trxId: z.string().min(8, "Transaction ID must be at least 8 characters").max(50),
  senderPhone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/, "Invalid Bangladeshi Phone Number"),
});

import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    
    // Max 10 checkout attempts per minute per IP
    const isAllowed = await checkRateLimit(ip, 10, 60000);
    if (!isAllowed) {
      return NextResponse.json({ message: "অতিরিক্ত অনুরোধ করা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।" }, { status: 429 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "লগইন করা প্রয়োজন (Login Required)" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = checkoutSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { message: "Validation error", errors: validatedData.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { courseId, paymentMethod, trxId, senderPhone } = validatedData.data;

    // Use Prisma Transaction to prevent race conditions (Double Purchases)
    const userEmail = session.user!.email!;
    const result = await db.$transaction(async (tx: any) => {
      const user = await tx.user.findUnique({
        where: { email: userEmail }
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const course = await tx.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        throw new Error("COURSE_NOT_FOUND");
      }
      
      if (!course.published) {
        throw new Error("COURSE_NOT_AVAILABLE");
      }

      // Check if already enrolled
      const existingEnrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } }
      });

      if (existingEnrollment) {
        throw new Error("ALREADY_ENROLLED");
      }

      // Check if this TrxID has already been used successfully or is currently under review by anyone
      const trxExists = await tx.order.findFirst({
        where: { trxId }
      });

      if (trxExists) {
        throw new Error("TRX_ALREADY_USED");
      }

      // Check if there is already a PENDING order for this course by this user.
      // If they made a mistake earlier and are trying again, we delete the old pending order
      // so they don't get permanently stuck unable to order!
      const existingPendingOrder = await tx.order.findFirst({
        where: {
          userId: user.id,
          courseId: course.id,
          status: "PENDING"
        }
      });

      if (existingPendingOrder) {
        await tx.order.delete({
          where: { id: existingPendingOrder.id }
        });
      }

      // Create Order safely
      const order = await tx.order.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          courseId: course.id,
          amount: course.discountPrice || course.price,
          status: "PENDING",
          paymentMethod,
          trxId,
          senderPhone,
          updatedAt: new Date(),
        }
      });

      return order;
    });

    return NextResponse.json({ 
      message: "অর্ডার সফল হয়েছে। ভেরিফিকেশনের জন্য অপেক্ষা করুন। (Order Successful)", 
      orderId: result.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error("Checkout error:", error);
    
    // Handle Custom Transaction Errors securely without leaking DB stack traces
    if (error.message === "ALREADY_ENROLLED") {
      return NextResponse.json({ message: "আপনি ইতিমধ্যে এই কোর্সে এনরোল করেছেন" }, { status: 409 });
    }
    if (error.message === "TRX_ALREADY_USED") {
      return NextResponse.json({ message: "এই Transaction ID (TrxID) টি ইতিমধ্যে ব্যবহার করা হয়েছে। ভুয়া তথ্য প্রদান থেকে বিরত থাকুন।" }, { status: 400 });
    }
    if (error.message === "COURSE_NOT_FOUND" || error.message === "COURSE_NOT_AVAILABLE") {
      return NextResponse.json({ message: "কোর্সটি বর্তমানে উপলব্ধ নয়" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "সার্ভার ত্রুটি, অনুগ্রহ করে আবার চেষ্টা করুন" }, { status: 500 });
  }
}

