'use client';

import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Check, 
  AlertCircle, 
  LogOut, 
  RefreshCw 
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

export default function AdminProfilePage() {
  const { adminUser, adminRole, logout } = useAdmin();

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters in length.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully! Keep your new credentials safe.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Super Admin Profile & Credentials</h1>
        <p className="text-xs text-slate-500 mt-1">
          Root security access, platform credentials, and cryptographic password updates.
        </p>
      </div>

      {/* Identity Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              {adminUser?.name ? adminUser.name[0]?.toUpperCase() : 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">{adminUser?.name || 'Super Admin'}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200">
                  <ShieldCheck className="w-3 h-3 text-purple-700" /> Root Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                <Mail className="w-3 h-3" /> {adminUser?.email || 'ab.mishra@yahoo.com'}
              </p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Platform Company</span>
            <span className="font-semibold text-slate-800">InfraBlue Materials Technology Private Limited</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Security Clearance</span>
            <span className="font-mono text-purple-700 font-semibold uppercase">{adminRole || 'super_admin'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Operating Domain</span>
            <span className="font-semibold text-slate-800">OrderOne.in Super Admin Panel</span>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Change Password Form */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <KeyRound className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Change Admin Password</h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password (min 6 chars)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
            Update Password
          </button>
        </div>
      </form>
    </div>
  );
}
