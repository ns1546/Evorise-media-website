"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function OrderActionButtons({ 
  orderId, 
  currentStatus 
}: { 
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [confirm, setConfirm] = useState<null | "COMPLETED" | "FAILED">(null);

  const handleAction = async (status: "COMPLETED" | "FAILED") => {
    const setter = status === "COMPLETED" ? setApproving : setRejecting;
    setter(true);
    setConfirm(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "COMPLETED" ? "অর্ডার অনুমোদিত এবং কোর্স এনরোল সম্পন্ন!" : "অর্ডার বাতিল ও এক্সেস প্রত্যাহার করা হয়েছে।");
        router.refresh();
      } else {
        const err = await res.json();
        toast.error(err.message || "অর্ডার আপডেট করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      console.error(err);
      toast.error("সার্ভার ত্রুটি। আবার চেষ্টা করুন।");
    } finally {
      setter(false);
    }
  };

  // Inline confirmation step
  if (confirm) {
    const isApprove = confirm === "COMPLETED";
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground/80 whitespace-nowrap">
          {isApprove ? "অনুমোদন করবেন?" : "বাতিল করবেন?"}
        </span>
        <Button
          size="sm"
          className={`h-7 text-xs font-bold px-2.5 ${isApprove ? "bg-green-600 hover:bg-green-700 text-foreground" : "bg-red-600 hover:bg-red-700 text-foreground"}`}
          onClick={() => handleAction(confirm)}
          disabled={approving || rejecting}
        >
          হ্যাঁ
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs font-bold px-2 border-border"
          onClick={() => setConfirm(null)}
        >
          না
        </Button>
      </div>
    );
  }

  if (currentStatus === "PENDING") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-foreground h-7 text-xs font-bold px-2.5 shadow-sm"
          disabled={approving || rejecting}
          onClick={() => setConfirm("COMPLETED")}
        >
          {approving ? (
            <Loader2 size={13} className="mr-1 animate-spin" />
          ) : (
            <CheckCircle size={13} className="mr-1" />
          )}
          অনুমোদন
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-bold px-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          disabled={approving || rejecting}
          onClick={() => setConfirm("FAILED")}
        >
          {rejecting ? (
            <Loader2 size={13} className="mr-1 animate-spin" />
          ) : (
            <XCircle size={13} className="mr-1" />
          )}
          বাতিল
        </Button>
      </div>
    );
  }

  // If already COMPLETED, allow revoking/changing to FAILED if mistaken
  if (currentStatus === "COMPLETED") {
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] font-bold px-2 border-red-500/20 text-red-400 hover:bg-red-500/10"
          disabled={approving || rejecting}
          onClick={() => setConfirm("FAILED")}
          title="ভুলবশত অনুমোদিত হলে বাতিল করুন"
        >
          <XCircle size={12} className="mr-1" />
          বাতিল করুন
        </Button>
      </div>
    );
  }

  // If FAILED, allow re-approving
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] font-bold px-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
        disabled={approving || rejecting}
        onClick={() => setConfirm("COMPLETED")}
        title="পুনরায় অনুমোদন করুন"
      >
        <RotateCcw size={12} className="mr-1" />
        পুনরায় অনুমোদন
      </Button>
    </div>
  );
}
