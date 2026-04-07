'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <nav className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center">
        <span className="text-xl font-semibold">AppliFlow</span>
      </div>
      <ul className="flex gap-4 list-none m-0 p-0">
        <li><Link href="/" className="text-blue-500 hover:text-purple-600 no-underline">Home</Link></li>
        <li><Link href="/job-tracker" className="text-blue-500 hover:text-purple-600 no-underline">Job Tracker</Link></li>
        <li><Link href="/ai-tools" className="text-blue-500 hover:text-purple-600 no-underline">AI Tools</Link></li>
        <li><Link href="/documents" className="text-blue-500 hover:text-purple-600 no-underline">Documents</Link></li>
        <li><Link href="/settings" className="text-blue-500 hover:text-purple-600 no-underline">Settings</Link></li>
      </ul>
      <button
        onClick={logout}
        className="px-3 py-1 border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white cursor-pointer bg-transparent"
      >
        Logout
      </button>
    </nav>
  );
}
