import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  try {
    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ msg: 'Invalid credentials' }, { status: 400 });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return NextResponse.json({ msg: 'Invalid credentials' }, { status: 400 });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return NextResponse.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
