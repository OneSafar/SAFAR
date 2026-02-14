import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { BarChart3, Pause, Play, RefreshCw, Minimize2, Maximize2, MoreVertical } from "lucide-react";
import { authService } from "@/utils/authService";
import {
  FocusOverlayChunk,
  FocusOverlayState,
  FocusOverlayStats,
  focusOverlayService,
} from "@/utils/focusOverlayService";

const OVERLAY_SIZE = 240;
const OVERLAY_MIN_SIZE = 210;
const OVERLAY_MAX_SIZE = 280;
const OVERLAY_EDGE_GAP = 12;
const SYNC_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1000;

function sectionForPath(pathname: string): { id: string; name: string } {
  // ... (unchanged)
  if (pathname.startsWith("/dashboard")) return { id: "dashboard", name: "Dashboard" };
  if (pathname.startsWith("/study")) return { id: "study", name: "Study With Me" };
  if (pathname.startsWith("/achievements")) return { id: "achievements", name: "Achievements" };
  if (pathname.startsWith("/profile")) return { id: "profile", name: "Profile" };
  if (pathname.startsWith("/mehfil")) return { id: "mehfil", name: "Mehfil" };
  if (pathname.startsWith("/meditation")) return { id: "meditation", name: "Meditation" };
  if (pathname.startsWith("/nishtha/check-in")) return { id: "nishtha_checkin", name: "Check In" };
  if (pathname.startsWith("/nishtha/journal")) return { id: "nishtha_journal", name: "Journal" };
  if (pathname.startsWith("/nishtha/goals")) return { id: "nishtha_goals", name: "Goals" };
  if (pathname.startsWith("/nishtha/streaks")) return { id: "nishtha_streaks", name: "Streaks" };
  if (pathname.startsWith("/nishtha/suggestions")) return { id: "nishtha_suggestions", name: "Suggestions" };
  if (pathname.startsWith("/landing")) return { id: "landing", name: "Landing" };
  if (pathname.startsWith("/login")) return { id: "login", name: "Login" };
  if (pathname.startsWith("/signup")) return { id: "signup", name: "Signup" };
  if (pathname.startsWith("/forgot-password")) return { id: "forgot_password", name: "Forgot Password" };
  if (pathname.startsWith("/reset-password")) return { id: "reset_password", name: "Reset Password" };
  if (pathname === "/") return { id: "home", name: "Home" };
  return {
    id: pathname.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/\//g, "_").slice(0, 80) || "unknown",
    name: pathname || "Unknown",
  };
}

function formatHms(totalMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function createSessionId(): string {
  return `pfo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultState(pathname: string): FocusOverlayState {
  const section = sectionForPath(pathname);
  return {
    sessionId: createSessionId(),
    isRunning: false,
    totalActiveMs: 0,
    longestContinuousMs: 0,
    currentSectionId: section.id,
    currentSectionName: section.name,
    timerStartedAtMs: 0,
    sectionDurationsMs: {},
    position: { x: 16, y: 16 },
    isCollapsed: false,
    updatedAt: Date.now(),
  };
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const maxX = Math.max(OVERLAY_EDGE_GAP, width - OVERLAY_SIZE - OVERLAY_EDGE_GAP);
  const maxY = Math.max(OVERLAY_EDGE_GAP, height - OVERLAY_SIZE - OVERLAY_EDGE_GAP);
  return {
    x: Math.min(maxX, Math.max(OVERLAY_EDGE_GAP, x)),
    y: Math.min(maxY, Math.max(OVERLAY_EDGE_GAP, y)),
  };
}

export default function PersistentFocusOverlay() {
  const location = useLocation();
  const [authResolved, setAuthResolved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<FocusOverlayState>(() => defaultState(window.location.pathname));
  const [stats, setStats] = useState<FocusOverlayStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tickNow, setTickNow] = useState(Date.now());
  const [dragging, setDragging] = useState(false);
  const [windowFocused, setWindowFocused] = useState(
    document.visibilityState === "visible" && document.hasFocus(),
  );

  const stateRef = useRef(state);
  // ... (refs unchanged)
  const pendingChunksRef = useRef<FocusOverlayChunk[]>([]);
  const sectionStartMsRef = useRef<number | null>(null);
  const continuousStartMsRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const localStorageKey = useMemo(
    () => (userId ? `pfo_state_${userId}` : null),
    [userId],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ... (isForeground, flushCurrentSection, syncNow, liveTotalMs, handleAuthChanged, onAuthChanged unchanged)
  const isForeground = useCallback(() => {
    return document.visibilityState === "visible" && windowFocused;
  }, [windowFocused]);

  const flushCurrentSection = useCallback(
    (options?: { breakContinuous?: boolean }) => {
      // ... (unchanged implementation)
      const breakContinuous = Boolean(options?.breakContinuous);
      const startMs = sectionStartMsRef.current;
      if (!stateRef.current.isRunning || startMs === null) {
        if (breakContinuous) {
          sectionStartMsRef.current = null;
          continuousStartMsRef.current = null;
        }
        return;
      }

      const now = Date.now();
      const durationMs = Math.max(0, now - startMs);
      if (durationMs <= 0) {
        if (breakContinuous) {
          sectionStartMsRef.current = null;
          continuousStartMsRef.current = null;
        } else {
          sectionStartMsRef.current = now;
        }
        return;
      }

      const prev = stateRef.current;
      pendingChunksRef.current.push({
        sectionId: prev.currentSectionId,
        sectionName: prev.currentSectionName,
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(now).toISOString(),
        durationMs,
      });

      const continuousDurationMs =
        continuousStartMsRef.current !== null ? now - continuousStartMsRef.current : 0;
      setState((current) => ({
        ...current,
        totalActiveMs: current.totalActiveMs + durationMs,
        longestContinuousMs: breakContinuous
          ? Math.max(current.longestContinuousMs, continuousDurationMs)
          : current.longestContinuousMs,
        sectionDurationsMs: {
          ...current.sectionDurationsMs,
          [current.currentSectionId]: (current.sectionDurationsMs[current.currentSectionId] || 0) + durationMs,
        },
        timerStartedAtMs: breakContinuous ? 0 : current.timerStartedAtMs,
        updatedAt: now,
      }));

      if (breakContinuous) {
        sectionStartMsRef.current = null;
        continuousStartMsRef.current = null;
      } else {
        sectionStartMsRef.current = now;
      }
    },
    [],
  );

  const syncNow = useCallback(async () => {
    if (!userId || syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    const snapshot = stateRef.current;
    const chunks = pendingChunksRef.current.splice(0, pendingChunksRef.current.length);
    const now = Date.now();
    const liveDeltaMs =
      snapshot.isRunning && sectionStartMsRef.current !== null && isForeground()
        ? Math.max(0, now - sectionStartMsRef.current)
        : 0;
    const liveContinuousMs =
      snapshot.isRunning && continuousStartMsRef.current !== null && isForeground()
        ? Math.max(0, now - continuousStartMsRef.current)
        : 0;

    const syncState: FocusOverlayState = {
      ...snapshot,
      totalActiveMs: snapshot.totalActiveMs + liveDeltaMs,
      longestContinuousMs: Math.max(snapshot.longestContinuousMs, liveContinuousMs),
      updatedAt: now,
    };

    try {
      if (chunks.length > 0) {
        await focusOverlayService.flush({
          sessionId: syncState.sessionId,
          chunks,
          longestContinuousMs: syncState.longestContinuousMs,
          totalActiveMs: syncState.totalActiveMs,
          isRunning: syncState.isRunning,
        });
      }
      await focusOverlayService.saveState(syncState);
    } catch (error) {
      pendingChunksRef.current = [...chunks, ...pendingChunksRef.current];
      console.error("Focus overlay sync failed:", error);
    } finally {
      syncInFlightRef.current = false;
    }
  }, [isForeground, userId]);

  const liveTotalMs = useMemo(() => {
    const liveDelta =
      state.isRunning && sectionStartMsRef.current !== null && isForeground()
        ? Math.max(0, tickNow - sectionStartMsRef.current)
        : 0;
    return state.totalActiveMs + liveDelta;
  }, [isForeground, state.isRunning, state.totalActiveMs, tickNow]);

  const handleAuthChanged = useCallback(async () => {
    try {
      const result = await authService.getCurrentUser();
      if (result?.user?.id) {
        setUserId(result.user.id);
      } else {
        setUserId(null);
      }
    } catch {
      setUserId(null);
    } finally {
      setAuthResolved(true);
    }
  }, []);

  useEffect(() => {
    handleAuthChanged();
    const onAuthChanged = () => {
      handleAuthChanged();
    };
    window.addEventListener("auth:changed", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("auth:changed", onAuthChanged as EventListener);
    };
  }, [handleAuthChanged]);

  useEffect(() => {
    if (!userId) {
      sectionStartMsRef.current = null;
      continuousStartMsRef.current = null;
      pendingChunksRef.current = [];
      setExpanded(false);
      return;
    }

    let cancelled = false;
    const section = sectionForPath(location.pathname);

    const restore = async () => {
      try {
        let localState: FocusOverlayState | null = null;
        if (localStorageKey) {
          const raw = localStorage.getItem(localStorageKey);
          if (raw) {
            try {
              localState = JSON.parse(raw) as FocusOverlayState;
            } catch {
              localState = null;
            }
          }
        }

        const remote = await focusOverlayService.getState();
        if (cancelled) return;
        setStats(remote.stats);

        const remoteState = remote.state;
        const chosen =
          remoteState && (!localState || Number(remoteState.updatedAt || 0) >= Number(localState.updatedAt || 0))
            ? remoteState
            : localState;

        const restored = chosen
          ? {
            ...defaultState(location.pathname),
            ...chosen,
            currentSectionId: section.id,
            currentSectionName: section.name,
            updatedAt: Date.now(),
          }
          : defaultState(location.pathname);

        const clampedPos = clampPosition(restored.position?.x || 16, restored.position?.y || 16);
        setState({ ...restored, position: clampedPos });

        if (restored.isRunning && isForeground()) {
          const now = Date.now();
          sectionStartMsRef.current = now;
          continuousStartMsRef.current = now;
          setState((prev) => ({ ...prev, timerStartedAtMs: now }));
        } else {
          sectionStartMsRef.current = null;
          continuousStartMsRef.current = null;
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Focus overlay restore failed:", error);
          const fallback = defaultState(location.pathname);
          setState(fallback);
        }
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [localStorageKey, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTickNow(Date.now());
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (!localStorageKey) return;
    localStorage.setItem(localStorageKey, JSON.stringify(state));
  }, [localStorageKey, state, userId]);

  useEffect(() => {
    if (!userId) return;
    const interval = window.setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [syncNow, userId]);

  useEffect(() => {
    if (!userId) return;
    const onPageHide = () => {
      flushCurrentSection({ breakContinuous: true });
      syncNow();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [flushCurrentSection, syncNow, userId]);

  useEffect(() => {
    const onVisibility = () => {
      const focused = document.visibilityState === "visible" && document.hasFocus();
      setWindowFocused(focused);
    };
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (!userId || !stateRef.current.isRunning) return;
    if (isForeground()) {
      const now = Date.now();
      sectionStartMsRef.current = now;
      continuousStartMsRef.current = now;
      setState((prev) => ({ ...prev, timerStartedAtMs: now, updatedAt: now }));
    } else {
      flushCurrentSection({ breakContinuous: true });
      setState((prev) => ({ ...prev, timerStartedAtMs: 0, updatedAt: Date.now() }));
      syncNow();
    }
  }, [flushCurrentSection, isForeground, syncNow, userId, windowFocused]);

  useEffect(() => {
    if (!userId) return;
    const section = sectionForPath(location.pathname);

    if (stateRef.current.isRunning && isForeground() && sectionStartMsRef.current !== null) {
      flushCurrentSection({ breakContinuous: false });
    }

    setState((prev) => ({
      ...prev,
      currentSectionId: section.id,
      currentSectionName: section.name,
      timerStartedAtMs: prev.isRunning && isForeground() ? prev.timerStartedAtMs : 0,
      updatedAt: Date.now(),
    }));

    if (stateRef.current.isRunning && isForeground()) {
      sectionStartMsRef.current = Date.now();
    }
  }, [flushCurrentSection, isForeground, location.pathname, userId]);

  useEffect(() => {
    const onResize = () => {
      setState((prev) => ({
        ...prev,
        position: clampPosition(prev.position.x, prev.position.y),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleStart = () => {
    if (stateRef.current.isRunning) return;
    const now = Date.now();
    const section = sectionForPath(location.pathname);
    setState((prev) => ({
      ...prev,
      sessionId: prev.sessionId || createSessionId(),
      isRunning: true,
      currentSectionId: section.id,
      currentSectionName: section.name,
      timerStartedAtMs: isForeground() ? now : 0,
      updatedAt: now,
    }));

    if (isForeground()) {
      sectionStartMsRef.current = now;
      continuousStartMsRef.current = now;
    }
  };

  const handlePause = () => {
    if (!stateRef.current.isRunning) return;
    flushCurrentSection({ breakContinuous: true });
    setState((prev) => ({
      ...prev,
      isRunning: false,
      timerStartedAtMs: 0,
      updatedAt: Date.now(),
    }));
    syncNow();
  };

  const handleReset = () => {
    flushCurrentSection({ breakContinuous: true });
    const fresh = defaultState(location.pathname);
    setState(fresh);
    pendingChunksRef.current = [];
    syncNow();
  };

  const toggleCollapse = () => {
    setState(prev => ({ ...prev, isCollapsed: !prev.isCollapsed }));
    setExpanded(false); // Close detailed stats when collapsing
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("label")) {
      return;
    }
    const clamped = clampPosition(state.position.x, state.position.y);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - clamped.x,
      offsetY: event.clientY - clamped.y,
    };
    setDragging(true);
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const next = clampPosition(event.clientX - dragRef.current.offsetX, event.clientY - dragRef.current.offsetY);
    setState((prev) => ({
      ...prev,
      position: next,
      updatedAt: Date.now(),
    }));
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  if (!authResolved || !userId) {
    return null;
  }

  // Collapsed View
  if (state.isCollapsed) {
    return (
      <button
        onClick={toggleCollapse}
        style={{
          zIndex: 2147483647,
          top: `${state.position.y}px`,
          left: 0,
          transition: "top 180ms ease-out",
        }}
        className="fixed h-24 w-6 bg-slate-900 text-white rounded-r-xl shadow-xl flex flex-col items-center justify-center gap-2 cursor-pointer border-y border-r border-slate-700 hover:w-8 transition-all group"
        title="Expand focus timer"
      >
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" style={{ opacity: state.isRunning ? 1 : 0 }} />
        <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-white" />
        <Maximize2 className="w-3 h-3 text-slate-500 group-hover:text-white" />
      </button>
    );
  }

  // Expanded View
  return (
    <>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          zIndex: 2147483647,
          width: `${Math.min(OVERLAY_MAX_SIZE, Math.max(OVERLAY_MIN_SIZE, OVERLAY_SIZE))}px`,
          height: `${Math.min(OVERLAY_MAX_SIZE, Math.max(OVERLAY_MIN_SIZE, OVERLAY_SIZE))}px`,
          transform: `translate3d(${state.position.x}px, ${state.position.y}px, 0)`,
          transition: dragging ? "none" : "transform 180ms ease-out",
          cursor: dragging ? "grabbing" : "grab",
        }}
        className="fixed top-0 left-0 rounded-3xl border-2 border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xl select-none"
        aria-label="Persistent focus overlay"
      >
        <div className="h-full w-full grid grid-rows-[1.2fr_0.8fr_0.8fr_0.7fr] p-5 relative">

          {/* Minimize Button */}
          <button
            onClick={toggleCollapse}
            className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
            title="Minimize to side"
          >
            <Minimize2 className="w-3 h-3" />
          </button>

          <div className="rounded-2xl bg-slate-900 text-white flex items-center justify-center text-3xl font-bold tracking-tight mt-6 shadow-sm">
            {formatHms(liveTotalMs)}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              onClick={handleStart}
              disabled={state.isRunning}
              className="rounded-xl bg-emerald-500/90 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors shadow-sm"
              title="Start"
            >
              <Play className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={handlePause}
              disabled={!state.isRunning}
              className="rounded-xl bg-amber-500/90 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-500 transition-colors shadow-sm"
              title="Pause"
            >
              <Pause className="w-6 h-6 fill-current" />
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold truncate flex items-center justify-center border border-slate-200">
            {state.currentSectionName}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
              title="Stats"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={handleReset}
              className="rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-300 transition-colors"
              title="Reset session"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            zIndex: 2147483647,
            transform: `translate3d(${state.position.x + OVERLAY_SIZE + 10}px, ${state.position.y}px, 0)`,
          }}
          className="fixed top-0 left-0 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-3 text-xs"
        >
          {/* Stats content unchanged */}
          <div className="font-bold text-slate-900 mb-2">Focus Stats</div>
          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span>Today</span>
              <span className="font-semibold">{formatHms(stats?.todayActiveMs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Week Avg</span>
              <span className="font-semibold">{formatHms(stats?.weekAvgMs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lifetime</span>
              <span className="font-semibold">{formatHms(stats?.lifetimeActiveMs || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Streak</span>
              <span className="font-semibold">{stats?.streakDays || 0}d</span>
            </div>
            <div className="flex justify-between">
              <span>Top Section</span>
              <span className="font-semibold truncate max-w-[100px] text-right">
                {stats?.topSectionName || "N/A"}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-2">
              <span>Current Session</span>
              <span className="font-semibold">{formatHms(liveTotalMs)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
