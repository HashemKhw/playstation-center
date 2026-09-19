import { addFils, subtractFils } from './money.js';

export function computeSessionTotalFils(params: {
  gamingCostFils: number;
  extrasCostFils: number;
  discountFils?: number;
}): number {
  const discount = params.discountFils ?? 0;
  return subtractFils(addFils(params.gamingCostFils, params.extrasCostFils), discount);
}

export function computeChangeFils(params: {
  totalFils: number;
  amountReceivedFils: number;
}): { remainingFils: number; changeFils: number; isPaidInFull: boolean } {
  const remainingFils = Math.max(0, subtractFils(params.totalFils, params.amountReceivedFils));
  const changeFils = Math.max(0, subtractFils(params.amountReceivedFils, params.totalFils));
  return {
    remainingFils,
    changeFils,
    isPaidInFull: remainingFils === 0,
  };
}

export function extraLineTotalFils(unitPriceFils: number, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('quantity must be an integer of at least 1');
  }
  return unitPriceFils * quantity;
}
