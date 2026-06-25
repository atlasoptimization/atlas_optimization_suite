import type { GuideSectionContent } from "./types";
import {
  introHowItWorksBullets,
  introHowToStartText,
  introLead,
  introManualText,
  introModesText,
  introNoPointsText,
  introOutcomeText,
  introPurposeBullets,
  introShortText,
  introStandardText
} from "../intro";

export const overviewGuide: GuideSectionContent = {
  id: "overview",
  title: "What is the Data Science Deck?",
  intro: `${introLead} ${introShortText}`,
  blocks: [
    {
      heading: "How it works",
      body: "Choose a modelling question, draw cards, place them spatially on the desk, and use their meanings and relations to examine the problem.",
      bullets: introPurposeBullets
    },
    {
      heading: "Basic interaction",
      body: introHowToStartText,
      bullets: introHowItWorksBullets
    },
    {
      heading: "No points, no winning condition",
      body: introNoPointsText
    },
    {
      heading: "Start with Standard",
      body: introStandardText
    },
    {
      heading: "Modes and Help",
      body: introModesText
    },
    {
      heading: "Working attitude",
      body: introOutcomeText
    },
    {
      heading: "Manual",
      body: introManualText
    }
  ]
};
