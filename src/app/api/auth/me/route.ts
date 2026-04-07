import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { id } = verifyAuth(req);
    const user = await User.findById(id).select('-password');
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}
