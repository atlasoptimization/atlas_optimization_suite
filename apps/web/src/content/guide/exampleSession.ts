import type { GuideSectionContent } from "./types";

export const exampleSessionGuide: GuideSectionContent = {
  id: "example-session",
  title: "Example Sessions",
  intro:
    "Scripted examples show how the deck can structure a question without treating cards as prediction or fortune telling. Load one, then click Next repeatedly to watch the tableau unfold.",
  blocks: [
    {
      heading: "Sensor Calibration Review",
      body: "A Standard-style machine-learning/data-science example: why does a sensor calibration model work on training measurements but fail in a new measurement campaign?"
    },
    {
      heading: "Business Strategy Abstraction",
      body: "An Abstraction-style example for a broader problem: how can a technical consulting/product project get unstuck in finding more customers?"
    },
    {
      heading: "Cards, notes, and arrows",
      body: "Each example places domain cards in the relevant topology regions, adds notes near the idea they explain, and draws arrows between the actual cards or notes involved."
    },
    {
      heading: "How to run one",
      body: "Loading an example replaces the current board after confirmation, switches to Example Sessions mode, and lets Next place one curated card, note, or arrow at a time."
    }
  ]
};
