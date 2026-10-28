'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  FileText,
  ExternalLink,
  RefreshCw,
  Clock,
  Edit,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  adminRole?: string;
  businessId?: string;
  status?: 'active' | 'suspended';
  createdAt: string;
}

interface LinkedBusiness {
  id: string;
  name: string;
  slug: string;
  type: string;
  email: string;
  phone: string;
  status: string;
  subscription: {
    planId: string;
    status: string;
    renewsAt?: string;
  };
  createdAt: string;
}

interface AuditItem {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  result?: string;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [businesses, setBusinesses] = useState<LinkedBusiness[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Status modal state
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('owner');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editBusinessId, setEditBusinessId] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load user details');
      }
      setUser(data.user);
      setBusinesses(data.businesses || []);
      setAuditLogs(data.auditLogs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleStatusChange = async (reason: string) => {
    if (!user) return;
    const targetStatus = user.status === 'suspended' ? 'active' : 'suspended';

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetStatus,
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update user status');
    }

    setShowStatusModal(false);
    await fetchUser();
  };

  const openEditModal = () => {
    if (!user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'owner');
    setEditStatus(user.status || 'active');
    setEditBusinessId(user.businessId || '');
    setEditReason('');
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editReason.trim() || editReason.trim().length < 3) {
      setEditError('A documented reason is required to update this user.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          role: editRole,
          status: editStatus,
          businessId: editBusinessId ? editBusinessId.trim() : null,
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setEditOpen(false);
      await fetchUser();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (reason: string) => {
    if (!user) return;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete user');
    }

    router.push('/admin/users');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-700 mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading user dossier...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-red-800">User Not Found</h2>
        <p className="text-sm text-red-600 mt-1">{error || 'Could not locate this user profile in the database.'}</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Users Directory
        </Link>
      </div>
    );
  }

  const isSuspended = user.status === 'suspended';
  const isSuper = user.adminRole === 'super_admin' || user.email === 'ab.mishra@yahoo.com';

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user.name || 'Unnamed User'}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  isSuspended
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isSuspended ? 'Suspended' : 'Active Account'}
              </span>
              {isSuper && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  <Shield className="w-3 h-3" /> Super Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">User ID: {user.id}</p>
          </div>
        </div>

        {/* Action Buttons: Edit, Suspend/Reactivate, Delete */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Profile */}
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Profile</span>
          </button>

          {/* Suspend / Reactivate (blocked for Super Admin) */}
          {!isSuper && (
            <button
              onClick={() => setShowStatusModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition shadow-xs ${
                isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {isSuspended ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate Account
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" /> Suspend Account
                </>
              )}
            </button>
          )}

          {/* Delete User (blocked for Super Admin) */}
          {!isSuper && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Profile Dossier & Linked Businesses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg">
                {user.name ? user.name[0]?.toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{user.name || 'Unnamed'}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" /> {user.email}
                </p>
              </div>
            </div>

            <button onClick={openEditModal} className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
              <Edit className="w-3 h-3" /> Edit
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Platform Role</span>
              <span className="font-semibold text-slate-800 capitalize">{user.role}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Admin Clearance</span>
              <span className="font-semibold text-slate-800">
                {user.adminRole ? user.adminRole : 'None (Standard Tenant)'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Joined Platform</span>
              <span className="font-semibold text-slate-800">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Status</span>
              <span
                className={`font-semibold ${
                  isSuspended ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {isSuspended ? 'Suspended' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Businesses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Linked Businesses ({businesses.length})</h2>
            </div>
            <span className="text-xs text-slate-400">Stores or Restaurants owned by user</span>
          </div>

          {businesses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No business accounts are linked directly to this user profile.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {businesses.map((biz) => {
                const planId = biz.subscription?.planId || 'plan_basic';
                const planName = planId === 'plan_gold' ? 'Gold' : planId === 'plan_diamond' ? 'Diamond' : 'Basic';
                return (
                  <div key={biz.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{biz.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          /{biz.slug}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            biz.subscription?.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {planName} ({biz.subscription?.status || 'inactive'})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Category: <span className="capitalize">{biz.type || 'Retail'}</span> • Email: {biz.email} • Phone: {biz.phone}
                      </p>
                    </div>

                    <Link
                      href={`/admin/businesses/${biz.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      View Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Audit History for this User */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Recent Audit Activity</h2>
          </div>
          <span className="text-xs text-slate-400">Security & Administrative Actions</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No audit log entries recorded for this user.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 font-mono">{log.action}</td>
                    <td className="py-2.5 text-slate-600 max-w-md truncate">{log.details}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          log.result === 'success' || !log.result
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {log.result || 'success'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit User Details</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Platform Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="owner">Business Owner</option>
                    <option value="staff">Store Staff</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Linked Business ID (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. biz_yxqjlv9_mvqqf92r"
                  value={editBusinessId}
                  onChange={(e) => setEditBusinessId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify documented reason for updating this user..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {editSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <AdminConfirmModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={handleStatusChange}
        title={isSuspended ? 'Reactivate User Account' : 'Suspend User Account'}
        description={`Are you sure you want to ${
          isSuspended ? 'reactivate' : 'suspend'
        } user "${user.name || user.email}"? ${
          isSuspended
            ? 'They will regain access to their portal and connected businesses.'
            : 'They will be blocked from logging in immediately.'
        }`}
        confirmText={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
        variant={isSuspended ? 'primary' : 'danger'}
        requireReason={true}
      />

      {/* Delete User Modal */}
      <AdminConfirmModal
        isOpen={deleteOpen}
        title={`Permanently Delete User: ${user.name || user.email}`}
        description="WARNING: Deleting this user permanently removes their credentials, authentication sessions, and unlinks them from any owned businesses."
        confirmText="Permanently Delete User"
        variant="danger"
        requireReason={true}
        onConfirm={handleDeleteUser}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
