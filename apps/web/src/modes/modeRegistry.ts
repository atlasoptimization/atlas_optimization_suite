import type { GameMode } from "../core/types/mode";
import { ablationStudyMode } from "./ablationStudy";
import { abstractionMode } from "./abstraction";
import { benchAndForestMode } from "./benchAndForest";
import { everythingNotMode } from "./everythingNot";
import { entropyAuctionMode } from "./entropyAuction";
import { examClockMode } from "./examClock";
import { freeMode } from "./free";
import { inheritanceMode } from "./inheritance";
import { landscapeMode } from "./landscape";
import { midnightCalibrationMode } from "./midnightCalibration";
import { minimalismMode } from "./minimalism";
import { modelArchaeologyMode } from "./modelArchaeology";
import { modelDiesMode } from "./modelDies";
import { modelLiesMode } from "./modelLies";
import { ownWorstEnemyMode } from "./ownWorstEnemy";
import { paintersTraceMode } from "./paintersTrace";
import { shadowsVacuumMode } from "./shadowsVacuum";
import { sourceReviewMode } from "./sourceReview";
import { standardMode } from "./standard";
import { scriptedDemoMode } from "./scriptedDemo";
import { trueBayesMode } from "./trueBayes";
import { trueTarotMode } from "./trueTarot";
import { voidCartographyMode } from "./voidCartography";
import { walkInTheParkMode } from "./walkInThePark";
import { getModeCategory } from "./modeCategories";

export const gameModes: GameMode[] = [
  standardMode,
  freeMode,
  trueTarotMode,
  minimalismMode,
  trueBayesMode,
  scriptedDemoMode,
  sourceReviewMode,
  abstractionMode,
  shadowsVacuumMode,
  everythingNotMode,
  voidCartographyMode,
  ablationStudyMode,
  modelArchaeologyMode,
  modelLiesMode,
  modelDiesMode,
  inheritanceMode,
  entropyAuctionMode,
  ownWorstEnemyMode,
  midnightCalibrationMode,
  examClockMode,
  paintersTraceMode,
  benchAndForestMode,
  landscapeMode,
  walkInTheParkMode
].map((mode) => ({
  ...mode,
  category: getModeCategory(mode)
}));

export function getGameMode(modeId: string | undefined): GameMode | null {
  if (!modeId) return null;
  return gameModes.find((mode) => mode.id === modeId) ?? null;
}
