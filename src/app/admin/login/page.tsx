'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { OrderOneLogo } from '@/components/ui/OrderOneLogo';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin';

  const [email, setEmail] = useState('ab.mishra@yahoo.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid administrator credentials.');
        return;
      }

      // Successful login - hard navigation guarantees session cookie is propagated
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Top platform branding */}
        <div className="text-center mb-8 flex flex-col items-center">
          <OrderOneLogo href="/" size="lg" darkBg={true} />
          <p className="text-xs text-slate-400 mt-3 uppercase tracking-widest font-semibold">
            Super Admin Control Center
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0D1836] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Elevated Privilege Access</h2>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ab.mishra@yahoo.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Root Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate to Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <Link href="/" className="hover:text-slate-300 transition-colors">
              ← Return to OrderOne.in
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Business Owner Sign In →
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-500 mt-6">
          Operated by <strong>InfraBlue Materials Technology Private Limited</strong>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070D1E] flex items-center justify-center p-4">
          <div className="text-slate-400 text-xs">Loading admin authentication console...</div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
