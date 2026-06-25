import type { DeckCard } from "../core/types/card";
import type { NoteKind, Orientation } from "../core/types/session";
import type { CardDisplayMode } from "../core/types/view";

export type ScriptedCardRef = {
  id?: string;
  domain?: string;
  cardname?: string;
  cardnames?: string[];
  nr?: number;
  keywords?: string[];
  avoidMaster?: boolean;
};

export type ScriptedSession = {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  modeStyle?: "Standard" | "Abstraction";
  modeId?: string;
  steps: ScriptedSessionStep[];
};

export type ScriptedObjectRef =
  | {
      type: "card";
      cardRef: ScriptedCardRef;
    }
  | {
      type: "note";
      textIncludes: string;
    };

export type ScriptedSessionStep =
  | {
      type: "place-card";
      cardRef: ScriptedCardRef;
      x?: number;
      y?: number;
      orientation: Orientation;
      displayPreset?: CardDisplayMode;
      hidden?: boolean;
      commentary?: string;
    }
  | {
      type: "add-note";
      x: number;
      y: number;
      noteType: NoteKind;
      text: string;
      commentary?: string;
    }
  | {
      type: "add-arrow";
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      from?: ScriptedObjectRef;
      to?: ScriptedObjectRef;
      label?: string;
      commentary?: string;
    }
  | {
      type: "set-mode";
      modeId: string;
      commentary?: string;
    }
  | {
      type: "set-session-details";
      title?: string;
      question?: string;
      context?: string;
      commentary?: string;
    };

export const LINEAR_CALIBRATION_SCRIPT_ID = "sensor-calibration-review";
export const BUSINESS_STRATEGY_SCRIPT_ID = "business-strategy-abstraction";

export const linearCalibrationScript: ScriptedSession = {
  id: LINEAR_CALIBRATION_SCRIPT_ID,
  title: "Sensor Calibration Review",
  description:
    "A Standard-style example for machine learning and data science: inspect data, assumptions, missing variables, model behaviour, and decision pressure.",
  problemStatement:
    "Why does a sensor calibration model perform well on training measurements but fail in a new measurement campaign?",
  modeStyle: "Standard",
  modeId: "scripted-demo",
  steps: [
    {
      type: "set-session-details",
      title: "Sensor Calibration Review",
      question: "Why does a sensor calibration model perform well on training measurements but fail in a new measurement campaign?",
      context:
        "A Standard-mode example for inspecting data, assumptions, missing variables, model behaviour, and decision pressure in a machine-learning/data-science setting.",
      commentary: "Start with the modelling question so every card has a job."
    },
    {
      type: "add-note",
      x: 1160,
      y: 520,
      noteType: "question",
      text: "Problem: The calibration model fits old measurements, but predictions drift in a new campaign.",
      commentary: "Begin with the concrete failure before drawing cards."
    },
    {
      type: "add-note",
      x: 1520,
      y: 520,
      noteType: "problem",
      text: "First suspicion: this may not be just a parameter-fitting problem. The data source, instrument state, hidden environment, or decision objective may have changed.",
      commentary: "Name the initial uncertainty so later cards can test it."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Source",
        cardnames: ["The anomaly", "The partial", "Trace", "The correlated"],
        keywords: ["anomaly", "missing", "data", "distribution", "evidence"],
        avoidMaster: true
      },
      orientation: "upright",
      commentary: "A Source card anchors the diagnosis in the new measurement campaign and its evidence."
    },
    {
      type: "add-note",
      x: 1040,
      y: 1490,
      noteType: "question",
      text: "What exactly changed between the old calibration data and the new campaign? Instrument, environment, protocol, preprocessing, operator, or time period?",
      commentary: "Write the measurement campaign in ordinary terms before diagnosing the model."
    },
    {
      type: "add-arrow",
      from: { type: "note", textIncludes: "fits old measurements" },
      to: { type: "card", cardRef: { domain: "Source", cardnames: ["The anomaly", "The partial", "Trace", "The correlated"], keywords: ["anomaly", "missing", "data", "distribution", "evidence"], avoidMaster: true } },
      label: "data shift",
      commentary: "Point from the concrete failure to the data-source question."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Structure",
        cardnames: ["Architecture of Assumption", "Broken Tower", "Golden Shapes", "Elegant Prison"],
        keywords: ["assumption", "misspecification", "linearity", "independence", "fragility"],
        avoidMaster: true
      },
      orientation: "upright",
      commentary: "The Structure asks which assumptions are doing work: linearity, independence, stationarity, hierarchy, or constraints."
    },
    {
      type: "add-note",
      x: 1810,
      y: 920,
      noteType: "problem",
      text: "The model may fail because one structural assumption no longer holds: stationarity, independence, linearity, hierarchy, or shared calibration law.",
      commentary: "Make the model assumption visible and testable."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Source", cardnames: ["The anomaly", "The partial", "Trace", "The correlated"], keywords: ["anomaly", "missing", "data", "distribution", "evidence"], avoidMaster: true } },
      to: { type: "card", cardRef: { domain: "Structure", cardnames: ["Architecture of Assumption", "Broken Tower", "Golden Shapes", "Elegant Prison"], keywords: ["assumption", "misspecification", "linearity", "independence", "fragility"], avoidMaster: true } },
      label: "assumption",
      commentary: "Connect observed data to the assumptions imposed by the model."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Chameleon",
        cardnames: ["Great Rehearsal", "Drifter", "Performance", "Source Material"],
        keywords: ["generalization", "overfitting", "drift", "performance", "data"],
        avoidMaster: true
      },
      orientation: "upright",
      commentary: "The Chameleon asks whether the model adapted to the old campaign but failed to generalize to the new one."
    },
    {
      type: "add-note",
      x: 1030,
      y: 850,
      noteType: "problem",
      text: "The model may have adapted to the old campaign instead of learning an invariant calibration relation.",
      commentary: "Separate fitting old data from generalizing to a changed campaign."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Structure", cardnames: ["Architecture of Assumption", "Broken Tower", "Golden Shapes", "Elegant Prison"], keywords: ["assumption", "misspecification", "linearity", "independence", "fragility"], avoidMaster: true } },
      to: { type: "card", cardRef: { domain: "Chameleon", cardnames: ["Great Rehearsal", "Drifter", "Performance", "Source Material"], keywords: ["generalization", "overfitting", "drift", "performance", "data"], avoidMaster: true } },
      label: "generalization",
      commentary: "Connect structural assumptions to model behaviour under a new campaign."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Void",
        cardnames: ["No Trace", "Domain Void", "No Thought", "The inversion"],
        keywords: ["missing", "unobserved", "blind", "neglected", "unknown"],
        avoidMaster: true
      },
      orientation: "reversed",
      commentary: "The Void points to omitted nonlinear effects, saturation, or drift."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Void", cardnames: ["No Trace", "Domain Void", "No Thought", "The inversion"], keywords: ["missing", "unobserved", "blind", "neglected", "unknown"], avoidMaster: true } },
      to: { type: "card", cardRef: { domain: "Chameleon", cardnames: ["Great Rehearsal", "Drifter", "Performance", "Source Material"], keywords: ["generalization", "overfitting", "drift", "performance", "data"], avoidMaster: true } },
      label: "failure mode",
      commentary: "Connect omissions to model behaviour instead of treating them as vague caveats."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Volition",
        cardnames: ["Aiming for Polaris", "A measure of radiance", "Force and motion", "You have chosen"],
        keywords: ["objective", "decision", "pressure", "deployment", "metric"],
        avoidMaster: true
      },
      orientation: "upright",
      commentary: "The Volition names the decision pressure: accuracy, interpretability, robust deployment, or quick diagnosis."
    },
    {
      type: "add-note",
      x: 1480,
      y: 430,
      noteType: "question",
      text: "What is the calibration model for: scientific explanation, robust deployment, fast diagnosis, uncertainty quantification, or operational correction?",
      commentary: "The model objective changes what counts as failure."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Void", cardnames: ["No Trace", "Domain Void", "No Thought", "The inversion"], keywords: ["missing", "unobserved", "blind", "neglected", "unknown"], avoidMaster: true } },
      to: { type: "card", cardRef: { domain: "Volition", cardnames: ["Aiming for Polaris", "A measure of radiance", "Force and motion", "You have chosen"], keywords: ["objective", "decision", "pressure", "deployment", "metric"], avoidMaster: true } },
      label: "risk",
      commentary: "Tie missing variables to the decision pressure they create."
    },
    {
      type: "place-card",
      cardRef: {
        domain: "Aspect",
        cardnames: ["Context", "Fragility", "Experience", "Transformation"],
        keywords: ["context", "fragility", "evidence", "transformation"],
        avoidMaster: true
      },
      orientation: "modifier",
      commentary: "The Aspect acts as a modifier: choose what aspect of the calibration matters now."
    },
    {
      type: "add-note",
      x: 1860,
      y: 1130,
      noteType: "question",
      text: "Use this Aspect to ask: which angle of the failure should we inspect first?",
      commentary: "The Aspect card narrows the next diagnostic move."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardnames: ["Context", "Fragility", "Experience", "Transformation"], keywords: ["context", "fragility", "evidence", "transformation"], avoidMaster: true } },
      to: { type: "card", cardRef: { domain: "Void", cardnames: ["No Trace", "Domain Void", "No Thought", "The inversion"], keywords: ["missing", "unobserved", "blind", "neglected", "unknown"], avoidMaster: true } },
      label: "inspect",
      commentary: "Use the Aspect card to focus the missing-variable investigation."
    },
    {
      type: "add-note",
      x: 1320,
      y: 1690,
      noteType: "opportunity",
      text: "Synthesis: the calibration issue may be a source-shift and missing-variable problem, not merely a parameter-fitting problem.",
      commentary: "The tableau now gives a practical next move rather than a mystical answer."
    }
  ]
};

export const businessStrategyScript: ScriptedSession = {
  id: BUSINESS_STRATEGY_SCRIPT_ID,
  title: "Business Strategy Abstraction",
  description:
    "An Abstraction-style example for a broader structured-thinking problem outside strict mathematical modelling.",
  problemStatement:
    "How can we get unstuck in finding more customers for a technical consulting/product project?",
  modeStyle: "Abstraction",
  modeId: "scripted-demo",
  steps: [
    {
      type: "set-session-details",
      title: "Business Strategy Abstraction",
      question: "How can we get unstuck in finding more customers for a technical consulting/product project?",
      context:
        "An Abstraction-style example: frame a broader business problem through evidence, structure, adaptation, missing pieces, and goals.",
      commentary: "Start by naming the business question as a structured reasoning problem."
    },
    {
      type: "add-note",
      x: 1040,
      y: 500,
      noteType: "question",
      text: "Question: How can we get unstuck in finding more customers for a technical consulting or product project?",
      commentary: "Begin Abstraction with the question before drawing any cards."
    },
    {
      type: "add-note",
      x: 1500,
      y: 500,
      noteType: "problem",
      text: "First thought: the problem may not be more outreach. It may be unclear positioning, weak evidence, too broad an audience, or an offer that is hard to recognize.",
      commentary: "Make the first uncertainty explicit so Aspect cards can change the framing."
    },
    {
      type: "place-card",
      cardRef: { domain: "Aspect", cardname: "Framing", keywords: ["framing", "viewpoint", "context"], avoidMaster: true },
      orientation: "modifier",
      commentary: "This lens asks what object we are really trying to change."
    },
    {
      type: "add-note",
      x: 900,
      y: 760,
      noteType: "question",
      text: "This asks us to choose a lens. Instead of asking How do we get customers?, ask: what exactly is the object we are trying to change — attention, trust, offer clarity, perceived risk, or timing?",
      commentary: "The first Aspect reframes the business question."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardname: "Framing", keywords: ["framing", "viewpoint", "context"], avoidMaster: true } },
      to: { type: "note", textIncludes: "finding more customers" },
      label: "lens",
      commentary: "Connect the lens to the question."
    },
    {
      type: "place-card",
      cardRef: { domain: "Aspect", cardname: "Configuration", keywords: ["configuration", "structure", "partition"], avoidMaster: true },
      orientation: "modifier",
      commentary: "This lens suggests looking for hidden structure in the business problem."
    },
    {
      type: "add-note",
      x: 1220,
      y: 770,
      noteType: "problem",
      text: "This lens suggests looking for hidden structure: customer segment, entry offer, sales channel, proof, price, and follow-up process. A vague market becomes separable design choices.",
      commentary: "Use structure without leaving Abstraction mode."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardname: "Configuration", keywords: ["configuration", "structure", "partition"], avoidMaster: true } },
      to: { type: "note", textIncludes: "hidden structure" },
      label: "structure",
      commentary: "Connect Configuration to the separable design choices."
    },
    {
      type: "place-card",
      cardRef: { domain: "Aspect", cardname: "Agency", keywords: ["agency", "actor", "decision"], avoidMaster: true },
      orientation: "modifier",
      commentary: "This lens asks who must act next and why now."
    },
    {
      type: "add-note",
      x: 1540,
      y: 760,
      noteType: "action",
      text: "This lens asks whether the problem is one of agency: who must act next, and why would they act now? The offer must make the next step easy for the customer.",
      commentary: "Agency turns a vague strategy into a next-action design."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardname: "Agency", keywords: ["agency", "actor", "decision"], avoidMaster: true } },
      to: { type: "note", textIncludes: "who must act next" },
      label: "agency",
      commentary: "Connect Agency to the next actor and action."
    },
    {
      type: "place-card",
      cardRef: { domain: "Aspect", cardname: "Limit", keywords: ["limit", "friction", "constraints"], avoidMaster: true },
      orientation: "modifier",
      commentary: "This lens asks where the prospect hesitates."
    },
    {
      type: "add-note",
      x: 1180,
      y: 1080,
      noteType: "problem",
      text: "This lens asks about limits and friction. Where does the prospect hesitate: unclear benefit, lack of evidence, too much complexity, missing budget, or no immediate pain?",
      commentary: "Find friction before adding more outreach."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardname: "Limit", keywords: ["limit", "friction", "constraints"], avoidMaster: true } },
      to: { type: "note", textIncludes: "limits and friction" },
      label: "friction",
      commentary: "Connect Limit to the hesitation points."
    },
    {
      type: "place-card",
      cardRef: { domain: "Aspect", cardname: "Transformation", keywords: ["transformation", "transition", "change"], avoidMaster: true },
      orientation: "modifier",
      commentary: "This lens asks whether the first sale should transform into a smaller entry point."
    },
    {
      type: "add-note",
      x: 1510,
      y: 1080,
      noteType: "opportunity",
      text: "This lens asks about transformation. Maybe the product is not the first sale. The first sale could be a workshop, audit, feasibility study, or narrow diagnostic.",
      commentary: "Transformation turns the offer into a staged path."
    },
    {
      type: "add-arrow",
      from: { type: "card", cardRef: { domain: "Aspect", cardname: "Transformation", keywords: ["transformation", "transition", "change"], avoidMaster: true } },
      to: { type: "note", textIncludes: "first sale" },
      label: "entry offer",
      commentary: "Connect Transformation to the staged first offer."
    },
    {
      type: "add-note",
      x: 940,
      y: 1320,
      noteType: "opportunity",
      text: "Synthesis: the bottleneck may be less finding customers and more defining a narrow enough promise that the right customer can recognize themselves.",
      commentary: "End with a concrete strategic hypothesis instead of a generic sales complaint."
    }
  ]
};

export const scriptedSessions: ScriptedSession[] = [linearCalibrationScript, businessStrategyScript];

export function getScriptedSession(scriptId = LINEAR_CALIBRATION_SCRIPT_ID) {
  return scriptedSessions.find((script) => script.id === scriptId) ?? linearCalibrationScript;
}

export function resolveScriptCard(cardRef: ScriptedCardRef, cards: DeckCard[]) {
  const domain = normalizeLookup(cardRef.domain);
  const domainCards = domain
    ? cards.filter((card) => normalizeLookup(card.domain) === domain)
    : cards;

  if (cardRef.id) {
    const byId = domainCards.find((card) => card.id === cardRef.id) ?? cards.find((card) => card.id === cardRef.id);
    if (byId) return byId;
  }

  const cardnames = [
    ...(cardRef.cardname ? [cardRef.cardname] : []),
    ...(cardRef.cardnames ?? [])
  ];
  for (const name of cardnames) {
    const cardname = normalizeLookup(name);
    const byName = domainCards.find((card) => normalizeLookup(card.cardname) === cardname);
    if (byName) return byName;
  }

  if (typeof cardRef.nr === "number") {
    const byNumber = domainCards.find((card) => getCardNumber(card) === cardRef.nr);
    if (byNumber) return byNumber;
  }

  const keywordMatch = findKeywordMatch(cardRef, domainCards);
  if (keywordMatch) return keywordMatch;

  const nonMasterFallback = domainCards.find((card) => !isLikelyDomainMaster(card));
  if (nonMasterFallback && cardRef.avoidMaster) return nonMasterFallback;

  return domainCards[0] ?? null;
}

function findKeywordMatch(cardRef: ScriptedCardRef, cards: DeckCard[]) {
  const keywords = (cardRef.keywords ?? []).map(normalizeLookup).filter(Boolean);
  if (keywords.length === 0) return null;

  const scored = cards
    .filter((card) => !cardRef.avoidMaster || !isLikelyDomainMaster(card))
    .map((card) => {
      const haystack = normalizeLookup([
        card.id,
        card.cardname,
        card.subdomain,
        card.summary,
        card.question,
        card.story,
        card.keywords?.join(" "),
        card.raw?.keywords,
        card.raw?.Keywords
      ].filter(Boolean).join(" "));
      const score = keywords.reduce((total, keyword) =>
        total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { card, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.card ?? null;
}

function isLikelyDomainMaster(card: DeckCard) {
  const domain = normalizeLookup(card.domain);
  const name = normalizeLookup(card.cardname);
  return name === domain || name === `the${domain}`;
}

function normalizeLookup(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getCardNumber(card: DeckCard) {
  const rawNumber =
    card.raw.nr ??
    card.raw.Nr ??
    card.raw.number ??
    card.raw.Number ??
    card.raw.card_number ??
    card.raw.cardNumber;
  const parsed = Number.parseInt(rawNumber ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}
