"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fbEvent } from "@/components/providers/MetaPixel";
import { gtagEvent } from "@/components/providers/GoogleAnalytics";
import {
  CheckCircle2, AlertCircle, Lock, Shield, ShieldCheck,
  ArrowRight, Smartphone, Loader2, Copy, Check, MessageCircle,
  ChevronDown, ChevronUp
} from "lucide-react";

import { use } from "react";

export default function CheckoutPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [course, setCourse] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("uddoktapay");
  const [trxId, setTrxId] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!trxId.trim() || !phone.trim()) {
      setError("দয়া করে ট্রানজেকশন আইডি এবং যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন।");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          paymentMethod,
          trxId: trxId.trim().toUpperCase(),
          senderPhone: phone.trim(),
        }),
      });
      if (res.ok) {
        fbEvent("Purchase", {
          content_name: course.title,
          content_type: "product",
          content_ids: [course.id],
          value: effectivePrice,
          currency: "BDT"
        });
        gtagEvent("purchase", {
          transaction_id: trxId.trim().toUpperCase(),
          value: effectivePrice,
          currency: "BDT",
          items: [{ item_name: course.title, item_id: course.id, price: effectivePrice }]
        });
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 4000);
      } else {
        const data = await res.json();
        setError(data.message || "পেমেন্ট সম্পন্ন করতে সমস্যা হয়েছে।");
      }
    } catch {
      setError("সার্ভার ত্রুটি! কিছুক্ষণ পর আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Loading ─────────────────────────────────────────────── */
  if (status === "loading" || !course) {
    return (
      <div className="min-h-screen pt-32 pb-24 flex items-center justify-center bg-surface border-t border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(200,144,10,0.35)]" />
          <p className="text-sm font-medium text-foreground/80">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  /* ── Success ─────────────────────────────────────────────── */
  if (success) {
    return (
      <div className="min-h-screen pt-32 pb-24 flex flex-col items-center justify-center bg-surface px-4 border-t border-border">
        <div className="bg-surface/5 border border-border backdrop-blur-md rounded-3xl p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(200,144,10,0.2)]">
            <CheckCircle2 size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-3" style={{ letterSpacing: "-0.02em" }}>
            পেমেন্ট সাবমিট হয়েছে!
          </h2>
          <p className="text-foreground/80 font-medium text-sm leading-relaxed mb-6">
            আপনার পেমেন্টটি রিভিউ অবস্থায় আছে। অ্যাডমিন ভেরিফাই করার পর কোর্সটি আপনার অ্যাকাউন্টে যুক্ত করা হবে।
          </p>
          <div className="flex items-center justify-center gap-2 text-primary text-xs font-bold">
            <Loader2 size={14} className="animate-spin" />
            ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-surface pt-24 pb-20 border-t border-border relative">
      {/* Dynamic background */}
      <div className="absolute inset-0 pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground/80 uppercase tracking-widest mb-2 sm:mb-3">
            <Lock size={12} className="text-primary" />
            নিরাপদ পেমেন্ট
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground" style={{ letterSpacing: "-0.025em" }}>
            চেকআউট
          </h1>
        </div>

        {/* ── Mobile Order Summary Accordion (Mobile-only) ── */}
        <div className="block lg:hidden mb-6 bg-surface/5 border border-border backdrop-blur-md rounded-2xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full p-4 flex items-center justify-between text-left gap-3 bg-surface hover:bg-surface/10 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-9 rounded-lg overflow-hidden bg-surface shrink-0 border border-border">
                {course.thumbnail && (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${course.thumbnail})` }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm text-foreground truncate">{course.title}</p>
                <p className="text-[11px] text-foreground/70 font-semibold flex items-center gap-1">
                  অর্ডার বিস্তারিত {mobileSummaryOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-primary">৳{effectivePrice}</span>
            </div>
          </button>

          {mobileSummaryOpen && (
            <div className="p-4 pt-3 border-t border-border space-y-3 bg-surface/5 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between font-medium text-foreground/80">
                  <span>কোর্সের নিয়মিত মূল্য:</span>
                  <span>৳{course.price}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span>ডিসকাউন্ট সঞ্চয়:</span>
                    <span>-৳{discountAmount}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 flex justify-between font-black text-sm text-foreground">
                  <span>সর্বমোট প্রদেয়:</span>
                  <span className="text-primary text-base">৳{effectivePrice}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex flex-wrap gap-2 text-[11px] text-foreground/80 font-semibold">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-primary" /> লাইফটাইম অ্যাক্সেস</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-primary" /> সার্টিফিকেট</span>
                <span className="flex items-center gap-1"><Shield size={12} className="text-primary" /> নিরাপদ সংযোগ</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* Payment form */}
          <div className="space-y-5">

            {/* Step 1 — Payment method */}
            <div className="bg-surface/5 border border-border backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-surface">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(200,144,10,0.4)]">১</span>
                <h2 className="font-black text-foreground text-base">পেমেন্ট মেথড বেছে নিন</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* UddoktaPay - Primary Recommended Automated Gateway */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("uddoktapay")}
                    className={`sm:col-span-2 relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                      paymentMethod === "uddoktapay"
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(200,144,10,0.25)]"
                        : "border-border bg-surface/5 hover:border-border hover:bg-surface/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-primary">স্বয়ংক্রিয় গেটওয়ে (UddoktaPay)</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                          ইনস্ট্যান্ট অটো-আনলক
                        </span>
                      </div>
                      {paymentMethod === "uddoktapay" && (
                        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                      বিকাশ, নগদ, রকেট, ডেবিট/ক্রেডিট কার্ড এবং ইন্টারনেট ব্যাংকিং দিয়ে সরাসরি পেমেন্ট করুন। পেমেন্ট শেষে কোর্স তাৎক্ষণিকভাবে আনলক হবে।
                    </p>
                  </button>

                  {/* Manual bKash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bkash")}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      paymentMethod === "bkash"
                        ? "border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
                        : "border-border bg-surface/5 hover:border-border hover:bg-surface/10"
                    }`}
                  >
                    {paymentMethod === "bkash" && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-pink-500 text-foreground flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                    <p className={`font-black text-base ${paymentMethod === "bkash" ? "text-pink-400" : "text-foreground"}`}>
                      bKash
                    </p>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">ম্যানুয়াল Send Money</p>
                  </button>

                  {/* Manual Nagad */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("nagad")}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      paymentMethod === "nagad"
                        ? "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                        : "border-border bg-surface/5 hover:border-border hover:bg-surface/10"
                    }`}
                  >
                    {paymentMethod === "nagad" && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-500 text-foreground flex items-center justify-center">
                        <CheckCircle2 size={12} />
                      </span>
                    )}
                    <p className={`font-black text-base ${paymentMethod === "nagad" ? "text-orange-400" : "text-foreground"}`}>
                      Nagad
                    </p>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">ম্যানুয়াল Send Money</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Step 2 — Instructions */}
            <div className="bg-surface/5 border border-border backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-surface">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(200,144,10,0.4)]">২</span>
                <h2 className="font-black text-foreground text-base">
                  {paymentMethod === "uddoktapay" ? "অনলাইন গেটওয়ে নির্দেশনা (UddoktaPay / Paymently)" : "পেমেন্ট করুন"}
                </h2>
              </div>
              <div className="p-6">
                {paymentMethod === "uddoktapay" ? (
                  <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck size={18} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">
                        নিরাপদ ও তাৎক্ষণিক অনলাইন পেমেন্ট
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {[
                        `নিচের বাটনে ক্লিক করলে আপনি অফিসিয়াল সুরক্ষিত পেমেন্ট গেটওয়েতে (Paymently) চলে যাবেন`,
                        `সেখানে বিকাশ, নগদ, কার্ড বা যেকোনো অপশন বেছে নিয়ে পেমেন্ট সম্পন্ন করুন`,
                        `পেমেন্ট সফল হওয়ার সাথে সাথে আমাদের সিস্টেম স্বয়ংক্রিয়ভাবে আপনার কোর্স আনলক করে দেবে`,
                        `কোনো অপেক্ষার প্রয়োজন নেই — আপনি সাথে সাথেই লেসন দেখা শুরু করতে পারবেন`,
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-foreground/80 font-medium leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>

                    {settings?.whatsappNumber && (
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground/70 font-medium">কোনো সহায়তা লাগলে যোগাযোগ করুন:</span>
                        <a
                          href={`https://wa.me/88${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello EvoRise Media, I am purchasing course: ${course?.title || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-500 font-bold hover:underline"
                        >
                          <MessageCircle size={14} />
                          WhatsApp হেল্পলাইন
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone size={16} className="text-primary" />
                      <span className="text-sm font-bold text-foreground">
                        {paymentMethod === "bkash" ? "বিকাশ" : "নগদ"} অ্যাপে Send Money করুন
                      </span>
                    </div>

                    {/* Active Number Box with 1-Click Copy */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-primary/10 border border-primary/25 rounded-xl">
                      <div>
                        <span className="text-xs text-foreground/70 font-semibold block mb-0.5">
                          প্রাপক নম্বর ({paymentMethod === "bkash" ? "bKash Personal" : "Nagad Personal"}):
                        </span>
                        <span className="text-xl font-mono font-black text-primary tracking-wider">
                          {paymentMethod === "bkash" ? (settings?.bkashNumber || "01700000000") : (settings?.nagadNumber || "01700000000")}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const num = paymentMethod === "bkash" ? (settings?.bkashNumber || "01700000000") : (settings?.nagadNumber || "01700000000");
                          navigator.clipboard.writeText(num);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary-dark transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        {copied ? <Check size={14} className="text-primary-foreground" /> : <Copy size={14} />}
                        {copied ? "কপি হয়েছে!" : "নম্বর কপি করুন"}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2">
                      {[
                        `${paymentMethod === "bkash" ? "বিকাশ" : "নগদ"} অ্যাপে প্রবেশ করে Send Money সিলেক্ট করুন`,
                        `উপরের নম্বরে মোট ৳${effectivePrice} টাকা সেন্ড মানি করুন`,
                        `পেমেন্ট সম্পন্ন হওয়ার পর ফিরতি SMS থেকে Transaction ID (TrxID) সংগ্রহ করুন`,
                        `নিচের ৩ নম্বর ধাপে আপনার প্রেরক নম্বর ও TrxID লিখে সাবমিট করুন`,
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-foreground/80 font-medium leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>

                    {settings?.whatsappNumber && (
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground/70 font-medium">কোনো অসুবিধা হলে সরাসরি সহায়তা নিন:</span>
                        <a
                          href={`https://wa.me/88${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello EvoRise Media, I am on checkout for course: ${course?.title || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-emerald-500 font-bold hover:underline"
                        >
                          <MessageCircle size={14} />
                          WhatsApp হেল্পলাইন
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 — Checkout action */}
            <div className="bg-surface/5 border border-border backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-surface">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center shadow-[0_0_10px_rgba(200,144,10,0.4)]">৩</span>
                <h2 className="font-black text-foreground text-base">
                  {paymentMethod === "uddoktapay" ? "পেমেন্ট গেটওয়েতে যান" : "পেমেন্ট তথ্য সাবমিট করুন"}
                </h2>
              </div>

              {paymentMethod === "uddoktapay" ? (
                <form onSubmit={handleUddoktaPaySubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
                      <AlertCircle size={16} className="shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="customer-phone" className="block text-sm font-bold text-foreground/80 mb-2">
                      আপনার মোবাইল নম্বর (SMS কনফার্মেশনের জন্য)
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 px-4 border border-border rounded-xl text-sm font-medium text-foreground placeholder-foreground/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 py-3.5 bg-primary text-primary-foreground font-black text-base rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(200,144,10,0.4)] hover:shadow-[0_0_30px_rgba(200,144,10,0.6)] hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Bingo Pay গেটওয়ে লোড হচ্ছে...
                      </>
                    ) : (
                      <>
                        Bingo Pay-তে পে করুন (৳{effectivePrice}) <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-foreground/80 font-medium">
                    <Lock size={12} className="text-primary" />
                    ২৫৬-বিট SSL এনক্রিপ্টেড ও সম্পূর্ণ নিরাপদ লেনদেন
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-bold">
                      <AlertCircle size={16} className="shrink-0" /> {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="sender-phone" className="block text-sm font-bold text-foreground/80 mb-2">
                      যে নম্বর থেকে টাকা পাঠিয়েছেন
                    </label>
                    <input
                      id="sender-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 px-4 border border-border rounded-xl text-sm font-medium text-foreground placeholder-foreground/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="trx-id" className="block text-sm font-bold text-foreground/80 mb-2">
                      ট্রানজেকশন আইডি (TrxID)
                    </label>
                    <input
                      id="trx-id"
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="যেমন: 9A5X4M8R"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      className="w-full h-12 px-4 border border-border rounded-xl text-sm font-mono font-bold text-foreground placeholder-foreground/30 bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors tracking-widest uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-13 py-3.5 bg-primary text-primary-foreground font-black text-base rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(200,144,10,0.35)] hover:shadow-[0_0_25px_rgba(200,144,10,0.5)] hover:-translate-y-0.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        প্রসেসিং হচ্ছে...
                      </>
                    ) : (
                      <>
                        পেমেন্ট কনফার্ম করুন <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs text-foreground/80 font-medium">
                    <Lock size={11} />
                    এনক্রিপ্টেড ও নিরাপদ সংযোগ
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Order summary sidebar (Desktop only) */}
          <div className="hidden lg:block lg:sticky lg:top-24">
            <div className="bg-surface/5 border border-border backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface">
                <h3 className="font-black text-foreground text-base">অর্ডার সামারি</h3>
              </div>

              <div className="p-6">
                {/* Course thumb */}
                <div className="flex gap-3 mb-5 pb-5 border-b border-border">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-surface shrink-0 border border-border">
                    {course.thumbnail && (
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${course.thumbnail})` }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-0.5">
                      {course.title}
                    </h4>
                    <p className="text-xs text-primary font-bold">চিফ মেন্টর: JKH Jesan (EvoRise Media)</p>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="space-y-2.5 text-sm mb-5">
                  <div className="flex justify-between font-medium text-foreground/80">
                    <span>কোর্সের নিয়মিত মূল্য</span>
                    <span>৳{course.price}</span>
                  </div>
                  {discountAmount > 0 ? (
                    <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                      <span>ডিসকাউন্ট সঞ্চয়</span>
                      <span>-৳{discountAmount}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-medium text-foreground/60">
                      <span>ডিসকাউন্ট</span>
                      <span>৳০</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="font-black text-foreground">সর্বমোট প্রদেয়</span>
                  <span className="font-black text-2xl text-primary drop-shadow-[0_0_8px_rgba(200,144,10,0.35)]">৳{effectivePrice}</span>
                </div>
              </div>

              {/* Trust signals */}
              <div className="p-6 pt-0 space-y-2">
                {[
                  "লাইফটাইম কোর্স অ্যাক্সেস",
                  "প্রফেশনাল সার্টিফিকেট",
                  "২৪ঘণ্টার মধ্যে অ্যাক্সেস",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs font-medium text-foreground/80">
                    <CheckCircle2 size={13} className="text-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>

              {/* Secure badge */}
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
                  <Shield size={14} className="text-primary shrink-0" />
                  <span className="text-xs text-foreground/80 font-medium">
                    নিরাপদ ম্যানুয়াল পেমেন্ট · অ্যাডমিন ভেরিফিকেশন
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
