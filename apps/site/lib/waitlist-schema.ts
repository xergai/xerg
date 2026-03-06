import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email(),
  company: z.string().optional().default(''),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
