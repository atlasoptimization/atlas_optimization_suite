import { useEffect, useState } from "react";
import {
  getUiConfig,
  getUiProfileForWidth,
  type MobileUiConfig,
  type UiProfile
} from "../config/mobileUi";

export type UiProfileState = {
  profile: UiProfile;
  isMobile: boolean;
  config: MobileUiConfig;
};

function getViewportWidth() {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;
  return window.innerWidth;
}

export function useUiProfile(): UiProfileState {
  const [profile, setProfile] = useState<UiProfile>(() => getUiProfileForWidth(getViewportWidth()));

  useEffect(() => {
    function updateProfile() {
      setProfile(getUiProfileForWidth(getViewportWidth()));
    }

    updateProfile();
    window.addEventListener("resize", updateProfile);
    window.addEventListener("orientationchange", updateProfile);
    return () => {
      window.removeEventListener("resize", updateProfile);
      window.removeEventListener("orientationchange", updateProfile);
    };
  }, []);

  return {
    profile,
    isMobile: profile === "mobile",
    config: getUiConfig(profile)
  };
}
