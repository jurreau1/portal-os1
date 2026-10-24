export type Stage =
  "Idea" | "Validation" | "Build" | "Ready" | "Live" | "Archived";
export interface Product {
  id: string;
  name: string;
  description: string;
  stage: Stage;
  score: number;
  updatedAt: string;
}
export interface Approval {
  id: string;
  productId: string;
  project: string;
  action: string;
  priority: "High" | "Medium" | "Low";
  risk: "High" | "Medium" | "Low";
  status: "pending";
}
export interface DashboardMetrics {
  projects: number;
  activeProducts: number;
  readyToPublish: number;
  approvals: number;
  health: number | null;
}
export interface PipelineColumn {
  stage: Stage;
  products: Product[];
}
export interface StageMetric {
  stage: Stage;
  count: number;
  averageScore: number;
}
export interface ProcessMetric {
  state: string;
  count: number;
}
export interface GovernanceMetric {
  status: string;
  count: number;
}
