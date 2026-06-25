import { useState, type ReactNode } from "react";
import type { FeatureConfig } from "../../config/features";
import type {
  TableauCardSize,
  TopologyImageSource,
  ViewSettings,
  ViewTheme,
  ZoneVisibility
} from "../../core/types/view";
import type { CardDisplayPresetId } from "../../core/types/displayPreset";
import {
  BOARD_DISPLAY_PRESETS,
  getCardDisplayPreset,
  NEW_CARD_DISPLAY_PRESETS
} from "../../core/constants/displayPresets";

type ViewSettingsPanelProps = {
  settings: ViewSettings;
  onChange: (settings: ViewSettings) => void;
  onApplyPresetToBoard: (presetId: CardDisplayPresetId) => void;
  onScaleBoardBy: (factor: number) => void;
  onSetBoardScale: (scale: number) => void;
  onResetBoardScale: () => void;
  features: FeatureConfig;
};

export function ViewSettingsPanel({
  settings,
  onChange,
  onApplyPresetToBoard,
  onScaleBoardBy,
  onSetBoardScale,
  onResetBoardScale,
  features
}: ViewSettingsPanelProps) {
  const [boardScale, setBoardScale] = useState(1);

  function update(patch: Partial<ViewSettings>) {
    onChange({ ...settings, ...patch });
  }

  function updateNewCardPreset(presetId: CardDisplayPresetId) {
    const preset = getCardDisplayPreset(presetId);
    update({
      defaultCardDisplayPreset: preset.id,
      defaultCardDisplayMode: preset.displayMode
    });
  }

  return (
    <section className="view-settings-panel" data-testid="view-settings-panel">
      <h2>View Settings</h2>

      <SettingsSection
        title="Desk / Board"
        description="Controls for the tabletop, topology overlay, grid, and visual effects."
      >
        <label>
          Theme
          <select
            value={settings.theme}
            onChange={(event) => update({ theme: event.target.value as ViewTheme })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="scientific">Scientific</option>
            <option value="ritual">Ritual</option>
          </select>
        </label>

        <Toggle
          label="Show topology map"
          checked={settings.showDomainZones}
          onChange={(showDomainZones) => update({ showDomainZones })}
        />

        <label>
          Topology visibility
          <select
            value={settings.zoneVisibility}
            onChange={(event) => update({ zoneVisibility: event.target.value as ZoneVisibility })}
            disabled={!settings.showDomainZones}
          >
            <option value="hidden">Hidden</option>
            <option value="subtle">Subtle</option>
            <option value="normal">Normal</option>
            <option value="strong">Strong</option>
          </select>
        </label>

        <label>
          Topology image source
          <select
            value={settings.topologyImageSource}
            onChange={(event) =>
              update({ topologyImageSource: event.target.value as TopologyImageSource })
            }
            disabled={!settings.showDomainZones}
          >
            <option value="none">None</option>
            <option value="thematic">Thematic</option>
            <option value="zonal">Zonal</option>
            <option value="uniform">Uniform</option>
          </select>
        </label>

        <Toggle
          label="Show grid"
          checked={settings.showGrid}
          onChange={(showGrid) => update({ showGrid })}
        />
        <Toggle
          label="Show minimap"
          checked={settings.showMinimap}
          onChange={(showMinimap) => update({ showMinimap })}
        />
        {features.enableTimers ? (
          <Toggle
            label="Show timer"
            checked={settings.showTimer}
            onChange={(showTimer) => update({ showTimer })}
          />
        ) : (
          <DisabledFeatureNotice features={features} label="Timer" />
        )}
        <Toggle
          label="Visual effects"
          checked={settings.enableVisualEffects}
          onChange={(enableVisualEffects) => update({ enableVisualEffects })}
        />
      </SettingsSection>

      <SettingsSection
        title="Current Cards"
        description="Explicit controls for card instances already on the board. New-card defaults stay separate."
      >
        <div className="view-preset-buttons">
          {BOARD_DISPLAY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPresetToBoard(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="current-card-scale-controls">
          <div className="current-card-scale-buttons">
            <button type="button" onClick={() => onScaleBoardBy(1.15)}>
              Increase all card sizes
            </button>
            <button type="button" onClick={() => onScaleBoardBy(1 / 1.15)}>
              Decrease all card sizes
            </button>
            <button type="button" onClick={onResetBoardScale}>
              Reset all card sizes to 1x
            </button>
          </div>
          <label>
            Set all cards to size
            <input
              type="range"
              min="0.4"
              max="3"
              step="0.05"
              value={boardScale}
              onChange={(event) => setBoardScale(Number(event.target.value))}
              onPointerUp={() => onSetBoardScale(boardScale)}
              onKeyUp={(event) => {
                if (event.key === "Enter") onSetBoardScale(boardScale);
              }}
            />
            <input
              type="number"
              min="0.4"
              max="3"
              step="0.05"
              value={boardScale}
              onChange={(event) => setBoardScale(Number(event.target.value))}
              onBlur={() => onSetBoardScale(boardScale)}
            />
            <span className="scale-value">{boardScale.toFixed(2)}x</span>
          </label>
          <button type="button" onClick={() => onSetBoardScale(boardScale)}>
            Apply size to current cards
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="New Cards"
        description="Defaults used when future cards are drawn, placed, or played from piles."
      >
        <label>
          Default display
          <select
            value={settings.defaultCardDisplayPreset}
            onChange={(event) =>
              updateNewCardPreset(event.target.value as CardDisplayPresetId)
            }
          >
            {NEW_CARD_DISPLAY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Default card size
          <select
            value={settings.cardSize}
            onChange={(event) => update({ cardSize: event.target.value as TableauCardSize })}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      </SettingsSection>

      <SettingsSection
        title="Panels / Interface"
        description="Show or hide the main work panels."
      >
        <Toggle
          label="Show browser"
          checked={settings.showBrowser}
          onChange={(showBrowser) => update({ showBrowser })}
        />
        {features.enableCustomAssets ? (
          <Toggle
            label="Show Custom Assets"
            checked={settings.showCustomAssets}
            onChange={(showCustomAssets) => update({ showCustomAssets })}
          />
        ) : (
          <DisabledFeatureNotice features={features} label="Custom Assets" />
        )}
        <Toggle
          label="Show inspector"
          checked={settings.showInspector}
          onChange={(showInspector) => update({ showInspector })}
        />
        <Toggle
          label="Show piles"
          checked={settings.showPileBar}
          onChange={(showPileBar) => update({ showPileBar })}
        />
        <ScaleInput
          label="Pile overlay size"
          value={settings.pileOverlayScale}
          onChange={(pileOverlayScale) => update({ pileOverlayScale })}
        />
        <ScaleInput
          label="Choice preview size"
          value={settings.choicePreviewScale}
          onChange={(choicePreviewScale) => update({ choicePreviewScale })}
        />
      </SettingsSection>

      <SettingsSection
        title="Card Labels"
        description="Browser label helpers. The full Mythic / Scientific / Both selector remains in the card browser."
      >
        <Toggle
          label="Mythic names"
          checked={settings.showMythicNames}
          onChange={(showMythicNames) => update({ showMythicNames })}
        />
        <Toggle
          label="Scientific names"
          checked={settings.showScientificNames}
          onChange={(showScientificNames) => update({ showScientificNames })}
        />
        <Toggle
          label="Show keywords"
          checked={settings.showKeywords}
          onChange={(showKeywords) => update({ showKeywords })}
        />
      </SettingsSection>
    </section>
  );
}

function ScaleInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="range"
        min="0.75"
        max="2"
        step="0.05"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="scale-value">{value.toFixed(2)}x</span>
    </label>
  );
}

function DisabledFeatureNotice({
  features,
  label
}: {
  features: FeatureConfig;
  label: string;
}) {
  return (
    <p className="disabled-feature-notice">
      {label}: {features.disabledFeatureMessage}{" "}
      <a href={features.releaseUrl} target="_blank" rel="noreferrer">
        local version
      </a>
    </p>
  );
}

function SettingsSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="view-settings-section">
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
