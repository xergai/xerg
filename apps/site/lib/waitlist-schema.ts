import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email(),
  company: z.string().optional().default(''),
  source: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9:_-]+$/i)
    .default('website-homepage')
    .transform((value) => value.toLowerCase()),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
