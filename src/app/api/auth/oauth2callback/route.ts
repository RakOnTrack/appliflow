import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { setCredentials, drive } from '@/lib/drive';

export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const code = req.nextUrl.searchParams.get('code');
    const userId = req.nextUrl.searchParams.get('state');
    if (!code) throw new Error('Missing code parameter');
    if (!userId) throw new Error('Missing state parameter');

    const tokens = await setCredentials(code);
    const user = await User.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    user.googleAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
      user.googleRefreshToken = tokens.refresh_token;
    }

    if (!user.appliFlowFolderId) {
      const folder = await drive.files.create({
        requestBody: {
          name: 'AppliFlow docs',
          mimeType: 'application/vnd.google-apps.folder',
        },
      });
      user.appliFlowFolderId = folder.data.id;
    }

    await user.save();
    return new NextResponse('Google Drive connected! You can close this window.');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new NextResponse(`OAuth failed: ${(err as Error).message}`, { status: 500 });
  }
}
