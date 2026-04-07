import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { drive } from '@/lib/drive';

export async function POST(req: NextRequest) {
  await connectDB();
  const { name, email, password } = await req.json();

  try {
    if (await User.findOne({ email })) {
      return NextResponse.json({ msg: 'Email already in use' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = new User({ name, email, password: hashed });
    await user.save();

    // Try to create Drive folder (skip if not configured)
    try {
      const folder = await drive.files.create({
        requestBody: {
          name: 'AppliFlow docs',
          mimeType: 'application/vnd.google-apps.folder',
        },
      });
      user.appliFlowFolderId = folder.data.id;
      await user.save();
    } catch (driveErr) {
      console.warn('Skipping Drive folder creation:', (driveErr as Error).message);
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return NextResponse.json({ token }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ msg: 'Server error' }, { status: 500 });
  }
}
