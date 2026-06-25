export const LEGACY_STARTUP_INTRO_STORAGE_KEY = "dsd.hideStartupIntro";
export const STARTUP_INTRO_STORAGE_KEY = "dsd.hideStartupIntro.v2";

export const introTitle = "Welcome to the Data Science Deck";

export const introLead =
  "The Data Science Deck is a compact tool for structured thinking about mathematical modelling, machine learning, and data science.";

export const introShortText =
  "It helps you explore a problem by drawing cards, placing them on a desk, and using them as prompts for assumptions, data, uncertainty, blind spots, model behaviour, and decisions. It can also support broader structured reasoning problems.";

export const introPurposeBullets = [
  "structure your thoughts around a modelling or data-science problem",
  "uncover assumptions, missing variables, and unclear objectives",
  "explore alternative perspectives on your task",
  "turn a vague problem into concrete modelling questions and next actions"
];

export const introStandardText =
  "Start with Standard for machine learning, data science, and mathematical modelling. Use Abstraction for more general problems in research, teaching, business, or project strategy.";

export const introModesText =
  "There are many different modes. Other modes can be explored through the mode menu, and Help explains the domains, modes, and interaction basics.";

export const introHowToStartText =
  "On the basic level, choose a mode and press Next. The app will guide you through drawing and choosing cards. Then place the cards on the desk by drag and drop, add notes if useful, and use the arrangement to clarify your modelling question.";

export const introHowItWorksBullets = [
  "choose a mode",
  "press Next to draw and choose cards",
  "drag and drop cards onto the desk",
  "add notes or arrows when useful",
  "interpret each card in relation to your own task"
];

export const introNoPointsText =
  "This is not a game about points, scores, or a winning condition. The goal is to think carefully about the prompts raised by the cards and apply them to the problem at hand. A good session ends with clearer assumptions, better questions, new connections, or concrete next steps.";

export const introOutcomeText =
  "It is not fortune telling. The cards do not know the answer; they help you ask better questions and identify next modelling actions.";

export const introManualText =
  "There is also a manual with a fuller explanation of the domains, modes, and examples.";

export function shouldShowStartupIntro(isMobile: boolean, storage: Storage = localStorage) {
  void isMobile;
  return storage.getItem(STARTUP_INTRO_STORAGE_KEY) !== "true";
}

export function setStartupIntroHidden(hidden: boolean, storage: Storage = localStorage) {
  storage.removeItem(LEGACY_STARTUP_INTRO_STORAGE_KEY);
  if (hidden) storage.setItem(STARTUP_INTRO_STORAGE_KEY, "true");
  else storage.removeItem(STARTUP_INTRO_STORAGE_KEY);
}
