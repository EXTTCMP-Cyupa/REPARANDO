export type WorkerJob = {
  id: string;
  title: string;
  status: "DIAGNOSTICO" | "COTIZADO" | "EN_PROCESO" | "FINALIZADO";
  budget: number;
};

export type DepositItem = {
  id: string;
  workerName: string;
  amount: number;
  imagePath: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};
