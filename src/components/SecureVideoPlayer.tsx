"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  ShieldAlert, EyeOff, Smartphone, LogOut,
  Lock, RotateCcw, Sliders, Check, ShieldCheck,
  Maximize, Minimize
} from "lucide-react";
import "plyr/dist/plyr.css";

interface SecureVideoPlayerProps {
  url: string;
  poster?: string;
  email: string;
  lessonId?: string;
  onEnded?: () => void;
}

// Clean 11-char YouTube ID extractor (strips &list= to prevent playlist leaks)
function extractYouTubeId(rawUrl: string): string {
  if (!rawUrl) return "";
  const shortMatch = rawUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = rawUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = rawUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  if (rawUrl.includes("PLD3xZgj75Tr8")) return "3Y99GpafFu0";
  if (/^[a-zA-Z0-9_-]{11}$/.test(rawUrl.trim())) return rawUrl.trim();
  return "";
}

export default function SecureVideoPlayer({
  url,
  poster,
  email,
  lessonId,
  onEnded,
}: SecureVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoTagRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plyrInstanceRef = useRef<any>(null);

  // Mount & Visibility States
  const [isMounted, setIsMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Security States
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [isCaptureBlackout, setIsCaptureBlackout] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [isDeviceConflict, setIsDeviceConflict] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [selectedQuality, setSelectedQuality] = useState<string>("hd1080");
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const blackoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hudTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedIncidentRef = useRef<Record<string, number>>({});

  // Detection
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be") || /^[a-zA-Z0-9_-]{11}$/.test(url.trim());
  const youtubeId = isYouTube ? extractYouTubeId(url) : "";
  const isHls = url.includes(".m3u8");
  const isDirectVideo = !isYouTube;
  const directVideoSrc = isDirectVideo && !isHls
    ? (lessonId ? `/api/video/stream?lessonId=${encodeURIComponent(lessonId)}` : url)
    : url;

  // Mount detection for Next.js SSR
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-hide controls & overlays while playing
  const handleUserActivity = useCallback(() => {
    setShowOverlays(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowOverlays(false);
        setShowQualityDropdown(false);
      }, 2500);
    }
  }, [isPlaying]);

  const triggerHud = useCallback((msg: string) => {
    setHudMessage(msg);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudMessage(null), 2000);
  }, []);

  // Incident Reporter
  const reportIncident = useCallback(async (type: string, details?: string) => {
    const now = Date.now();
    const lastReport = lastReportedIncidentRef.current[type] || 0;
    if (now - lastReport < 8000) return;
    lastReportedIncidentRef.current[type] = now;

    try {
      await fetch("/api/security/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details, lessonId }),
      });
    } catch (e) {}
  }, [lessonId]);

  // ── TRIGGER AGGRESSIVE INSTANT CAPTURE BLACKOUT ──────────────
  const triggerCaptureBlackout = useCallback((reason: string) => {
    setIsCaptureBlackout(true);
    try {
      if (plyrInstanceRef.current) plyrInstanceRef.current.pause();
    } catch (e) {}

    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText("🔒 EVO RISE SECURITY: SCREENSHOT PROHIBITED").catch(() => {});
      }
    } catch (e) {}

    reportIncident("SCREENSHOT_ATTEMPT", reason);

    if (blackoutTimerRef.current) clearTimeout(blackoutTimerRef.current);
    blackoutTimerRef.current = setTimeout(() => {
      setIsCaptureBlackout(false);
    }, 4000);
  }, [reportIncident]);

  // 1. Intercept Browser Screen Recording API
  useEffect(() => {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = () => {
          triggerCaptureBlackout("ব্রাউজার স্ক্রিন শেয়ার / রেকর্ডিং এপিআই সনাক্ত হয়েছে।");
          return Promise.reject(new Error("Screen recording is strictly prohibited by security policy."));
        };
      }
    } catch (e) {}
  }, [triggerCaptureBlackout]);

  // 2. Dual-Engine Window Focus & App-Switching Guard (PC + Mobile)
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    );

    const handleFocusCheck = () => {
      if (typeof document === "undefined") return;
      const isDocHidden = document.hidden || document.visibilityState === "hidden";
      const isLostFocus = !isMobileDevice && !document.hasFocus();

      if (isDocHidden || isLostFocus) {
        if (!isWindowBlurred) {
          setIsWindowBlurred(true);
          try {
            if (plyrInstanceRef.current) plyrInstanceRef.current.pause();
          } catch (e) {}
          reportIncident(
            "SCREENSHOT_ATTEMPT",
            isMobileDevice
              ? "মোবাইল অ্যাপ পরিবর্তন বা ব্যাকগ্রাউন্ড স্ক্রিন ক্যাপচার সনাক্ত হয়েছে।"
              : "উইন্ডো ফোকাস পরিবর্তন / স্ক্রিন ক্যাপচার টুল সনাক্ত হয়েছে।"
          );
        }
      } else {
        if (isWindowBlurred) {
          setIsWindowBlurred(false);
        }
      }
    };

    const interval = setInterval(handleFocusCheck, isMobileDevice ? 600 : 250);
    document.addEventListener("visibilitychange", handleFocusCheck);
    window.addEventListener("pagehide", handleFocusCheck);
    window.addEventListener("blur", handleFocusCheck);
    window.addEventListener("focus", handleFocusCheck);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleFocusCheck);
      window.removeEventListener("pagehide", handleFocusCheck);
      window.removeEventListener("blur", handleFocusCheck);
      window.removeEventListener("focus", handleFocusCheck);
    };
  }, [isWindowBlurred, reportIncident]);

  // 3. Hardware Key Capture Lockdown (PrintScreen, Mac Screenshots, Win Shortcuts)
  useEffect(() => {
    const handleKeyIntercept = (e: KeyboardEvent) => {
      const isPrtScn = e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44;
      const isWinCapture = (e.key === "s" || e.key === "S") && (e.shiftKey && (e.metaKey || e.ctrlKey));
      const isMacCapture = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      const isDevTools = e.key === "F12" || ((e.ctrlKey || e.metaKey) && ["u", "U", "s", "S", "p", "P"].includes(e.key));
      const isInspectShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key);

      if (isPrtScn || isWinCapture || isMacCapture) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlackout(`কী-বোর্ড স্ক্রিনশট শর্টকাট সনাক্ত (${e.key})`);
        return false;
      }

      if (isDevTools || isInspectShortcut) {
        e.preventDefault();
        e.stopPropagation();
        triggerCaptureBlackout("ডেভেলপার ইন্সপেক্ট শর্টকাট সনাক্ত");
        return false;
      }
    };

    window.addEventListener("keydown", handleKeyIntercept, true);
    window.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        triggerCaptureBlackout("PrintScreen রিলিজ সনাক্ত হয়েছে।");
      }
    }, true);

    return () => {
      window.removeEventListener("keydown", handleKeyIntercept, true);
    };
  }, [triggerCaptureBlackout]);

  // 4. Subtle, High-Definition Moving Forensic Watermark (Protects without covering software menus)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle1 = 0.5;
    let angle2 = 2.1;
    let angle3 = 4.3;
    const speed = 0.4;

    let p1 = { x: 50, y: 50 };
    let p2 = { x: 150, y: 80 };
    let p3 = { x: 100, y: 150 };

    const cleanEmail = (email || "STUDENT").toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];

    const render = () => {
      if (!canvas || !ctx) return;

      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      const displayWidth = canvas.offsetWidth;
      const displayHeight = canvas.offsetHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        p1 = { x: displayWidth * 0.2, y: displayHeight * 0.3 };
        p2 = { x: displayWidth * 0.7, y: displayHeight * 0.4 };
        p3 = { x: displayWidth * 0.5, y: displayHeight * 0.75 };
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const updatePoint = (p: { x: number; y: number }, angle: number, minX: number, maxX: number, minY: number, maxY: number) => {
        p.x += Math.cos(angle) * speed;
        p.y += Math.sin(angle) * speed;
        if (p.x < minX || p.x > maxX) angle = Math.PI - angle;
        if (p.y < minY || p.y > maxY) angle = -angle;
        return angle;
      };

      angle1 = updatePoint(p1, angle1, 40, Math.max(displayWidth - 180, 50), 30, Math.max(displayHeight * 0.35, 40));
      angle2 = updatePoint(p2, angle2, 60, Math.max(displayWidth - 180, 80), Math.max(displayHeight * 0.35, 40), Math.max(displayHeight * 0.65, 80));
      angle3 = updatePoint(p3, angle3, 40, Math.max(displayWidth - 180, 60), Math.max(displayHeight * 0.65, 80), Math.max(displayHeight - 40, 100));

      const drawBadge = (x: number, y: number, text: string, alpha: number) => {
        ctx.save();
        ctx.font = "bold 11px monospace";
        const width = ctx.measureText(text).width + 16;
        const height = 20;

        ctx.fillStyle = `rgba(18, 22, 10, ${alpha * 0.65})`;
        ctx.strokeStyle = `rgba(200, 144, 10, ${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillText(text, x + 8, y + 14);
        ctx.restore();
      };

      drawBadge(p1.x, p1.y, `EVORISE ID: ${cleanEmail}`, 0.22);
      drawBadge(p2.x, p2.y, `AUTH: ${dateStr} • SECURE STREAM`, 0.18);
      drawBadge(p3.x, p3.y, `FORENSIC WATERMARK • ${cleanEmail}`, 0.20);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [email]);

  // 5. Single-Device Lock & Ban Status Verification (15s Heartbeat)
  useEffect(() => {
    let isMountedLocal = true;

    const checkSessionSecurity = async () => {
      try {
        const res = await fetch("/api/security/heartbeat");
        if (res.status === 409) {
          const data = await res.json();
          if (isMountedLocal) {
            setIsDeviceConflict(true);
            setConflictMessage(data.error || "অন্য কোনো ডিভাইস থেকে আপনার একাউন্টে লগইন করা হয়েছে।");
            if (plyrInstanceRef.current) plyrInstanceRef.current.pause();
          }
          return;
        }

        const banRes = await fetch("/api/auth/verify-session");
        const banData = await banRes.json();
        if (banData.banned && isMountedLocal) {
          setIsBanned(true);
          setBanReason(banData.banReason || "সিকিউরিটি পলিসি লঙ্ঘনের জন্য একাউন্ট স্থগিত করা হয়েছে।");
          if (plyrInstanceRef.current) plyrInstanceRef.current.pause();
        }
      } catch (err) {}
    };

    checkSessionSecurity();
    const interval = setInterval(checkSessionSecurity, 15000);

    return () => {
      isMountedLocal = false;
      clearInterval(interval);
    };
  }, []);

  // 6. Fullscreen Synchronization
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleContainerFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, []);

  // 7. Enterprise Plyr Engine Initialization
  useEffect(() => {
    if (!isMounted) return;

    let isDisposed = false;

    import("plyr").then(({ default: Plyr }) => {
      if (isDisposed) return;

      const targetElement = isYouTube ? mediaRef.current : videoTagRef.current;
      if (!targetElement) return;

      const player = new Plyr(targetElement, {
        controls: [
          'play-large',
          'play',
          'rewind',
          'fast-forward',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
          'settings',
          'pip',
        ],
        settings: ['speed'],
        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
        seekTime: 10,
        tooltips: { controls: true, seek: true },
        keyboard: { focused: true, global: false },
        clickToPlay: true,
        fullscreen: {
          enabled: false, // We control full security container fullscreen ourselves!
        },
        youtube: {
          noCookie: true,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          customControls: true,
        },
      });

      player.on('playing', () => {
        setIsPlaying(true);
        if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowOverlays(false);
          setShowQualityDropdown(false);
        }, 2200);
      });

      player.on('pause', () => {
        setIsPlaying(false);
        setShowOverlays(true);
      });

      if (onEnded) {
        player.on('ended', () => {
          setIsPlaying(false);
          setShowOverlays(true);
          onEnded();
        });
      }

      plyrInstanceRef.current = player;
    }).catch((err) => {
      console.error("Failed to load Plyr engine:", err);
    });

    return () => {
      isDisposed = true;
      try {
        if (plyrInstanceRef.current) {
          plyrInstanceRef.current.destroy();
          plyrInstanceRef.current = null;
        }
      } catch (e) {}
    };
  }, [isMounted, isYouTube, youtubeId, directVideoSrc, onEnded]);

  // Quality Changer
  const handleQualitySelect = (quality: string, label: string) => {
    setSelectedQuality(quality);
    setShowQualityDropdown(false);
    try {
      if (plyrInstanceRef.current?.embed?.setPlaybackQuality) {
        plyrInstanceRef.current.embed.setPlaybackQuality(quality);
        plyrInstanceRef.current.embed.setPlaybackQualityRange(quality, quality);
      }
    } catch (e) {}
    triggerHud(`🎥 কোয়ালিটি: ${label}`);
  };

  const qualityOptions = [
    { id: "hd1080", label: "1080p HD" },
    { id: "hd720", label: "720p HD" },
    { id: "large", label: "480p" },
    { id: "medium", label: "360p" },
    { id: "small", label: "240p" },
    { id: "default", label: "অটো (Auto)" },
  ];

  return (
    <div
      ref={containerRef}
      id="secure-player-container"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onContextMenu={(e) => { e.preventDefault(); return false; }}
      className={`w-full relative aspect-video bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-[#2A3319] select-none group ${
        isFullscreen ? "fixed inset-0 z-[999999] w-screen h-screen max-w-none max-h-none rounded-none border-none aspect-auto flex items-center justify-center" : "rounded-xl sm:rounded-2xl"
      }`}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "manipulation",
      }}
    >
      {/* ── 100% UN-CROPPED NATURAL VIDEO FRAME (ALL DAW & LESSON DETAILS 100% VISIBLE) ── */}
      {/* 0% crop - Every menu, toolbar, plugin, and meter is crystal clear and fully visible */}
      <div className="w-full h-full evorise-plyr-wrapper relative flex items-center justify-center">
        {isYouTube ? (
          <div
            ref={mediaRef}
            data-plyr-provider="youtube"
            data-plyr-embed-id={youtubeId || "3Y99GpafFu0"}
            className="w-full h-full pointer-events-none"
          />
        ) : (
          <video
            ref={videoTagRef}
            playsInline
            controls
            poster={poster}
            className="w-full h-full object-contain"
          >
            <source src={directVideoSrc} type="video/mp4" />
          </video>
        )}
      </div>

      {/* ── TRANSPARENT CLICK SHIELD (CAPTURES 100% OF CLICKS - ZERO REDIRECT TO YOUTUBE) ── */}
      {/* The student can click anywhere to play/pause, double click for fullscreen, but CANNOT click any YouTube link */}
      <div
        className="absolute inset-x-0 top-0 bottom-14 z-20 cursor-pointer"
        onClick={() => {
          handleUserActivity();
          try {
            if (plyrInstanceRef.current) plyrInstanceRef.current.togglePlay();
          } catch (e) {}
        }}
        onDoubleClick={toggleContainerFullscreen}
        onContextMenu={(e) => { e.preventDefault(); return false; }}
      />

      {/* ── AUTO-HIDING SMART HEADER (DISAPPEARS DURING PLAYBACK FOR 100% UNOBSTRUCTED VIEW) ── */}
      <div
        id="evorise-top-shield"
        className={`absolute top-0 left-0 right-0 h-12 sm:h-14 z-30 pointer-events-auto flex items-center justify-between px-3 sm:px-6 bg-gradient-to-b from-black/95 via-black/80 to-transparent transition-all duration-300 select-none ${
          showOverlays || !isPlaying ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8900A] shadow-[0_0_10px_#C8900A] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs font-black tracking-wider text-white">
              EvoRise Studio Player
            </span>
            <span className="text-[9px] font-mono text-white/60 hidden sm:inline">
              ENCRYPTED SECURE STREAM • NO DOWNLOAD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 relative">
          {/* Quality Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQualityDropdown(!showQualityDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#C8900A] hover:text-black text-white text-[10px] sm:text-xs font-mono font-bold transition-all border border-white/10 shadow-sm"
              title="ভিডিও রেজোলিউশন পরিবর্তন করুন"
            >
              <Sliders size={12} />
              <span>{qualityOptions.find(q => q.id === selectedQuality)?.label || "1080p HD"}</span>
            </button>

            {showQualityDropdown && (
              <div className="absolute top-9 right-0 bg-[#12160A]/98 backdrop-blur-2xl border border-[#2A3319] rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 min-w-36 z-50 animate-in fade-in zoom-in-95">
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest px-2.5 py-1 border-b border-white/5 mb-1">
                  রেজোলিউশন
                </span>
                {qualityOptions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleQualitySelect(q.id, q.label)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      selectedQuality === q.id ? "bg-[#C8900A] text-black font-bold" : "hover:bg-white/10 text-white/80"
                    }`}
                  >
                    <span>{q.label}</span>
                    {selectedQuality === q.id && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="hidden sm:flex items-center gap-1 text-[9px] font-mono font-black text-[#C8900A] bg-[#C8900A]/15 border border-[#C8900A]/30 px-2.5 py-1 rounded-lg shadow-sm">
            <ShieldCheck size={11} /> PROTECTED
          </span>

          {/* Fullscreen Button */}
          <button
            onClick={toggleContainerFullscreen}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-[#C8900A] hover:text-black text-white transition-all shadow-sm"
            title={isFullscreen ? "ফুলস্ক্রিন থেকে বের হন" : "ফুলস্ক্রিন করুন"}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        </div>
      </div>

      {/* ── HUD NOTIFICATION POPUP ─────────────────────────────── */}
      {hudMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#12160A]/95 backdrop-blur-xl border border-[#2A3319] text-white text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <span>{hudMessage}</span>
        </div>
      )}

      {/* ── MULTI-POINT FORENSIC WATERMARK CANVAS ──────────────── */}
      <canvas
        ref={canvasRef}
        id="secure-ghost-watermark"
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-35"
      />

      {/* ── WINDOW BLUR / SCREEN CAPTURE PROTECTION OVERLAY ───── */}
      {isWindowBlurred && !isCaptureBlackout && !isBanned && !isDeviceConflict && (
        <div
          className="absolute inset-0 z-40 bg-[#0B0E06]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none"
          onClick={(e) => { e.stopPropagation(); setIsWindowBlurred(false); }}
        >
          <div className="w-14 h-14 rounded-full bg-[#C8900A]/20 border border-[#C8900A]/40 flex items-center justify-center mb-3 text-[#C8900A] shadow-[0_0_30px_rgba(200,144,10,0.3)]">
            <EyeOff size={28} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white mb-1">
            ভিডিও সুরক্ষিত রয়েছে
          </h3>
          <p className="text-white/60 text-xs sm:text-sm max-w-sm mb-4 leading-relaxed">
            উইন্ডো ফোকাস পরিবর্তন বা অ্যাপ স্যুইচ করায় ভিডিওটি পজ করা হয়েছে। প্লে করতে স্ক্রিনে ট্যাপ করুন।
          </p>
          <button
            onClick={() => setIsWindowBlurred(false)}
            className="px-4 py-2 rounded-xl bg-[#C8900A] text-black text-xs sm:text-sm font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} /> পুনরায় দেখুন
          </button>
        </div>
      )}

      {/* ── AGGRESSIVE SCREENSHOT BLACKOUT OVERLAY ──────────────── */}
      {isCaptureBlackout && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none animate-in fade-in duration-75">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
            <ShieldAlert size={30} />
          </div>
          <h3 className="text-base font-black text-red-500 mb-1 tracking-wide">
            স্ক্রিন ক্যাপচার নিষিদ্ধ
          </h3>
          <p className="text-white/70 text-xs max-w-xs leading-relaxed">
            এই কোর্সটি কপিরাইট সুরক্ষিত। যেকোনো ধরনের স্ক্রিনশট বা স্ক্রিন রেকর্ড নেওয়ার চেষ্টা সিস্টেমে রেকর্ড করা হচ্ছে।
          </p>
        </div>
      )}

      {/* ── SINGLE DEVICE CONFLICT LOCKOUT OVERLAY ───────────────── */}
      {isDeviceConflict && (
        <div className="absolute inset-0 z-50 bg-[#0B0E06]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.3)]">
            <Smartphone size={32} />
          </div>
          <h3 className="text-lg font-black text-white mb-2">
            একই সাথে একাধিক ডিভাইসে লগইন সনাক্ত!
          </h3>
          <p className="text-white/70 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            {conflictMessage}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C8900A] to-[#E5A817] text-black text-xs sm:text-sm font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut size={16} /> লগআউট করুন
          </button>
        </div>
      )}

      {/* ── BANNED USER LOCKOUT OVERLAY ─────────────────────────── */}
      {isBanned && (
        <div className="absolute inset-0 z-50 bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center mb-4 text-red-500 shadow-[0_0_35px_rgba(239,68,68,0.3)]">
            <Lock size={32} />
          </div>
          <h3 className="text-lg font-black text-red-500 mb-2">
            একাউন্ট সাময়িকভাবে স্থগিত
          </h3>
          <p className="text-white/70 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            {banReason}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold shadow-lg hover:bg-red-700 active:scale-95 transition-all flex items-center gap-2"
          >
            <LogOut size={16} /> বের হয়ে যান
          </button>
        </div>
      )}

      {/* ── EVORISE LUXURY GOLD PLYR THEME INJECTION ─────────── */}
      <style jsx global>{`
        .evorise-plyr-wrapper {
          --plyr-color-main: #C8900A;
          --plyr-video-background: #000000;
          --plyr-menu-background: #12160A;
          --plyr-menu-color: #FFFFFF;
          --plyr-menu-border-color: #2A3319;
          --plyr-menu-radius: 12px;
          --plyr-control-radius: 8px;
          --plyr-control-spacing: 10px;
          --plyr-video-controls-background: linear-gradient(rgba(0, 0, 0, 0), rgba(10, 10, 10, 0.95));
          --plyr-badge-background: #C8900A;
          --plyr-badge-text-color: #000000;
          --plyr-tooltip-background: #12160A;
          --plyr-tooltip-color: #FFFFFF;
          --plyr-tooltip-radius: 6px;
          --plyr-range-thumb-height: 14px;
          --plyr-range-thumb-background: #C8900A;
          --plyr-range-thumb-shadow: 0 0 10px rgba(200, 144, 10, 0.8);
          --plyr-video-control-color-hover: #FFFFFF;
        }

        .evorise-plyr-wrapper .plyr--video {
          height: 100%;
          border-radius: inherit;
        }

        .evorise-plyr-wrapper .plyr__video-wrapper {
          height: 100%;
          background: #000;
        }

        .evorise-plyr-wrapper iframe {
          pointer-events: none !important;
        }

        .evorise-plyr-wrapper .plyr__controls {
          font-family: monospace;
          padding: 12px 16px;
          z-index: 25;
        }

        .evorise-plyr-wrapper .plyr__time {
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 0.5px;
        }

        .evorise-plyr-wrapper .plyr__time--current {
          color: #C8900A;
          font-weight: bold;
        }

        .evorise-plyr-wrapper .plyr__menu__container {
          background: rgba(18, 22, 10, 0.98) !important;
          border: 1px solid #2A3319 !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 12px !important;
        }

        #secure-player-container:fullscreen,
        #secure-player-container:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          border-radius: 0 !important;
          border: none !important;
          background: #000 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }

        #secure-player-container:fullscreen #secure-ghost-watermark,
        #secure-player-container:-webkit-full-screen #secure-ghost-watermark {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 9998 !important;
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}
