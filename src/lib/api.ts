export async function login({ email, password }: { email: string; password: string }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const { token } = await res.json();
  return token;
}

export async function fetchMe(token: string) {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function fetchJobs(token: string) {
  const res = await fetch('/api/jobs', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
}

export async function createJob(token: string, jobData: Record<string, unknown>) {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.msg || 'Failed to create job');
  }
  return res.json();
}

export async function getAtsScore(token: string, resumeText: string, jobDescription: string) {
  const res = await fetch('/api/ai/ats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resumeText, jobDescription }),
  });
  if (!res.ok) throw new Error((await res.json()).msg);
  return res.json();
}

export async function getImpact(token: string, experienceText: string, bulletsCount: number) {
  const res = await fetch('/api/ai/impact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ experienceText, bulletsCount }),
  });
  if (!res.ok) throw new Error((await res.json()).msg);
  return res.json();
}

export async function getCoverLetter(token: string, resumeText: string, jobDescription: string, jobType: string) {
  const res = await fetch('/api/ai/coverletter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resumeText, jobDescription, jobType }),
  });
  if (!res.ok) throw new Error((await res.json()).msg);
  return res.json();
}
