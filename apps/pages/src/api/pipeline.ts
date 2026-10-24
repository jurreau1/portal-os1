import { api } from "./client";
import type { PipelineColumn } from "../types";
export const getPipeline = (signal?: AbortSignal) =>
  api<PipelineColumn[]>("/api/pipeline", { signal });
