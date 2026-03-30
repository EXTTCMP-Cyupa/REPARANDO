import type { DepositItem, WorkerJob } from "./types";

export const workerJobs: WorkerJob[] = [
  { id: "wk-1", title: "Reparar instalación eléctrica cocina", status: "EN_PROCESO", budget: 120 },
  { id: "wk-2", title: "Pintura de sala", status: "DIAGNOSTICO", budget: 80 }
];

export const adminDeposits: DepositItem[] = [
  {
    id: "dep-1",
    workerName: "Worker Demo",
    amount: 25,
    imagePath: "uploads/deposit-1.jpg",
    status: "PENDING"
  },
  {
    id: "dep-2",
    workerName: "Ana Electricista",
    amount: 15,
    imagePath: "uploads/deposit-2.jpg",
    status: "PENDING"
  }
];
