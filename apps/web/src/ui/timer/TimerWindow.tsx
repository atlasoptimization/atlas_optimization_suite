import { useEffect, useMemo, useRef, useState } from "react";
import type { DeckAction } from "../../core/types/action";
import type {
  TimerActionOnFinish,
  TimerMode,
  TimerState
} from "../../core/types/session";
import {
  computeTimerDisplay,
  durationFromParts,
  durationParts,
  formatDuration
} from "./timerUtils";

type TimerWindowProps = {
  timer: TimerState;
  onDispatchAction: (action: DeckAction) => void;
  onFinish: () => void;
};

const PRESETS = [
  { label: "2 min card rhythm", durationMs: 2 * 60 * 1000, message: "Next" },
  { label: "5 min reflection", durationMs: 5 * 60 * 1000, message: "Write one insight" },
  { label: "10 min exam", durationMs: 10 * 60 * 1000, message: "Grade the current decision" },
  { label: "25 min deep session", durationMs: 25 * 60 * 1000, message: "Close or continue the session?" }
];

export function TimerWindow({ timer, onDispatchAction, onFinish }: TimerWindowProps) {
  const [nowMs, setNowMs] = useState(Date.now());
  const handledFinishRef = useRef<string | null>(null);
  const display = computeTimerDisplay(timer, nowMs);
  const durationMs = timer.durationMs ?? 120000;
  const parts = useMemo(() => durationParts(durationMs), [durationMs]);
  const primaryTime =
    timer.mode === "countdown" ? display.remainingMs : display.elapsedMs;

  useEffect(() => {
    if (timer.status !== "running") return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timer.status]);

  useEffect(() => {
    if (!display.isFinished || timer.status !== "running") return;
    const finishKey = `${timer.startedAt ?? ""}:${timer.durationMs ?? ""}`;
    if (handledFinishRef.current === finishKey) return;
    handledFinishRef.current = finishKey;
    onFinish();
  }, [display.isFinished, onFinish, timer.durationMs, timer.startedAt, timer.status]);

  function configureDuration(minutes: number, seconds: number) {
    onDispatchAction({
      type: "timer.configure",
      patch: {
        durationMs: durationFromParts(minutes, seconds)
      }
    });
  }

  return (
    <section className="timer-window" data-testid="timer-window">
      <div className={`timer-readout timer-status-${display.status}`}>
        <span>{timer.mode === "countdown" ? "Remaining" : "Elapsed"}</span>
        <strong>{formatDuration(primaryTime)}</strong>
        <em>{display.status}</em>
      </div>

      <div className="timer-controls-grid">
        <label>
          Mode
          <select
            value={timer.mode}
            onChange={(event) =>
              onDispatchAction({
                type: "timer.configure",
                patch: { mode: event.target.value as TimerMode }
              })
            }
          >
            <option value="stopwatch">Stopwatch</option>
            <option value="countdown">Countdown</option>
          </select>
        </label>

        <label>
          Finish action
          <select
            value={timer.actionOnFinish}
            onChange={(event) =>
              onDispatchAction({
                type: "timer.configure",
                patch: { actionOnFinish: event.target.value as TimerActionOnFinish }
              })
            }
          >
            <option value="none">None</option>
            <option value="show-message">Show message</option>
            <option value="next">Next</option>
            <option value="ask-before-next">Ask before Next</option>
          </select>
        </label>
      </div>

      {timer.mode === "countdown" && (
        <div className="timer-duration-row">
          <label>
            Minutes
            <input
              type="number"
              min={0}
              value={parts.minutes}
              onChange={(event) =>
                configureDuration(Number.parseInt(event.target.value, 10) || 0, parts.seconds)
              }
            />
          </label>
          <label>
            Seconds
            <input
              type="number"
              min={0}
              max={59}
              value={parts.seconds}
              onChange={(event) =>
                configureDuration(parts.minutes, Number.parseInt(event.target.value, 10) || 0)
              }
            />
          </label>
        </div>
      )}

      <label>
        Message on finish
        <input
          value={timer.messageOnFinish ?? ""}
          onChange={(event) =>
            onDispatchAction({
              type: "timer.configure",
              patch: { messageOnFinish: event.target.value }
            })
          }
        />
      </label>

      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={timer.autoRestart}
          onChange={(event) =>
            onDispatchAction({
              type: "timer.configure",
              patch: { autoRestart: event.target.checked }
            })
          }
        />
        Auto restart after finish
      </label>

      <div className="timer-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() =>
              onDispatchAction({
                type: "timer.configure",
                patch: {
                  mode: "countdown",
                  durationMs: preset.durationMs,
                  messageOnFinish: preset.message
                }
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="timer-buttons">
        <button type="button" onClick={() => onDispatchAction({ type: "timer.start" })}>
          Start
        </button>
        <button
          type="button"
          onClick={() => onDispatchAction({ type: "timer.pause" })}
          disabled={timer.status !== "running"}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={() => onDispatchAction({ type: "timer.resume" })}
          disabled={timer.status !== "paused"}
        >
          Resume
        </button>
        <button type="button" onClick={() => onDispatchAction({ type: "timer.stop" })}>
          Stop
        </button>
        <button type="button" onClick={() => onDispatchAction({ type: "timer.reset" })}>
          Reset
        </button>
        <button type="button" onClick={() => onDispatchAction({ type: "timer.restart" })}>
          Restart
        </button>
      </div>
    </section>
  );
}
