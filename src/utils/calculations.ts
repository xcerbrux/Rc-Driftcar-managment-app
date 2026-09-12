export interface OrderCalculationInput {
  items: Array<{
    quantity: number;
    unitPrice: number;
    unitCost: number;
  }>;
  shippingFee?: number;
  discount?: number;
}

export interface OrderCalculationResult {
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
  marginPercentage: number;
}

/**
 * Accurately calculate order finances ensuring revenue, cost, and profit synchronicity
 */
export function calculateOrderTotals(input: OrderCalculationInput): OrderCalculationResult {
  const shippingFee = Number(input.shippingFee || 0);
  const discount = Number(input.discount || 0);

  let subtotal = 0;
  let totalCost = 0;

  for (const item of input.items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Number(item.unitPrice) || 0;
    const cost = Number(item.unitCost) || 0;

    subtotal += qty * price;
    totalCost += qty * cost;
  }

  const totalAmount = Math.max(0, subtotal + shippingFee - discount);
  // Profit = Total collected - product cost (shipping fee can be offset or included based on accounting)
  const profit = totalAmount - totalCost;
  const marginPercentage = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingFee: Math.round(shippingFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    marginPercentage: Math.round(marginPercentage * 10) / 10,
  };
}

/**
 * Determine stock status classification
 */
export function getStockStatus(
  stockQuantity: number,
  minAlert: number
): 'out_of_stock' | 'low_stock' | 'healthy' {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= minAlert) return 'low_stock';
  return 'healthy';
}
