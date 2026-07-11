/**
 * Generate a unique reference number for applications.
 * Format: MEM-2026-XXXX for membership, LN-2026-XXXX for loans
 */
export function generateReferenceNo(type: 'membership' | 'loan'): string {
  const prefix = type === 'membership' ? 'MEM' : 'LN';
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}
