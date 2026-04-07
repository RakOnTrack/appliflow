'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { fetchJobs, getAtsScore, getImpact, getCoverLetter } from '@/lib/api';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface AtsMatch { keyword: string; context?: string }
interface AtsGap { keyword: string; importance: string; suggestion?: string }
interface AtsResult { score: number; matches?: AtsMatch[]; gaps?: AtsGap[]; summary?: string }
interface JobRecord { _id: string; title: string; company: string; status: string; postingLink?: string; jobDescription?: string }

export default function AIToolsPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('ats');
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const [experienceText, setExperienceText] = useState('');
  const [bullets, setBullets] = useState<string[]>([]);

  const [coverLetter, setCoverLetter] = useState('');
  const [jobType, setJobType] = useState('fulltime');

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    (async () => {
      try { setJobs(await fetchJobs(token!)); } catch {}
    })();
  }, [token, isAuthenticated, router]);

  // PDF highlight rendering
  const renderPdfWithHighlights = useCallback(async (keywords: string[]) => {
    const container = pdfContainerRef.current;
    if (!container || !pdfData) return;
    container.innerHTML = '';

    const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;
    const kwRegex = keywords.length > 0
      ? new RegExp(keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
      : null;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const pageDiv = document.createElement('div');
      pageDiv.style.cssText = `position:relative;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.12);border-radius:4px;overflow:hidden;width:${viewport.width}px`;

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = 'block';
      pageDiv.appendChild(canvas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport } as any).promise;

      if (kwRegex) {
        const textContent = await page.getTextContent();
        const highlightLayer = document.createElement('div');
        highlightLayer.style.cssText = `position:absolute;top:0;left:0;width:${viewport.width}px;height:${viewport.height}px;pointer-events:none`;

        for (const item of textContent.items) {
          if (!('str' in item)) continue;
          if (!kwRegex.test(item.str)) continue;
          kwRegex.lastIndex = 0;
          const tx = item.transform[4] * scale;
          const ty = item.transform[5] * scale;
          const fontSize = Math.sqrt(item.transform[2] ** 2 + item.transform[3] ** 2) * scale;
          const width = item.width * scale;
          const top = viewport.height - ty - fontSize * 0.2;

          const hl = document.createElement('div');
          hl.style.cssText = `position:absolute;left:${tx}px;top:${top}px;width:${width}px;height:${fontSize}px;background:rgba(39,174,96,0.3);border-radius:2px`;
          hl.title = item.str;
          highlightLayer.appendChild(hl);
        }
        pageDiv.appendChild(highlightLayer);
      }
      container.appendChild(pageDiv);
    }
  }, [pdfData]);

  useEffect(() => {
    if (atsResult?.matches && pdfData) {
      renderPdfWithHighlights(atsResult.matches.map(m => m.keyword));
    }
  }, [atsResult, pdfData, renderPdfWithHighlights]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const ab = await file.arrayBuffer();
        setPdfData(ab);
        const pdf = await pdfjsLib.getDocument({ data: ab.slice(0) }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
        }
        setResumeText(text.trim());
      } catch (err) {
        setError('Failed to parse PDF: ' + (err as Error).message);
      }
      return;
    }
    setPdfData(null);
    setResumeText(await file.text());
  };

  const handleAts = async () => {
    if (!resumeText || !jobDescription) { setError('Please provide both a resume and job description.'); return; }
    setLoading(true); setError(''); setAtsResult(null);
    try { setAtsResult(await getAtsScore(token!, resumeText, jobDescription)); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleImpact = async () => {
    if (!experienceText) { setError('Please enter your experience text.'); return; }
    setLoading(true); setError(''); setBullets([]);
    try { setBullets(await getImpact(token!, experienceText, 5)); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleCoverLetter = async () => {
    if (!resumeText || !jobDescription) { setError('Please provide both a resume and job description.'); return; }
    setLoading(true); setError(''); setCoverLetter('');
    try { const r = await getCoverLetter(token!, resumeText, jobDescription, jobType); setCoverLetter(r.coverLetter); }
    catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const tabClass = (t: string) =>
    `px-5 py-2 border-b-3 cursor-pointer bg-transparent ${tab === t ? 'border-blue-500 text-blue-500 font-semibold' : 'border-transparent text-gray-500'}`;

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-3">AI Tools</h2>

      <div className="flex border-b border-gray-200 mb-5">
        <button className={tabClass('ats')} onClick={() => { setTab('ats'); setError(''); }}>ATS Score</button>
        <button className={tabClass('impact')} onClick={() => { setTab('impact'); setError(''); }}>Impact Bullets</button>
        <button className={tabClass('cover')} onClick={() => { setTab('cover'); setError(''); }}>Cover Letter</button>
      </div>

      {error && <p className="text-red-500 mb-3">{error}</p>}
      {loading && <p className="text-blue-500 mb-3">Processing with AI... this may take a moment.</p>}

      {/* Resume Upload */}
      {(tab === 'ats' || tab === 'cover') && (
        <div className="mb-4">
          <label className="font-medium block mb-1">Resume:</label>
          <p className="text-sm text-gray-500 mb-2">Upload a PDF or paste text below.</p>
          <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} className="mb-2" />
          <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your resume text here..." rows={5}
            className="w-full p-2 border rounded resize-y" />
        </div>
      )}

      {/* Job Selector + Description */}
      {(tab === 'ats' || tab === 'cover') && (
        <div className="mb-4">
          {jobs.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
              <label className="font-medium block mb-2">Select a Saved Job:</label>
              <select value={selectedJobId} onChange={e => {
                setSelectedJobId(e.target.value);
                const job = jobs.find(j => j._id === e.target.value);
                if (job?.jobDescription) setJobDescription(job.jobDescription);
              }} className="w-full p-2 border rounded mb-2">
                <option value="">-- Choose a job --</option>
                {jobs.map(job => <option key={job._id} value={job._id}>{job.title} at {job.company} ({job.status})</option>)}
              </select>
              {selectedJobId && (() => {
                const job = jobs.find(j => j._id === selectedJobId);
                return job ? (
                  <div className="text-sm">
                    <strong>{job.title} — {job.company}</strong>
                    {job.postingLink && (
                      <a href={job.postingLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500">
                        Open posting ↗
                      </a>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
          <label className="font-medium block mb-1">Job Description:</label>
          <p className="text-sm text-gray-500 mb-1">
            {jobs.length > 0 ? 'Select a saved job to auto-fill, or paste manually.' : 'Paste the job description below.'}
          </p>
          <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here..." rows={5}
            className="w-full p-2 border rounded resize-y" />
        </div>
      )}

      {/* ATS Tab */}
      {tab === 'ats' && (
        <div>
          <button onClick={handleAts} disabled={loading}
            className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer">
            {loading ? 'Analyzing...' : 'Analyze ATS Score'}
          </button>

          {atsResult && (
            <div className="mt-5">
              <div className={`inline-block px-5 py-2 rounded-full text-lg font-semibold mb-3 ${
                atsResult.score >= 70 ? 'bg-green-100 text-green-600' : atsResult.score >= 40 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
              }`}>
                ATS Score: {atsResult.score}/100
              </div>

              {atsResult.summary && <p className="text-gray-600 mb-4">{atsResult.summary}</p>}

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-green-600 font-semibold mb-2">Matches ({atsResult.matches?.length || 0})</h4>
                  {atsResult.matches?.length ? (
                    <ul className="pl-4 text-sm space-y-2">
                      {atsResult.matches.map((m, i) => (
                        <li key={i}><strong className="text-green-600">{m.keyword}</strong>{m.context && <span className="text-gray-500"> — &quot;{m.context}&quot;</span>}</li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 text-sm">No matches found</p>}
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="text-red-600 font-semibold mb-2">Gaps ({atsResult.gaps?.length || 0})</h4>
                  {atsResult.gaps?.length ? (
                    <ul className="pl-4 text-sm space-y-2">
                      {atsResult.gaps.map((g, i) => (
                        <li key={i}>
                          <strong className="text-red-600">{g.keyword}</strong>
                          <span className={`ml-1 px-1.5 rounded text-xs ${
                            g.importance === 'high' ? 'bg-red-100 text-red-500' : g.importance === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                          }`}>{g.importance}</span>
                          {g.suggestion && <div className="text-gray-500 text-xs mt-0.5">{g.suggestion}</div>}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 text-sm">No gaps found</p>}
                </div>
              </div>

              <h4 className="font-semibold mb-2">Your Resume (matched keywords highlighted)</h4>
              {pdfData ? (
                <div ref={pdfContainerRef} className="max-h-[700px] overflow-y-auto bg-gray-200 p-3 rounded" />
              ) : (
                <div className="p-4 bg-gray-50 border rounded text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto leading-7">
                  {(() => {
                    if (!atsResult.matches?.length) return resumeText;
                    const kws = atsResult.matches.map(m => m.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    const regex = new RegExp(`(${kws.join('|')})`, 'gi');
                    const parts = resumeText.split(regex);
                    return parts.map((part, i) => {
                      const isMatch = kws.some(kw => new RegExp(`^${kw}$`, 'i').test(part));
                      return isMatch ? <mark key={i} className="bg-green-200 px-0.5 rounded">{part}</mark> : <span key={i}>{part}</span>;
                    });
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Impact Tab */}
      {tab === 'impact' && (
        <div>
          <label className="font-medium block mb-1">Experience Description:</label>
          <textarea value={experienceText} onChange={e => setExperienceText(e.target.value)}
            placeholder="Describe your work experience..." rows={5} className="w-full p-2 border rounded resize-y mb-3" />
          <button onClick={handleImpact} disabled={loading}
            className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer">
            {loading ? 'Generating...' : 'Generate Impact Bullets'}
          </button>
          {bullets.length > 0 && (
            <div className="mt-5">
              <h4 className="font-semibold mb-2">Impact Statements:</h4>
              <ul className="pl-5 space-y-2">
                {bullets.map((b, i) => <li key={i} className="leading-6">{b}</li>)}
              </ul>
              <button onClick={() => navigator.clipboard.writeText(bullets.map(b => `• ${b}`).join('\n'))}
                className="mt-3 px-3 py-1 bg-gray-600 text-white rounded text-sm cursor-pointer">Copy to Clipboard</button>
            </div>
          )}
        </div>
      )}

      {/* Cover Letter Tab */}
      {tab === 'cover' && (
        <div>
          <div className="mb-3">
            <label className="font-medium mr-2">Job Type:</label>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="p-1.5 border rounded">
              <option value="fulltime">Full Time</option>
              <option value="parttime">Part Time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <button onClick={handleCoverLetter} disabled={loading}
            className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer">
            {loading ? 'Generating...' : 'Generate Cover Letter'}
          </button>
          {coverLetter && (
            <div className="mt-5">
              <h4 className="font-semibold mb-2">Cover Letter:</h4>
              <div className="whitespace-pre-wrap p-4 bg-gray-50 border rounded leading-6">{coverLetter}</div>
              <button onClick={() => navigator.clipboard.writeText(coverLetter)}
                className="mt-3 px-3 py-1 bg-gray-600 text-white rounded text-sm cursor-pointer">Copy to Clipboard</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
