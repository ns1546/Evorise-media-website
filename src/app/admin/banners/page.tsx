"use client";

import { useState, useEffect } from "react";
import {
  Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Link as LinkIcon,
  ExternalLink, Eye, EyeOff, Loader2, ArrowUpDown, CheckCircle, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface BannerItem {
  id: string;
  title: string | null;
  imageUrl: string;
  targetUrl: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
}

const TARGET_PRESETS = [
  { label: "সকল কোর্স", url: "/courses" },
  { label: "ভোকাল কোর্স", url: "/courses/vocal-processing-course" },
  { label: "ফ্রি একাউন্ট", url: "/register" },
  { label: "আমাদের সম্পর্কে", url: "/about" },
  { label: "যোগাযোগ", url: "/contact" },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState<number>(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/admin/banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Fetch banners error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        const { url } = await res.json();
        setImageUrl(url);
      } else {
        alert("ইমেজ আপলোডে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      }
    } catch (err) {
      console.error(err);
      alert("সার্ভার ত্রুটি।");
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setImageUrl("");
    setTargetUrl("");
    setIsActive(true);
    setOrder(0);
    setIsAdding(false);
    setEditingId(null);
    setSubmitting(false);
  };

  const handleEdit = (banner: BannerItem) => {
    setTitle(banner.title || "");
    setImageUrl(banner.imageUrl);
    setTargetUrl(banner.targetUrl || "");
    setIsActive(banner.isActive);
    setOrder(banner.order ?? 0);
    setEditingId(banner.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!imageUrl.trim()) {
      alert("ব্যানার ইমেজ প্রদান করুন (ফাইল আপলোড অথবা ইমেজ লিঙ্ক)।");
      return;
    }

    setSubmitting(true);
    const payload = {
      title: title.trim() || undefined,
      imageUrl: imageUrl.trim(),
      targetUrl: targetUrl.trim() || undefined,
      isActive,
      order: Number(order) || 0,
    };

    try {
      const url = editingId ? `/api/admin/banners/${editingId}` : "/api/admin/banners";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        fetchBanners();
      } else {
        const errData = await res.json();
        alert(`সংরক্ষণে সমস্যা হয়েছে: ${errData.message || JSON.stringify(errData.errors)}`);
      }
    } catch (error) {
      console.error(error);
      alert("সার্ভার সংযোগে ত্রুটি।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (banner: BannerItem) => {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b))
        );
      } else {
        alert("স্ট্যাটাস পরিবর্তনে সমস্যা হয়েছে।");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("আপনি কি নিশ্চিত এই ব্যানারটি মুছে ফেলতে চান?")) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert("মুছে ফেলতে সমস্যা হয়েছে।");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div className="space-y-8">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            হিরো ব্যানার ম্যানেজমেন্ট
          </h1>
          <p className="text-foreground/70 text-sm mt-1">
            হোমপেজের স্লাইডার ব্যানার যুক্ত ও পরিচালনা করুন — ব্যবহারকারী ব্যানারে ক্লিক করে নির্দিষ্ট পেজে যেতে পারবে।
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => {
              resetForm();
              setOrder(banners.length + 1);
              setIsAdding(true);
            }}
            className="gap-2 bg-primary text-foreground font-bold hover:opacity-90 shrink-0"
          >
            <Plus size={18} /> নতুন ব্যানার যোগ করুন
          </Button>
        )}
      </div>

      {/* ── Stats Strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface/40">
          <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">মোট ব্যানার</p>
          <p className="text-2xl font-black text-foreground mt-1">{banners.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-surface/40">
          <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">সক্রিয় ব্যানার</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border border-border bg-surface/40">
          <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">স্লাইডার স্ট্যাটাস</p>
          <p className="text-sm font-bold text-foreground mt-2 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${activeCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-yellow-500"}`} />
            {activeCount > 0 ? "হোমপেজে লাইভ চালু আছে" : "কোনো সক্রিয় ব্যানার নেই"}
          </p>
        </div>
      </div>

      {/* ── Form: Add / Edit Banner ────────────────────────────── */}
      {isAdding && (
        <Card className="border-border bg-surface/80 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-foreground">
                  {editingId ? "ব্যানার এডিট করুন" : "নতুন ব্যানার যোগ করুন"}
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  ব্যানার ইমেজ, ক্লিকযোগ্য লিঙ্ক এবং ক্রম নির্ধারণ করুন
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                className="text-foreground/60 hover:text-foreground rounded-full"
              >
                <X size={20} />
              </Button>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">
                    ব্যানার শিরোনাম (ঐচ্ছিক)
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: ঈদুল ফিতর স্পেশাল — ৩০% ছাড়!"
                    className="bg-background border-border text-foreground"
                  />
                  <p className="text-xs text-foreground/50">
                    শিরোনাম দিলে ব্যানারের নিচে একটি সুন্দর টেক্সট ওভারলে দেখাবে। খালি রাখলে শুধু ব্যানার ইমেজ দেখাবে।
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground flex items-center justify-between">
                    <span>টার্গেট লিঙ্ক / ইউআরএল (ঐচ্ছিক)</span>
                    <span className="text-[11px] font-normal text-foreground/50">ক্লিক করলে এই পেজে যাবে</span>
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
                    <Input
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="/courses/vocal-processing-course"
                      className="pl-9 bg-background border-border text-foreground font-mono text-sm"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-foreground/50">দ্রুত নির্বাচন:</span>
                    {TARGET_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setTargetUrl(preset.url)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-all ${
                          targetUrl === preset.url
                            ? "bg-primary text-foreground border-primary font-bold"
                            : "border-border bg-background hover:bg-surface text-foreground/80"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ArrowUpDown size={14} className="text-primary" /> প্রদর্শন ক্রম (Order)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={order}
                      onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                      className="bg-background border-border text-foreground font-mono"
                    />
                    <p className="text-[11px] text-foreground/50">ছোট সংখ্যা আগে প্রদর্শিত হবে (যেমন: ১, ২, ৩)।</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-foreground">ব্যানার স্ট্যাটাস</Label>
                    <div className="flex items-center justify-between p-2.5 bg-background border border-border rounded-xl h-10">
                      <span className="text-xs font-semibold text-foreground">
                        {isActive ? "সক্রিয় (Active)" : "নিষ্ক্রিয় (Inactive)"}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-foreground/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Image Input & Live Preview */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-primary" /> ব্যানার ইমেজ <span className="text-red-500">*</span>
                  </Label>
                  <div className="inline-flex p-0.5 rounded-lg bg-background border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        imageInputMode === "upload" ? "bg-surface text-foreground shadow-sm" : "text-foreground/60"
                      }`}
                    >
                      আপলোড করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        imageInputMode === "url" ? "bg-surface text-foreground shadow-sm" : "text-foreground/60"
                      }`}
                    >
                      ইমেজ লিঙ্ক (URL)
                    </button>
                  </div>
                </div>

                {imageInputMode === "upload" ? (
                  imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-border aspect-21/9 bg-background group shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background/90 text-foreground text-xs font-bold hover:bg-background">
                            <Upload size={14} /> পরিবর্তন
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                          </label>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs font-bold h-8"
                            onClick={() => setImageUrl("")}
                          >
                            <Trash2 size={14} className="mr-1" /> রিমুভ
                          </Button>
                        </div>
                      </div>
                      <p className="text-[11px] text-foreground/50 text-center">
                        মাউস হভার করে পরিবর্তন বা মুছে ফেলা যাবে।
                      </p>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full aspect-21/9 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-surface/30 transition-all bg-background/50">
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        {uploadingImage ? (
                          <>
                            <Loader2 size={32} className="animate-spin text-primary mb-2" />
                            <p className="text-sm font-bold text-foreground">ইমেজ আপলোড হচ্ছে...</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                              <Upload size={22} />
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              ক্লিক করে ব্যানার আপলোড করুন
                            </p>
                            <p className="text-xs text-foreground/50 mt-1">
                              অনুমোদিত সাইজ: ১৯২০ x ৬৫০ বা ১৬:৯ অনুপাত (PNG, JPG, WebP)
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  )
                ) : (
                  <div className="space-y-3">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/banner-image.jpg"
                      className="bg-background border-border text-foreground font-mono text-sm"
                    />
                    {imageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-border aspect-21/9 bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={() => alert("ইমেজ লোড হতে পারছে না। ইউআরএল সঠিক আছে কিনা যাচাই করুন।")}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Live Preview Box */}
                {imageUrl && (
                  <div className="p-3 rounded-xl bg-background/60 border border-border">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
                      লাইভ হোমপেজ প্রিভিউ
                    </p>
                    <div className="relative rounded-lg overflow-hidden border border-border aspect-21/9">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                      {title && (
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col justify-end">
                          <p className="text-white text-sm md:text-base font-black truncate">{title}</p>
                          {targetUrl && (
                            <span className="text-[10px] text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                              লিঙ্ক: {targetUrl} →
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-5 border-t border-border">
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
                className="border-border text-foreground hover:bg-surface font-semibold"
              >
                বাতিল
              </Button>
              <Button
                onClick={handleSave}
                disabled={submitting || uploadingImage}
                className="bg-primary text-foreground font-bold hover:opacity-90 gap-2 min-w-32"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Save size={16} /> সংরক্ষণ করুন
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Banners List ──────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-surface/50 border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 bg-surface/20 border-2 border-dashed border-border rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-foreground">এখনো কোনো ব্যানার তৈরি করা হয়নি</h3>
          <p className="text-foreground/60 text-sm mt-1 max-w-md mx-auto">
            হোমপেজের হিরো সেকশনে আকর্ষণীয় স্লাইডার প্রদর্শনের জন্য &ldquo;নতুন ব্যানার যোগ করুন&rdquo; বাটনে ক্লিক করে ব্যানার যুক্ত করুন।
          </p>
          <Button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="mt-6 gap-2 bg-primary text-foreground font-bold hover:opacity-90"
          >
            <Plus size={18} /> প্রথম ব্যানার যোগ করুন
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground/60 px-1">
            <span>ব্যানার তালিকা ({banners.length} টি)</span>
            <span>প্রদর্শন ক্রম অনুসারে সাজানো</span>
          </div>

          <div className="grid gap-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`flex flex-col md:flex-row gap-5 p-4 md:p-5 rounded-2xl border transition-all duration-200 bg-surface/60 hover:bg-surface/90 shadow-sm ${
                  banner.isActive ? "border-border" : "border-border/40 opacity-70 bg-surface/20"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-full md:w-72 aspect-21/9 shrink-0 rounded-xl overflow-hidden border border-border bg-background shadow-inner group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || "Banner"}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      !banner.isActive && "grayscale"
                    }`}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-white font-mono text-[10px] font-bold border border-white/10">
                    #{banner.order ?? index + 1}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className={`font-black text-lg truncate ${!banner.isActive ? "text-foreground/50" : "text-foreground"}`}>
                        {banner.title || "নামবিহীন ব্যানার"}
                      </h3>
                      {banner.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={11} /> সক্রিয় (Active)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-foreground/10 text-foreground/50 border border-foreground/10">
                          <EyeOff size={11} /> নিষ্ক্রিয়
                        </span>
                      )}
                    </div>

                    {banner.targetUrl ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-foreground/50 font-medium">টার্গেট লিঙ্ক:</span>
                        <a
                          href={banner.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline"
                        >
                          <LinkIcon size={12} /> {banner.targetUrl}
                          <ExternalLink size={11} className="opacity-70" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/40 mt-1 italic">
                        কোনো লিঙ্ক দেওয়া নেই (ক্লিকযোগ্য নয়)
                      </p>
                    )}
                  </div>

                  {/* Quick stats / metadata */}
                  <div className="flex items-center gap-4 text-xs text-foreground/50 pt-3 mt-3 border-t border-border/50">
                    <span>ক্রম: <strong className="text-foreground font-mono">#{banner.order ?? 0}</strong></span>
                    <span>•</span>
                    <span>তৈরি: {new Date(banner.createdAt).toLocaleDateString("bn-BD")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(banner)}
                    title={banner.isActive ? "নিষ্ক্রিয় করুন" : "সক্রিয় করুন"}
                    className={`gap-1.5 text-xs font-semibold ${
                      banner.isActive
                        ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        : "text-foreground/50 hover:text-foreground hover:bg-surface"
                    }`}
                  >
                    {banner.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                    <span className="md:hidden">{banner.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(banner)}
                    className="gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  >
                    <Edit3 size={15} />
                    <span>এডিট</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(banner.id)}
                    className="gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 size={15} />
                    <span>ডিলিট</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
