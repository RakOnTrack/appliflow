import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

export function verifyAuth(req: NextRequest): { id: string } {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) throw new Error('No token, authorization denied');

  const token = authHeader.split(' ')[1];
  if (!token) throw new Error('No token, authorization denied');

  const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
  return { id: decoded.id };
}
