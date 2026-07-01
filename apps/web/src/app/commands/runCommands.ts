import type { AtlasCommandDescriptor } from "./commandTypes";

export const runCommands: AtlasCommandDescriptor[] = [
  {
    id: "run.validate",
    label: "Validate",
    menu: "Run",
    enabled: (context) => context.supportsValidate !== false,
    execute: () => ({ message: "Validate requested." })
  },
  {
    id: "run.generateCode",
    label: "Generate Code",
    menu: "Run",
    enabled: (context) => context.supportsGenerateCode !== false,
    execute: () => ({ message: "Generate code requested." })
  },
  {
    id: "run.solve",
    label: "Solve",
    menu: "Run",
    enabled: (context) => context.supportsSolve !== false,
    execute: () => ({ message: "Solve requested." })
  },
  {
    id: "run.evaluateCurrent",
    label: "Evaluate Current",
    menu: "Run",
    enabled: (context) => context.supportsEvaluate !== false,
    execute: () => ({ message: "Evaluate current requested." })
  },
  {
    id: "run.evaluateSolution",
    label: "Evaluate Solution",
    menu: "Run",
    enabled: (context) => context.supportsEvaluate !== false,
    execute: () => ({ message: "Evaluate solution requested." })
  }
];
