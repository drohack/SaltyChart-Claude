import rateLimit from 'express-rate-limit';

function json429(_req: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED' });
}

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});
