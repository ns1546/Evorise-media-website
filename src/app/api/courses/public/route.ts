import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function GET() {
  try {
    const courses = await db.course.findMany({
      take: 6,
      where: { published: true, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        modules: {
          where: { isDeleted: false },
          include: {
            lessons: {
              where: { isDeleted: false }
            }
          }
        }
      }
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("Public courses fetch error:", error);
    return NextResponse.json({ message: "সার্ভার ত্রুটি" }, { status: 500 });
  }
}
