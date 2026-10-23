"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fbEvent } from "@/components/providers/MetaPixel";
import { gtagEvent } from "@/components/providers/GoogleAnalytics";
import {
  CheckCircle2, AlertCircle, Lock, ShieldCheck,
  ArrowRight, Loader2, MessageCircle, ChevronDown, ChevronUp,
  Sparkles, Award, Zap
} from "lucide-react";

export default function CheckoutPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [course, setCourse] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/checkout/${courseId}`);
    }
  }, [status, router, courseId]);

  useEffect(() => {
    const fetchCourseAndSettings = async () => {
      try {
        const [courseRes, settingsRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/settings`)
        ]);

        if (courseRes.ok) {
          const data = await courseRes.json();
          setCourse(data);
          const finalPrice = data.discountPrice && data.discountPrice < data.price ? data.discountPrice : data.price;
          fbEvent("InitiateCheckout", {
            content_name: data.title,
            content_category: "Course",
            content_ids: [data.id],
            currency: "BDT",
            value: finalPrice
          });
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setSettings(sData);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCourseAndSettings();
  }, [courseId]);

  const effectivePrice = course?.discountPrice && course.discountPrice < course.price 
    ? course.discountPrice 
    : (course?.price || 0);
  const discountAmount = course?.discountPrice && course.discountPrice < course.price 
    ? (course.price - course.discountPrice) 
    : 0;

  const handleUddoktaPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const uddoktaRes = await fetch("/api/payment/uddoktapay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const uddoktaData = await uddoktaRes.json();
      if (uddoktaRes.ok && uddoktaData.paymentUrl) {
        fbEvent("InitiatePaymentGateway", {
          content_name: course.title,
          currency: "BDT",
          value: effectivePrice
        });
        gtagEvent("begin_checkout", {
          item_name: course.title,
          currency: "BDT",
          value: effectivePrice
        });
        window.location.href = uddoktaData.paymentUrl;
        return;
      }

      setError(uddoktaData.message || "UddoktaPay গেটওয়েতে সংযোগ করতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } catch {
      setError("সার্ভার ত্রুটি! কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-foreground/70 font-bold text-sm">চেকআউট পেজ লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/60 mb-2">
            <Link href="/" className="hover:text-primary transition-colors">হোম</Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-primary transition-colors">কোর্সসমূহ</Link>
            <span>/</span>
            <span className="text-primary font-bold">নিরাপদ চেকআউট</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            নিরাপদ অনলাইন চেকআউট
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
              স্বয়ংক্রিয় অ্যাক্টিভেশন
            </span>
          </h1>
          <p className="text-sm text-foreground/75 mt-1 font-medium">
            UddoktaPay গেটওয়ের মাধ্যমে বিকাশ, নগদ, রকেট বা কার্ড দিয়ে তাৎক্ষণিক কোর্স আনলক করুন।
          </p>
        </div>

        {/* Mobile Sticky Order Summary Toggle */}
        <div className="lg:hidden mb-6 bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full px-5 py-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground/70">অর্ডারের বিবরণ</span>
              <span className="font-mono font-black text-lg text-primary">৳{effectivePrice}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-primary">
              <span>{mobileSummaryOpen ? "লুকান" : "দেখুন"}</span>
              {mobileSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {mobileSummaryOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-border space-y-3 bg-surface/50 text-sm">
              <div className="font-bold text-foreground">{course.title}</div>
              <div className="flex justify-between text-foreground/70">
                <span>নিয়মিত মূল্য</span>
                <span>৳{course.price}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>ডিসকাউন্ট</span>
                  <span>-৳{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base pt-2 border-t border-border">
                <span>পরিশোধযোগ্য মোট</span>
                <span className="text-primary">৳{effectivePrice}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left Column (Checkout Gateway Card) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Student Account Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold text-foreground/60 uppercase tracking-wider">শিক্ষার্থী অ্যাকাউন্ট</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={13} /> লগইন ভেরিফাইড
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-extrabold text-foreground text-base">{session?.user?.name || "Student"}</p>
                  <p className="text-xs text-foreground/65 font-mono mt-0.5">{session?.user?.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-surface border border-border text-foreground/75">
                    লাইফটাইম স্টুডেন্ট
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-foreground/60 leading-relaxed pt-1">
                পেমেন্ট সম্পন্ন হওয়ার সাথে সাথেই এই অ্যাকাউন্টে কোর্সটি স্বয়ংক্রিয়ভাবে যুক্ত হয়ে যাবে।
              </p>
            </div>

            {/* UddoktaPay Automated Gateway Selection */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-primary" />
                  <h2 className="font-black text-foreground text-base">পেমেন্ট গেটওয়ে (UddoktaPay)</h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  ইনস্ট্যান্ট অটো-আনলক
                </span>
              </div>

              <div className="p-6 space-y-5">
                {/* Method Overview Pill */}
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />
                      সমর্থিত সকল পেমেন্ট মেথড
                    </span>
                    <span className="text-xs font-bold text-primary">০% অতিরিক্ত চার্জ</span>
                  </div>

                  {/* Payment Icons / Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: "bKash (বিকাশ)", color: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30" },
                      { name: "Nagad (নগদ)", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
                      { name: "Rocket (রকেট)", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
                      { name: "Upay (উপায়)", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
                      { name: "Visa / Mastercard", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
                      { name: "Internet Banking", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" }
                    ].map((badge) => (
                      <span key={badge.name} className={`text-xs font-bold px-3 py-1 rounded-lg border ${badge.color}`}>
                        {badge.name}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-foreground/75 leading-relaxed pt-1">
                    নিচের বাটনে ক্লিক করলে UddoktaPay-র সুরক্ষিত পেজে নিয়ে যাওয়া হবে। সেখানে আপনার পছন্দের মাধ্যম (বিকাশ, নগদ, রকেট বা কার্ড) বেছে নিয়ে পেমেন্ট সম্পন্ন করুন।
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <form onSubmit={handleUddoktaPaySubmit} className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-primary text-primary-foreground font-black text-base rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(200,144,10,0.35)] hover:shadow-[0_0_30px_rgba(200,144,10,0.5)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>UddoktaPay গেটওয়েতে রিডাইরেক্ট করা হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <span>UddoktaPay দিয়ে পে করুন — ৳{effectivePrice}</span>
                        <ArrowRight size={18} strokeWidth={2.5} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-foreground/65 font-medium">
                    <Lock size={13} className="text-primary" />
                    <span>২৫৬-বিট SSL সুরক্ষিত ও এনক্রিপ্টেড অনলাইন পেমেন্ট</span>
                  </div>
                </form>
              </div>
            </div>

            {/* Helpline box */}
            {settings?.whatsappNumber && (
              <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between text-xs">
                <span className="text-foreground/75 font-medium">পেমেন্ট সংক্রান্ত কোনো জিজ্ঞাসা থাকলে:</span>
                <a
                  href={`https://wa.me/88${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello EvoRise Media, I need help regarding checkout for course: ${course?.title || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-600 font-bold hover:underline"
                >
                  <MessageCircle size={14} />
                  WhatsApp হেল্পলাইন
                </a>
              </div>
            )}
          </div>

          {/* Right Column (Sticky Order Summary) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface/50">
                <h3 className="font-black text-foreground text-base">অর্ডার সামারি</h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Course Card Preview */}
                <div className="flex gap-4 pb-6 border-b border-border">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.thumbnail || "/images/vocal-processing-course.jpg"}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-foreground line-clamp-2 leading-snug mb-1">
                      {course.title}
                    </h4>
                    <p className="text-xs text-primary font-bold">চিফ মেন্টর: JKH Jesan</p>
                    <p className="text-[11px] text-foreground/60 mt-0.5">EvoRise Media Academy</p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between font-medium text-foreground/75">
                    <span>কোর্সের নিয়মিত ফি</span>
                    <span className="font-mono">৳{course.price}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-600">
                      <span>স্পেশাল ডিসকাউন্ট সঞ্চয়</span>
                      <span className="font-mono">-৳{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline font-black text-lg pt-3 border-t border-border">
                    <span className="text-foreground">সর্বমোট প্রদেয়</span>
                    <span className="text-primary font-mono text-2xl">৳{effectivePrice}</span>
                  </div>
                </div>

                {/* Features included */}
                <div className="pt-4 border-t border-border space-y-2.5">
                  <span className="text-xs font-bold text-foreground/80 block uppercase tracking-wider mb-1">কোর্সের সাথে যা যা পাচ্ছেন:</span>
                  {[
                    "সম্পূর্ণ কোর্সে লাইফটাইম অ্যাক্সেস",
                    "মোবাইল, ট্যাবলেট ও পিসি থেকে যেকোনো সময় ক্লাস",
                    "প্রজেক্ট সোর্স ফাইল ও প্রিসেটস ডাউনলোড",
                    "কোর্স সমাপ্তিতে অফিশিয়াল ভেরিফাইড সার্টিফিকেট",
                    "স্টুডেন্ট ডিসকর্ড ও ফেসবুক প্রাইভেট গ্রুপ সাপোর্ট",
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-foreground/75">
                      <Zap size={14} className="text-primary shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Trust guarantee banner */}
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                  <Award size={20} className="text-primary shrink-0" />
                  <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                    <strong>১০০% মানি-ব্যাক নিশ্চয়তা:</strong> কোর্সে যুক্ত হয়ে ৩০ দিনে সন্তুষ্ট না হলে ফুল রিফান্ড।
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
