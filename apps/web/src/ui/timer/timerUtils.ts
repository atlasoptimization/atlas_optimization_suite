import type { TimerState, TimerStatus } from "../../core/types/session";

export type TimerDisplay = {
  elapsedMs: number;
  remainingMs: number;
  status: TimerStatus;
  isFinished: boolean;
};

export const DEFAULT_TIMER_DURATION_MS = 120000;

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

export function computeTimerDisplay(timer: TimerState, nowMs = Date.now()): TimerDisplay {
  const elapsedMs = computeElapsedMs(timer, nowMs);
  const durationMs = timer.durationMs ?? DEFAULT_TIMER_DURATION_MS;
  const remainingMs =
    timer.mode === "countdown" ? Math.max(0, durationMs - elapsedMs) : 0;
  const isFinished =
    timer.mode === "countdown" &&
    timer.status === "running" &&
    elapsedMs >= durationMs;

  return {
    elapsedMs,
    remainingMs,
    status: isFinished ? "finished" : timer.status,
    isFinished
  };
}

export function computeElapsedMs(timer: TimerState, nowMs = Date.now()): number {
  const accumulatedMs = Math.max(0, timer.accumulatedMs);
  if (timer.status !== "running" || !timer.startedAt) return accumulatedMs;

  const startedAtMs = Date.parse(timer.startedAt);
  if (!Number.isFinite(startedAtMs)) return accumulatedMs;

  return Math.max(0, accumulatedMs + nowMs - startedAtMs);
}

export function durationParts(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  };
}

export function durationFromParts(minutes: number, seconds: number) {
  return Math.max(0, (Math.max(0, minutes) * 60 + Math.max(0, seconds)) * 1000);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
