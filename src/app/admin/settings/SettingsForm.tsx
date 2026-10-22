"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, Save, Smartphone, MessageSquare, 
  Mail, Bell, Activity, CheckCircle2, Loader2, Info,
  ShieldCheck, Globe, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  facebookPixelId?: string | null;
  googleAnalyticsId?: string | null;
  bkashNumber?: string | null;
  nagadNumber?: string | null;
  rocketNumber?: string | null;
  whatsappNumber?: string | null;
  supportEmail?: string | null;
  noticeText?: string | null;
}

export default function SettingsForm({ initialSettings }: { initialSettings: SettingsData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SettingsData>({
    facebookPixelId: initialSettings.facebookPixelId || "",
    googleAnalyticsId: initialSettings.googleAnalyticsId || "",
    bkashNumber: initialSettings.bkashNumber || "01700000000",
    nagadNumber: initialSettings.nagadNumber || "01700000000",
    rocketNumber: initialSettings.rocketNumber || "",
    whatsappNumber: initialSettings.whatsappNumber || "01700000000",
    supportEmail: initialSettings.supportEmail || "support@evorisemedia.com",
    noticeText: initialSettings.noticeText || "",
  });

  const handleChange = (field: keyof SettingsData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("সব সেটিংস সফলভাবে আপডেট ও সেভ হয়েছে!");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.message || "সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে");
      }
    } catch (err) {
      console.error(err);
      toast.error("সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* 0. Automated Gateway — Bingo Pay (Production Mode) */}
      <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-foreground">Bingo Pay অটোমেটিক গেটওয়ে</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  PRODUCTION ACTIVE
                </span>
              </div>
              <p className="text-xs text-foreground/75 font-medium">
                বিকাশ, নগদ, রকেট এবং কার্ডের স্বয়ংক্রিয় ইনস্ট্যান্ট পেমেন্ট গেটওয়ে। শিক্ষার্থীরা পে করলেই সাথে সাথে কোর্স অ্যাক্সেস পেয়ে যাবে।
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-surface/80 border border-border rounded-xl p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-foreground/80">Bingo Pay Webhook / IPN URL:</span>
              <code className="bg-surface px-2.5 py-1 rounded-md text-primary font-mono text-xs select-all border border-border">
                https://evorisemedia.com/api/payment/bingopay/webhook
              </code>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-foreground/80">Customer Return / Callback URL:</span>
              <code className="bg-surface px-2.5 py-1 rounded-md text-foreground font-mono text-xs select-all border border-border">
                https://evorisemedia.com/api/payment/bingopay/callback
              </code>
            </div>
          </div>

          <div className="p-3 bg-surface/50 border border-border rounded-xl text-xs text-foreground/75 flex items-start gap-2.5">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              আপনার Bingo Pay মার্চেন্ট ড্যাশবোর্ড থেকে প্রাপ্ত <strong>Merchant ID</strong>, <strong>API Key</strong> এবং <strong>Secret Key</strong> আপনার প্রোডাকশন সার্ভারের <code className="text-primary font-mono">.env</code> ফাইলে যুক্ত করুন।
            </p>
          </div>
        </div>
      </div>

      {/* 1. Payment Numbers Section */}
      <div className="bg-surface/5 border border-border rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Smartphone size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">পেমেন্ট গেটওয়ে ও একাউন্ট নম্বর</h2>
            <p className="text-xs text-foreground/70 font-medium">
              চেকআউট পেইজে শিক্ষার্থীরা যে নম্বরে সেন্ড মানি (Send Money) করবে তা এখান থেকে সরাসরি নিয়ন্ত্রণ করুন।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              বিকাশ নম্বর (bKash Personal/Merchant) <span className="text-pink-400">*</span>
            </label>
            <input
              type="text"
              value={formData.bkashNumber || ""}
              onChange={(e) => handleChange("bkashNumber", e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono font-bold focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/60 transition-all text-base"
            />
            <p className="text-[11px] text-foreground/60 font-medium">চেকআউটে বিকাশ অপশন সিলেক্ট করলে এই নম্বরটি দেখানো হবে।</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              নগদ নম্বর (Nagad Personal/Merchant) <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={formData.nagadNumber || ""}
              onChange={(e) => handleChange("nagadNumber", e.target.value)}
              placeholder="01XXXXXXXXX"
              required
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono font-bold focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/60 transition-all text-base"
            />
            <p className="text-[11px] text-foreground/60 font-medium">চেকআউটে নগদ অপশন সিলেক্ট করলে এই নম্বরটি দেখানো হবে।</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-bold text-foreground">
              রকেট নম্বর (Rocket - ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={formData.rocketNumber || ""}
              onChange={(e) => handleChange("rocketNumber", e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-base"
            />
          </div>
        </div>
      </div>

      {/* 2. Customer Support & WhatsApp */}
      <div className="bg-surface/5 border border-border rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">সরাসরি শিক্ষার্থী সাপোর্ট ও যোগাযোগ</h2>
            <p className="text-xs text-foreground/70 font-medium">
              ওয়েবসাইট ও চেকআউটের হেল্পলাইনে যে WhatsApp নম্বর ও সাপোর্ট ইমেইল থাকবে।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              হোয়াটসঅ্যাপ হেল্পলাইন নম্বর <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={formData.whatsappNumber || ""}
              onChange={(e) => handleChange("whatsappNumber", e.target.value)}
              placeholder="01XXXXXXXXX বা +8801XXXXXXXXX"
              required
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono font-bold focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all text-base"
            />
            <p className="text-[11px] text-foreground/60 font-medium">শিক্ষার্থীরা সমস্যায় পড়লে সরাসরি এই নম্বরে WhatsApp মেসেজ দিতে পারবে।</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              অফিসিয়াল সাপোর্ট ইমেইল <span className="text-primary">*</span>
            </label>
            <input
              type="email"
              value={formData.supportEmail || ""}
              onChange={(e) => handleChange("supportEmail", e.target.value)}
              placeholder="support@evorisemedia.com"
              required
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-base"
            />
          </div>
        </div>
      </div>

      {/* 3. Notice / Announcement */}
      <div className="bg-surface/5 border border-border rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">ওয়েবসাইট নোটিশ ও ডিসকাউন্ট ঘোষণা</h2>
            <p className="text-xs text-foreground/70 font-medium">
              সব পেইজের শীর্ষে বা নোটিফিকেশন বারে স্পেশাল অফার দেখাতে পারেন (খালি রাখলে হাইড থাকবে)।
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-foreground">
            নোটিশ বার্তা / অফার টেক্সট
          </label>
          <textarea
            value={formData.noticeText || ""}
            onChange={(e) => handleChange("noticeText", e.target.value)}
            rows={2}
            placeholder="যেমন: 🎉 সীমিত সময়ের অফার! যে কোনো কোর্সে ভর্তি হলেই পাচ্ছেন বিশেষ ডিসকাউন্ট এবং ফ্রি রিসোর্স প্যাক।"
            className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm leading-relaxed"
          />
        </div>
      </div>

      {/* 4. Tracking & Analytics */}
      <div className="bg-surface/5 border border-border rounded-2xl p-6 md:p-8 backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-foreground">মার্কেটিং ট্র্যাকিং ও অ্যানালিটিক্স</h2>
            <p className="text-xs text-foreground/70 font-medium">
              Facebook Ads এবং Google ট্রাফিকের জন্য Pixel ও Measurement ID যুক্ত করুন।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Facebook Pixel ID
            </label>
            <input
              type="text"
              value={formData.facebookPixelId || ""}
              onChange={(e) => handleChange("facebookPixelId", e.target.value)}
              placeholder="e.g. 123456789012345"
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
            />
            <p className="text-[11px] text-foreground/60 font-medium">PageView, InitiateCheckout ও Purchase ট্র্যাক করবে।</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-foreground">
              Google Analytics ID (GA4)
            </label>
            <input
              type="text"
              value={formData.googleAnalyticsId || ""}
              onChange={(e) => handleChange("googleAnalyticsId", e.target.value)}
              placeholder="e.g. G-XXXXXXXXXX"
              className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-foreground font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-semibold"
            />
            <p className="text-[11px] text-foreground/60 font-medium">Google Analytics 4 মেজারমেন্ট আইডি।</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="sticky bottom-6 z-10 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black text-base shadow-[0_10px_30px_rgba(200,144,10,0.3)] hover:bg-primary/90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {loading ? "সংরক্ষণ হচ্ছে..." : "সকল সেটিংস সংরক্ষণ করুন"}
        </button>
      </div>
    </form>
  );
}
