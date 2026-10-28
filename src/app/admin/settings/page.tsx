'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  ShieldAlert, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';

interface PlatformSettings {
  id: string;
  supportEmail: string;
  publicWebsiteUrl: string;
  contactPhone: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  diamondPlanAvailable: boolean;
  supportedCategories: string[];
  updatedAt?: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [supportEmail, setSupportEmail] = useState('support@orderone.in');
  const [publicWebsiteUrl, setPublicWebsiteUrl] = useState('https://orderone.in');
  const [contactPhone, setContactPhone] = useState('+91 99999 99999');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [diamondPlanAvailable, setDiamondPlanAvailable] = useState(false);
  const [reason, setReason] = useState('');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const s: PlatformSettings = data.settings;
        setSupportEmail(s.supportEmail || 'support@orderone.in');
        setPublicWebsiteUrl(s.publicWebsiteUrl || 'https://orderone.in');
        setContactPhone(s.contactPhone || '+91 99999 99999');
        setMaintenanceMode(Boolean(s.maintenanceMode));
        setAllowRegistrations(Boolean(s.allowRegistrations));
        setDiamondPlanAvailable(Boolean(s.diamondPlanAvailable));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setMessage({ type: 'error', text: 'A clear documented reason (min 5 characters) is required to modify platform settings.' });
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportEmail,
          publicWebsiteUrl,
          contactPhone,
          maintenanceMode,
          allowRegistrations,
          diamondPlanAvailable,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update platform settings');
      }

      setMessage({ type: 'success', text: 'Global platform settings updated and committed to audit log.' });
      setReason('');
      fetchSettings();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Identity & System Controls</h1>
        <p className="text-xs text-slate-500 mt-1">
          Brand legal identity, system-wide maintenance toggles, registration gates, and Diamond tier rollout.
        </p>
      </div>

      {/* Brand Identity Immutable Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold">Canonical Corporate Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Platform Brand Name:</span>
            <p className="font-bold text-white text-sm mt-0.5">OrderOne.in</p>
          </div>
          <div>
            <span className="text-slate-400">Legal Operating Entity:</span>
            <p className="font-bold text-white text-sm mt-0.5">InfraBlue Materials Technology Private Limited</p>
          </div>
          <div>
            <span className="text-slate-400">Primary Super Admin Email:</span>
            <p className="font-bold text-white text-sm mt-0.5 font-mono">ab.mishra@yahoo.com</p>
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
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Support & Public Communications
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Support Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Website Domain
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={publicWebsiteUrl}
                  onChange={(e) => setPublicWebsiteUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* System Switches */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            System & Commercial Gating
          </h3>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Platform Maintenance Mode
                </span>
                <span className="text-[11px] text-slate-500">
                  When enabled, non-admin visitors see a maintenance advisory screen and store checkout is paused.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={allowRegistrations}
                onChange={(e) => setAllowRegistrations(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Allow New Business Registrations
                </span>
                <span className="text-[11px] text-slate-500">
                  Allow new merchants, restaurants, and retail shops to sign up and create storefronts.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50/20 hover:bg-purple-50/40 cursor-pointer transition">
              <input
                type="checkbox"
                checked={diamondPlanAvailable}
                onChange={(e) => setDiamondPlanAvailable(e.target.checked)}
                className="mt-0.5 rounded text-purple-900 focus:ring-purple-900"
              />
              <div>
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Enable Diamond Plan (₹150 / 30 days)
                </span>
                <span className="text-[11px] text-purple-700">
                  Makes the enterprise Diamond tier publicly selectable across merchant upgrade portals.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Administrative Justification */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800">
            Administrative Justification <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            required
            placeholder="e.g., Updated customer support phone hotline and toggled Diamond tier readiness."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <p className="text-[11px] text-slate-400">
            Recorded in the administrative audit log alongside your Super Admin credentials.
          </p>
        </div>

        {/* Submit and Reset Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={submitting || loading}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Save & Publish Settings
          </button>
        </div>
      </form>
    </div>
  );
}
