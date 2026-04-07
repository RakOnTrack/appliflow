import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import openai from '@/lib/openai';

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    verifyAuth(req);
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }

  const { resumeText, jobDescription, jobType } = await req.json();
  if (!resumeText || !jobDescription || !jobType) {
    return NextResponse.json({ msg: 'resumeText, jobDescription and jobType are required' }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert cover letter writer. Return ONLY the cover letter text, no JSON wrapping.',
        },
        {
          role: 'user',
          content: `Resume:\n"""\n${resumeText}\n"""\n\nJob description:\n"""\n${jobDescription}\n"""\n\nThis is a ${jobType} position. Write a tailored cover letter in a professional tone.`,
        },
      ],
      temperature: 0.6,
    });

    const letter = response.choices[0].message.content?.trim() || '';
    return NextResponse.json({ coverLetter: letter });
  } catch (err) {
    console.error('generateCoverLetter error:', err);
    return NextResponse.json({ msg: `AI error: ${(err as Error).message}` }, { status: 500 });
  }
}
