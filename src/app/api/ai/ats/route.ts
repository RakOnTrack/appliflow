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

  const { resumeText, jobDescription } = await req.json();
  if (!resumeText || !jobDescription) {
    return NextResponse.json({ msg: 'resumeText and jobDescription are required' }, { status: 400 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert ATS resume reviewer. Analyze the resume against the job description and respond ONLY with a JSON object in this exact format:
{
  "score": <number 0-100>,
  "matches": [{"keyword": "<skill/term found in both>", "context": "<brief quote from resume showing this>"}],
  "gaps": [{"keyword": "<required skill/term missing from resume>", "importance": "high|medium|low", "suggestion": "<how to address this gap>"}],
  "summary": "<2-3 sentence overall assessment>"
}
No other text outside the JSON.`,
        },
        {
          role: 'user',
          content: `Job description:\n"""\n${jobDescription}\n"""\n\nResume:\n"""\n${resumeText}\n"""\n\nAnalyze this resume against the job posting. Identify matching keywords/skills and gaps. Provide an ATS score.`,
        },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0].message.content?.trim() || '';
    const clean = stripCodeFences(text);
    const payload = JSON.parse(clean);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('atsScore error:', err);
    return NextResponse.json({ msg: `AI error: ${(err as Error).message}` }, { status: 500 });
  }
}
