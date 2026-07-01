import { colabExportBackend } from "./ColabExportBackend";
import { hostedApiBackend } from "./HostedApiBackend";
import { localFastApiBackend } from "./LocalFastApiBackend";
import { mockBackend } from "./MockBackend";
import { pyodideBackend } from "./PyodideBackend";
import type { ExecutionBackend, ExecutionBackendId } from "./types";

export const EXECUTION_BACKENDS: ExecutionBackend[] = [
  mockBackend,
  localFastApiBackend,
  pyodideBackend,
  colabExportBackend,
  hostedApiBackend
];

export function getExecutionBackend(id: ExecutionBackendId): ExecutionBackend {
  return EXECUTION_BACKENDS.find((backend) => backend.id === id) ?? localFastApiBackend;
}

export function isExecutionBackendId(value: string): value is ExecutionBackendId {
  return EXECUTION_BACKENDS.some((backend) => backend.id === value);
}
