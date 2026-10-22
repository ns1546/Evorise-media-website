import { prisma as db } from "@/lib/prisma";
import CoursesClient from "./CoursesClient";

export const metadata = {
  title: "সব কোর্স | EvoRise Media",
  description: "EvoRise Media — প্রফেশনাল মিউজিক প্রোডাকশন, মিক্সিং, মাস্টারিং এবং সাউন্ড ডিজাইন কোর্সসমূহ।",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await db.course.findMany({
    where: { published: true, isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      modules: {
        where: { isDeleted: false },
        include: { lessons: { where: { isDeleted: false } } }
      }
    },
  });

  return <CoursesClient initialCourses={courses} />;
}
