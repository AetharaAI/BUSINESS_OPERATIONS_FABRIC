import { ContractState } from "@/lib/types/crm";

const allowedTransitions: Record<ContractState, ContractState[]> = {
  draft: ["approval_pending", "voided", "error"],
  approval_pending: ["approved", "declined", "voided", "error"],
  approved: ["generated", "voided", "error"],
  generated: ["sent", "voided", "error"],
  sent: ["viewed", "completed", "expired", "declined", "voided", "error"],
  viewed: ["completed", "expired", "declined", "voided", "error"],
  completed: [],
  declined: [],
  expired: [],
  voided: [],
  error: ["draft", "approval_pending", "approved", "generated", "voided"]
};

export const canTransitionContractState = (from: ContractState, to: ContractState): boolean =>
  allowedTransitions[from].includes(to);

export const assertValidContractTransition = (from: ContractState, to: ContractState): void => {
  if (!canTransitionContractState(from, to)) {
    throw new Error(`Illegal contract transition: ${from} -> ${to}`);
  }
};

export const computeTransitionPath = (target: ContractState): ContractState[] => {
  switch (target) {
    case "draft":
      return [];
    case "approval_pending":
      return ["approval_pending"];
    case "approved":
      return ["approval_pending", "approved"];
    case "generated":
      return ["approval_pending", "approved", "generated"];
    default:
      throw new Error(`Unsupported create-time target state: ${target}`);
  }
};
