export type UiProfile = "desktop" | "mobile";

export type MobileUiConfig = {
  hideMinimap: boolean;
  compactNextPanel: boolean;
  showOnlyResetView: boolean;
  hideBookmarks: boolean;
  hideFitButtons: boolean;
  hideZoomButtons: boolean;
  collapsePiles: boolean;
  showMobilePileDrawer: boolean;
  collapseCardBrowser: boolean;
  hideDeveloperPanel: boolean;
  hideCustomAssets: boolean;
  showMobileActionBar: boolean;
  showClearButton: boolean;
  showHelpButton: boolean;
  showModeButton: boolean;
};

export const MOBILE_UI_BREAKPOINT = 768;

export const desktopUiConfig: MobileUiConfig = {
  hideMinimap: false,
  compactNextPanel: false,
  showOnlyResetView: false,
  hideBookmarks: false,
  hideFitButtons: false,
  hideZoomButtons: false,
  collapsePiles: false,
  showMobilePileDrawer: false,
  collapseCardBrowser: false,
  hideDeveloperPanel: false,
  hideCustomAssets: false,
  showMobileActionBar: false,
  showClearButton: true,
  showHelpButton: true,
  showModeButton: true
};

export const mobileUiConfig: MobileUiConfig = {
  hideMinimap: true,
  compactNextPanel: true,
  showOnlyResetView: true,
  hideBookmarks: true,
  hideFitButtons: true,
  hideZoomButtons: true,
  collapsePiles: true,
  showMobilePileDrawer: true,
  collapseCardBrowser: true,
  hideDeveloperPanel: true,
  hideCustomAssets: true,
  showMobileActionBar: true,
  showClearButton: true,
  showHelpButton: true,
  showModeButton: true
};

export function getUiProfileForWidth(width: number): UiProfile {
  return width <= MOBILE_UI_BREAKPOINT ? "mobile" : "desktop";
}

export function getUiConfig(profile: UiProfile): MobileUiConfig {
  return profile === "mobile" ? mobileUiConfig : desktopUiConfig;
}
