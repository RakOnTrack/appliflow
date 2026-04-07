'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { fetchJobs, createJob } from '@/lib/api';

const statusOptions = ['Applied', 'Interview', 'Cancelled', 'Offer'];
const statusColors: Record<string, { bg: string; text: string }> = {
  Applied:   { bg: 'bg-blue-100', text: 'text-blue-600' },
  Interview: { bg: 'bg-green-100', text: 'text-green-600' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-600' },
  Offer:     { bg: 'bg-purple-100', text: 'text-purple-600' },
};

export default function JobTrackerPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: string }>({ key: null, direction: 'asc' });

  const [newJob, setNewJob] = useState({
    postingLink: '', title: '', company: '', appliedDate: '', docsUsed: '', status: 'Applied',
  });

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    (async () => {
      try {
        const data = await fetchJobs(token!);
        setJobs(data);
      } catch {
        setError('Could not load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, isAuthenticated, router]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    if (sortConfig.key) {
      list.sort((a, b) => {
        let aVal: string | number | Date = a[sortConfig.key!];
        let bVal: string | number | Date = b[sortConfig.key!];
        if (sortConfig.key === 'appliedDate') {
          aVal = new Date(aVal); bVal = new Date(bVal);
        } else {
          aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [jobs, sortConfig]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNewJob(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createJob(token!, newJob);
      setJobs(prev => [...prev, created]);
      setNewJob({ postingLink: '', title: '', company: '', appliedDate: '', docsUsed: '', status: 'Applied' });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const sortArrow = (key: string) =>
    sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';

  if (loading) return <p className="p-5">Loading jobs...</p>;
  if (error) return <p className="p-5 text-red-500">{error}</p>;

  return (
    <div className="p-5 overflow-x-auto">
      <h2 className="text-2xl font-semibold mb-4">Job Tracker</h2>

      <form onSubmit={handleAddJob} className="grid gap-3 max-w-xl mb-6">
        <input name="postingLink" placeholder="Job Posting URL" value={newJob.postingLink} onChange={handleChange} required className="p-2 border rounded" />
        <input name="title" placeholder="Job Title" value={newJob.title} onChange={handleChange} required className="p-2 border rounded" />
        <input name="company" placeholder="Company" value={newJob.company} onChange={handleChange} required className="p-2 border rounded" />
        <input type="date" name="appliedDate" value={newJob.appliedDate} onChange={handleChange} required className="p-2 border rounded" />
        <input name="docsUsed" placeholder="Docs Folder URL (optional)" value={newJob.docsUsed} onChange={handleChange} className="p-2 border rounded" />
        <select name="status" value={newJob.status} onChange={handleChange} className="p-2 border rounded">
          {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="max-w-[150px] py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">Add Job</button>
      </form>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="p-3">Posting</th>
            <th className="p-3">Title</th>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('company')}>Company{sortArrow('company')}</th>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('appliedDate')}>Applied{sortArrow('appliedDate')}</th>
            <th className="p-3">Docs</th>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('status')}>Status{sortArrow('status')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedJobs.map((job) => (
            <tr key={String(job._id)} className="border-b border-gray-100">
              <td className="p-3">
                <a href={String(job.postingLink)} target="_blank" rel="noopener noreferrer" className="text-blue-500">View</a>
              </td>
              <td className="p-3">{String(job.title)}</td>
              <td className="p-3">{String(job.company)}</td>
              <td className="p-3">{new Date(String(job.appliedDate)).toLocaleDateString()}</td>
              <td className="p-3">
                {job.docsUsed ? <a href={String(job.docsUsed)} target="_blank" rel="noopener noreferrer" className="text-blue-500">Folder</a> : '—'}
              </td>
              <td className="p-3">
                <span className={`px-3 py-1 rounded-full text-sm ${statusColors[String(job.status)]?.bg} ${statusColors[String(job.status)]?.text}`}>
                  {String(job.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
