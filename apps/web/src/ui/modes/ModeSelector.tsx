import type { GameMode } from "../../core/types/mode";
import { DEFAULT_MODE_ID } from "../../modes/constants";

type ModeSelectorProps = {
  modes: GameMode[];
  activeModeId: string | undefined;
  onModeChange: (modeId: string | undefined) => void;
};

export function ModeSelector({ modes, activeModeId, onModeChange }: ModeSelectorProps) {
  const defaultModeId = modes.find((mode) => mode.id === DEFAULT_MODE_ID)?.id ?? modes[0]?.id ?? "";

  return (
    <label>
      Mode
      <select
        value={activeModeId ?? defaultModeId}
        onChange={(event) => onModeChange(event.target.value || undefined)}
      >
        {modes.map((mode) => (
          <option key={mode.id} value={mode.id}>
            {"isCustom" in mode && mode.isCustom ? `${mode.name} (custom)` : mode.name}
          </option>
        ))}
      </select>
    </label>
  );
}
