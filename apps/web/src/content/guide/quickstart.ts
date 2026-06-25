import type { GuideSectionContent } from "./types";

export const quickstartGuide: GuideSectionContent = {
  id: "quickstart",
  title: "Quickstart",
  blocks: [
    {
      heading: "1. Choose a problem",
      body: "Write a modelling question and a few context notes before drawing."
    },
    {
      heading: "2. Choose a mode",
      body: "Free keeps everything manual. Standard gives a balanced pass. True Tarot delays interpretation. Minimalism starts with the six domain anchors and then cycles through subdomain master cards."
    },
    {
      heading: "3. Draw, place, think",
      body: "Draw cards, place them on the desk, add notes/arrows, and interpret their relation to the question. Double-click a card to temporarily zoom in; click outside it or press Escape to return."
    },
    {
      heading: "4. Close the session",
      body: "Record what was expected, surprising, noteworthy, and insightful. End with a conclusion and next move."
    },
    {
      heading: "Mobile browser mode",
      body: "On phones, use the bottom action bar: Next advances the guided action, Mode changes the game mode, Reset returns to the overview, Clear resets the current session after confirmation, and Help reopens this guide. Advanced panels such as minimap, custom assets, and developer exports are hidden or collapsed on mobile; use desktop for full editing and custom-domain workflows."
    }
  ]
};
