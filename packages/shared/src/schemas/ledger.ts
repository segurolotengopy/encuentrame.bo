import { z } from 'zod';

export const LedgerEntrySchema = z.object({
  type: z.enum(['sale', 'expense']),
  amountBob: z.number().min(0),
  concept: z.string().min(1).max(160),
  source: z.enum(['voice', 'manual']).default('manual'),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;
