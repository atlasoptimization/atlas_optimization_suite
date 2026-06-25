import type { GuideSectionContent } from "./types";

export const rulesGuide: GuideSectionContent = {
  id: "rules",
  title: "Rules",
  intro: "The rules guide attention. They should help insight rather than block it.",
  blocks: [
    {
      heading: "Topology rule",
      body: "Read card position against the board geometry: Source below, Volition above, Void as model space, Chameleon and Structure inside it."
    },
    {
      heading: "Drawing rule",
      body: "A mode can suggest random, chosen, or blind draws. Manual choice remains possible in Free and guided use."
    },
    {
      heading: "Placement and orientation",
      body: "Placement expresses relation. Orientation changes semantic emphasis: virtue/upright, pathology/reversed, modifier, or question."
    },
    {
      heading: "Timing and closure",
      body: "Stop when the tableau has produced a usable insight, a clearly stated problem or opportunity, or a next empirical/action step."
    },
    {
      heading: "Core rule",
      body: "Insight over rules. If a formal rule gets in the way of a better model, document the deviation and continue."
    }
  ]
};
