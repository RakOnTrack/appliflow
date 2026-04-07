import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import openai from '@/lib/openai';

function stripCodeFences(text: string) {
  return text.replace(/```(?:json)?\r?\n?/g, '').replace(/```/g, '').trim();
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    verifyAuth(req);
  } catch (err) {
    return NextResponse.json({ msg: (err as Error).message }, { status: 401 });
  }

  const { experienceText, bulletsCount } = await req.json();
  if (!experienceText || !bulletsCount) {
    return NextResponse.json({ msg: 'experienceText and bulletsCount are required' }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume writer. Respond ONLY with a JSON array of strings: ["...", "..."]. No other text.',
        },
        {
          role: 'user',
          content: `Experience:\n"""\n${experienceText}\n"""\n\nGenerate ${bulletsCount} concise, quantified, action-oriented bullet points.`,
        },
      ],
      temperature: 0.5,
    });

    const text = response.choices[0].message.content?.trim() || '';
    const clean = stripCodeFences(text);
    const bullets = JSON.parse(clean);
    return NextResponse.json(bullets);
  } catch (err) {
    console.error('generateImpact error:', err);
    return NextResponse.json({ msg: `AI error: ${(err as Error).message}` }, { status: 500 });
  }
}
