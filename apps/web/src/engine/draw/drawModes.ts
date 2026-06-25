export type DrawMode =
  | "random-1"
  | "random-n"
  | "choose-1-from-n"
  | "secret-1"
  | "secret-n";

export function modeUsesCount(mode: DrawMode) {
  return mode === "random-n" || mode === "choose-1-from-n" || mode === "secret-n";
}

export function modeIsSecret(mode: DrawMode) {
  return mode === "secret-1" || mode === "secret-n";
}
