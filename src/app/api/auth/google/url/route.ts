import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getAuthUrl } from '@/lib/drive';

export async function GET(req: NextRequest) {
  try {
    const { id } = verifyAuth(req);
    const url = getAuthUrl(id);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }
}
