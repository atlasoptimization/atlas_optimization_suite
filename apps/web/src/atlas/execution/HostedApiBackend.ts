import { createUnavailableBackend } from "./UnavailableBackend";

export const hostedApiBackend = createUnavailableBackend(
  "hosted-api",
  "Hosted API",
  "Future hosted Atlas API execution adapter.",
  "Hosted API execution is represented as a deployment adapter placeholder."
);
