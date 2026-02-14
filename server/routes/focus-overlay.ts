import { Router, Request } from "express";
import { v4 as uuidv4 } from "uuid";
import { collections } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const MAX_STATE_JSON_SIZE = 200_000;
const MAX_CHUNKS_PER_FLUSH = 200;
const MAX_CHUNK_DURATION_MS = 12 * 60 * 60 * 1000;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function safeSectionKey(sectionId: string): string {
  return sectionId.replace(/[.$]/g, "_").slice(0, 80) || "unknown";
}

function clampNumber(value: unknown, min: number, max: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

router.get("/state", requireAuth, async (req: Request, res) => {
  try {
    const userId = req.session.userId!;
    const stateDoc = await collections.focusOverlayState().findOne(
      { user_id: userId },
      {
        projection: {
          _id: 0,
          user_id: 0,
        },
      },
    );

    const today = new Date();
    const todayKey = toDateKey(today);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const weeklyRows = await collections.dailyAggregates()
      .find({ user_id: userId, date: { $gte: toDateKey(sevenDaysAgo) } })
      .project({ _id: 0, date: 1, total_active_ms: 1 })
      .toArray();

    const todayRow = weeklyRows.find((row: any) => row.date === todayKey);
    const weekTotalMs = weeklyRows.reduce(
      (sum: number, row: any) => sum + Number(row.total_active_ms || 0),
      0,
    );

    const lifetimeAgg = await collections.dailyAggregates()
      .aggregate([
        { $match: { user_id: userId } },
        { $group: { _id: null, total: { $sum: "$total_active_ms" } } },
      ])
      .toArray();
    const lifetimeActiveMs = Number(lifetimeAgg[0]?.total || 0);

    const topSectionAgg = await collections.sectionActivity()
      .aggregate([
        {
          $match: {
            user_id: userId,
            section_id: { $nin: ["landing", "home"] },
          },
        },
        {
          $group: {
            _id: "$section_name",
            duration: { $sum: "$duration_ms" },
          },
        },
        { $sort: { duration: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    const streakRows = await collections.dailyAggregates()
      .find({ user_id: userId, total_active_ms: { $gt: 0 } })
      .project({ _id: 0, date: 1 })
      .sort({ date: -1 })
      .limit(400)
      .toArray();

    let streakDays = 0;
    for (let i = 0; i < streakRows.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedKey = toDateKey(expected);
      if (streakRows[i]?.date === expectedKey) {
        streakDays += 1;
      } else if (i === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (streakRows[i]?.date === toDateKey(yesterday)) {
          streakDays = 1;
        }
        break;
      } else {
        break;
      }
    }

    res.json({
      state: stateDoc || null,
      stats: {
        todayActiveMs: Number(todayRow?.total_active_ms || 0),
        weekAvgMs: Math.round(weekTotalMs / 7),
        lifetimeActiveMs,
        topSectionName: topSectionAgg[0]?._id || "N/A",
        streakDays,
      },
    });
  } catch (error) {
    console.error("Focus overlay state fetch error:", error);
    res.status(500).json({ message: "Failed to fetch focus overlay state" });
  }
});

router.put("/state", requireAuth, async (req: Request, res) => {
  try {
    const userId = req.session.userId!;
    const state = req.body?.state;
    if (!isObject(state)) {
      return res.status(400).json({ message: "Invalid state payload" });
    }

    const jsonSize = Buffer.byteLength(JSON.stringify(state), "utf8");
    if (jsonSize > MAX_STATE_JSON_SIZE) {
      return res.status(413).json({ message: "State payload too large" });
    }

    const safeState = {
      sessionId: String(state.sessionId || ""),
      isRunning: Boolean(state.isRunning),
      totalActiveMs: clampNumber(state.totalActiveMs, 0, 365 * 24 * 60 * 60 * 1000),
      longestContinuousMs: clampNumber(state.longestContinuousMs, 0, MAX_CHUNK_DURATION_MS),
      currentSectionId: String(state.currentSectionId || "unknown").slice(0, 120),
      currentSectionName: String(state.currentSectionName || "Unknown").slice(0, 120),
      timerStartedAtMs: clampNumber(state.timerStartedAtMs, 0, Date.now() + 24 * 60 * 60 * 1000),
      position: isObject(state.position)
        ? {
            x: clampNumber((state.position as any).x, 0, 10000),
            y: clampNumber((state.position as any).y, 0, 10000),
          }
        : { x: 16, y: 16 },
      sectionDurationsMs: isObject(state.sectionDurationsMs) ? state.sectionDurationsMs : {},
      updatedAt: Date.now(),
    };

    await collections.focusOverlayState().updateOne(
      { user_id: userId },
      {
        $set: {
          user_id: userId,
          ...safeState,
          updated_at: new Date(),
        },
      },
      { upsert: true },
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Focus overlay state save error:", error);
    res.status(500).json({ message: "Failed to save focus overlay state" });
  }
});

router.post("/flush", requireAuth, async (req: Request, res) => {
  try {
    const userId = req.session.userId!;
    const sessionId = String(req.body?.sessionId || "").slice(0, 120);
    const chunks = Array.isArray(req.body?.chunks) ? req.body.chunks.slice(0, MAX_CHUNKS_PER_FLUSH) : [];
    const longestContinuousMs = clampNumber(req.body?.longestContinuousMs, 0, MAX_CHUNK_DURATION_MS);
    const totalActiveMs = clampNumber(req.body?.totalActiveMs, 0, 365 * 24 * 60 * 60 * 1000);
    const isRunning = Boolean(req.body?.isRunning);

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const insertedByDate = new Map<
      string,
      { totalMs: number; sectionMs: Record<string, number>; maxChunkMs: number }
    >();
    let insertedChunks = 0;
    let insertedDurationMs = 0;
    let minStart: Date | null = null;
    let maxEnd: Date | null = null;

    for (const rawChunk of chunks) {
      if (!isObject(rawChunk)) continue;
      const sectionId = String(rawChunk.sectionId || "unknown").slice(0, 120);
      const sectionName = String(rawChunk.sectionName || "Unknown").slice(0, 120);
      const startTime = new Date(String(rawChunk.startTime || ""));
      const endTime = new Date(String(rawChunk.endTime || ""));
      const durationMs = clampNumber(rawChunk.durationMs, 0, MAX_CHUNK_DURATION_MS);

      if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) continue;
      if (durationMs <= 0) continue;
      if (endTime.getTime() < startTime.getTime()) continue;

      const chunkKey = `${userId}:${sessionId}:${sectionId}:${startTime.getTime()}:${endTime.getTime()}`;
      const dateKey = toDateKey(startTime);

      const upsert = await collections.sectionActivity().updateOne(
        { chunk_key: chunkKey },
        {
          $setOnInsert: {
            id: uuidv4(),
            chunk_key: chunkKey,
            user_id: userId,
            session_id: sessionId,
            section_id: sectionId,
            section_name: sectionName,
            start_time: startTime,
            end_time: endTime,
            duration_ms: durationMs,
            date: dateKey,
            created_at: new Date(),
          },
        },
        { upsert: true },
      );

      if (upsert.upsertedCount !== 1) continue;

      insertedChunks += 1;
      insertedDurationMs += durationMs;
      minStart = !minStart || startTime < minStart ? startTime : minStart;
      maxEnd = !maxEnd || endTime > maxEnd ? endTime : maxEnd;

      const daily = insertedByDate.get(dateKey) || { totalMs: 0, sectionMs: {}, maxChunkMs: 0 };
      daily.totalMs += durationMs;
      daily.maxChunkMs = Math.max(daily.maxChunkMs, durationMs);
      daily.sectionMs[sectionId] = (daily.sectionMs[sectionId] || 0) + durationMs;
      insertedByDate.set(dateKey, daily);
    }

    for (const [dateKey, daily] of insertedByDate.entries()) {
      const inc: Record<string, number> = { total_active_ms: daily.totalMs };
      for (const [sectionId, duration] of Object.entries(daily.sectionMs)) {
        inc[`section_totals.${safeSectionKey(sectionId)}`] = duration;
      }

      await collections.dailyAggregates().updateOne(
        { user_id: userId, date: dateKey },
        {
          $setOnInsert: {
            id: uuidv4(),
            user_id: userId,
            date: dateKey,
            created_at: new Date(),
          },
          $set: { updated_at: new Date() },
          $inc: inc,
          $max: { longest_continuous_ms: Math.max(daily.maxChunkMs, longestContinuousMs) },
        },
        { upsert: true },
      );
    }

    await collections.focusOverlaySessions().updateOne(
      { user_id: userId, session_id: sessionId },
      {
        $setOnInsert: {
          id: uuidv4(),
          user_id: userId,
          session_id: sessionId,
          started_at: minStart || new Date(),
          created_at: new Date(),
        },
        $set: {
          is_running: isRunning,
          updated_at: new Date(),
          ended_at: maxEnd || null,
          reported_active_ms: totalActiveMs,
        },
        $inc: { active_duration_ms: insertedDurationMs },
        $max: {
          longest_continuous_ms: longestContinuousMs,
          last_chunk_end_ms: maxEnd ? maxEnd.getTime() : 0,
        },
        $min: {
          first_chunk_start_ms: minStart ? minStart.getTime() : Date.now(),
        },
      },
      { upsert: true },
    );

    res.json({
      success: true,
      insertedChunks,
      insertedDurationMs,
    });
  } catch (error) {
    console.error("Focus overlay flush error:", error);
    res.status(500).json({ message: "Failed to flush focus overlay activity" });
  }
});

export const focusOverlayRoutes = router;
