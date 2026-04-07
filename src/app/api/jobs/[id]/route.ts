import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import Job from '@/models/Job';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const { id: userId } = verifyAuth(req);
    const { id: jobId } = await params;
    const body = await req.json();

    const job = await Job.findOneAndUpdate(
      { _id: jobId, user: userId },
      body,
      { new: true }
    );
    if (!job) return NextResponse.json({ msg: 'Job not found' }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  try {
    const { id: userId } = verifyAuth(req);
    const { id: jobId } = await params;

    const job = await Job.findOneAndDelete({ _id: jobId, user: userId });
    if (!job) return NextResponse.json({ msg: 'Job not found' }, { status: 404 });
    return NextResponse.json({ msg: 'Job removed' });
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}
