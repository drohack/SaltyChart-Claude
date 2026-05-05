import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { AppError } from '../errors';
import { jwtSecret } from '../middleware/auth';

const router = Router();

const MIN_PASSWORD_LENGTH = 8;
const JWT_EXPIRES_IN = '30d';

function signToken(userId: number, username: string, role: string): string {
  return jwt.sign({ userId, username, role }, jwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: unknown; password?: unknown };

    if (typeof username !== 'string' || username.trim().length < 2) {
      throw new AppError(400, 'BAD_REQUEST', 'Username must be at least 2 characters');
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(400, 'BAD_REQUEST', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const name = username.trim();
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(name);
    if (existing) {
      throw new AppError(409, 'USER_EXISTS', 'Username already taken');
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(name, hash);

    const token = signToken(result.lastInsertRowid as number, name, 'user');
    res.status(201).json({ token, username: name, role: 'user' });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body as { username?: unknown; password?: unknown };

    if (typeof username !== 'string' || typeof password !== 'string') {
      throw new AppError(400, 'BAD_REQUEST', 'Username and password are required');
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
      .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const token = signToken(user.id, user.username, user.role);
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    next(err);
  }
});

export default router;
