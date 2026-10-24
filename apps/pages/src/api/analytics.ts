import { api } from "./client";
import type {
  DashboardMetrics,
  StageMetric,
  ProcessMetric,
  GovernanceMetric,
} from "../types";
export const getDashboard = (signal?: AbortSignal) =>
  api<DashboardMetrics>("/api/dashboard", { signal });
export const getAnalytics = (signal?: AbortSignal) =>
  api<StageMetric[]>("/api/analytics", { signal });
export const getTelemetry = (signal?: AbortSignal) =>
  api<ProcessMetric[]>("/api/telemetry", { signal });
export const getGovernance = (signal?: AbortSignal) =>
  api<GovernanceMetric[]>("/api/governance", { signal });
