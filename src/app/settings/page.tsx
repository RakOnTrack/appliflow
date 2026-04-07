'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [defaultJobType, setDefaultJobType] = useState('fulltime');

  if (!isAuthenticated) { router.replace('/login'); return null; }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Saved default job type: ${defaultJobType}`);
  };

  const handleConnectDrive = async () => {
    try {
      const res = await fetch('/api/auth/google/url', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Could not get OAuth URL');
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      alert('Failed to initiate Google Drive connection');
    }
  };

  return (
    <div className="p-5 max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold mb-5">Settings</h2>

      <form onSubmit={handleSaveSettings} className="mb-10">
        <div className="mb-3">
          <label htmlFor="defaultJobType" className="mr-3 font-medium">Default Job Type:</label>
          <select id="defaultJobType" value={defaultJobType} onChange={e => setDefaultJobType(e.target.value)}
            className="p-1.5 border rounded">
            <option value="fulltime">Full Time</option>
            <option value="parttime">Part Time</option>
            <option value="contract">Contract</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
          Save Settings
        </button>
      </form>

      <div>
        <h3 className="text-lg font-semibold mb-2">Google Drive</h3>
        <p className="mb-3 text-gray-600">Connect your Google Drive to automatically store application documents.</p>
        <button onClick={handleConnectDrive}
          className="px-5 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer">
          Connect Google Drive
        </button>
      </div>
    </div>
  );
}
