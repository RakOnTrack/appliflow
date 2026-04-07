import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import Job from '@/models/Job';
import User from '@/models/User';
import { drive } from '@/lib/drive';

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { id } = verifyAuth(req);
    const jobs = await Job.find({ user: id });
    return NextResponse.json(jobs);
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const { id } = verifyAuth(req);
    const body = await req.json();

    const job = new Job({ ...body, user: id });
    await job.save();

    // Try to create a Drive subfolder
    try {
      const userRecord = await User.findById(id);
      if (userRecord?.appliFlowFolderId) {
        const sub = await drive.files.create({
          requestBody: {
            name: `${job.title} – ${job.company}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [userRecord.appliFlowFolderId],
          },
        });
        job.docsUsed = `https://drive.google.com/drive/folders/${sub.data.id}`;
        await job.save();
      }
    } catch (driveErr) {
      console.warn('Drive integration error (non-fatal):', (driveErr as Error).message);
    }

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}
