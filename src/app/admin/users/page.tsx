'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Mail,
  User as UserIcon,
  Building2
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface EditUserForm {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  businessId?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Status modal
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    action: 'suspend' | 'reactivate';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    action: 'suspend',
  });

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditUserForm | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    userEmail: string;
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    userEmail: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search.trim()) params.set('search', search.trim());
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to load user records');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, role, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleConfirmStatusChange = async (reason: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: statusModal.userId,
        status: statusModal.action === 'suspend' ? 'suspended' : 'active',
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update user status');
    }

    await fetchUsers();
  };

  const openEditModal = (u: any) => {
    setEditForm({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'owner',
      status: u.status || 'active',
      businessId: u.businessId || '',
    });
    setEditReason('');
    setEditError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editReason.trim() || editReason.trim().length < 3) {
      setEditError('Please provide a documented reason for updating this user.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch(`/api/admin/users/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          status: editForm.status,
          businessId: editForm.businessId ? editForm.businessId.trim() : null,
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user');
      }

      setEditOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (reason: string) => {
    const res = await fetch(`/api/admin/users/${deleteModal.userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete user');
    }

    await fetchUsers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Registered Users</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full user lifecycle: View profile, Edit credentials/roles, suspend or delete users with complete audit logs.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-indigo-600')} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Roles</option>
              <option value="admin">Platform Admin</option>
              <option value="owner">Business Owner</option>
              <option value="staff">Store Staff</option>
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
            Loading user accounts...
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No user accounts found matching selected criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">User Identity</th>
                    <th className="p-3.5">Platform Role</th>
                    <th className="p-3.5">Connected Business</th>
                    <th className="p-3.5">Joined</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSuspended = u.status === 'suspended';
                    const isSuper = u.adminRole === 'super_admin' || u.email === 'ab.mishra@yahoo.com';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </span>
                            <Link href={`/admin/users/${u.id}`} className="hover:underline">
                              {u.name || 'Unnamed User'}
                            </Link>
                            {isSuper && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              u.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : u.role === 'owner'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {u.businessName ? (
                            <Link href={`/admin/businesses/${u.businessId}`} className="font-semibold text-slate-800 hover:text-indigo-600">
                              {u.businessName}
                            </Link>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-500 text-[11px]">{formatDate(u.createdAt)}</td>

                        <td className="p-3.5">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              isSuspended
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            )}
                          >
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          {/* View */}
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
                            title="View User Dossier"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>View</span>
                          </Link>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs"
                            title="Edit User"
                          >
                            <Edit className="w-3 h-3 text-indigo-600" />
                            <span>Edit</span>
                          </button>

                          {/* Suspend / Reactivate (blocked for Super Admin) */}
                          {!isSuper && (
                            <button
                              onClick={() =>
                                setStatusModal({
                                  isOpen: true,
                                  userId: u.id,
                                  userName: u.name || u.email,
                                  action: isSuspended ? 'reactivate' : 'suspend',
                                })
                              }
                              className={cn(
                                'px-2 py-1 rounded-lg text-xs font-semibold transition-colors shadow-2xs',
                                isSuspended
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                              )}
                              title={isSuspended ? 'Reactivate' : 'Suspend'}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}

                          {/* Delete (blocked for Super Admin) */}
                          {!isSuper && (
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  userId: u.id,
                                  userName: u.name || 'User',
                                  userEmail: u.email,
                                })
                              }
                              className="inline-flex items-center p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Showing {users.length} of {pagination.total} users (Page {pagination.page} of {pagination.totalPages})
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {editOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit User Profile</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {editForm.id}</p>
              </div>
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
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Platform Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="owner">Business Owner</option>
                    <option value="staff">Store Staff</option>
                    <option value="admin">Platform Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
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
                  value={editForm.businessId || ''}
                  onChange={(e) => setEditForm({ ...editForm, businessId: e.target.value })}
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
                  placeholder="e.g., Updated staff profile and permissions."
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

      {/* Suspension / Reactivation Modal */}
      <AdminConfirmModal
        isOpen={statusModal.isOpen}
        title={statusModal.action === 'suspend' ? `Suspend User: ${statusModal.userName}` : `Reactivate User: ${statusModal.userName}`}
        description={
          statusModal.action === 'suspend'
            ? 'Suspending this user account revokes active sessions immediately.'
            : 'Reactivating this user account restores login access.'
        }
        confirmText={statusModal.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
        variant={statusModal.action === 'suspend' ? 'danger' : 'primary'}
        requireReason={true}
        onConfirm={handleConfirmStatusChange}
        onClose={() => setStatusModal({ isOpen: false, userId: '', userName: '', action: 'suspend' })}
      />

      {/* Delete User Modal */}
      <AdminConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Permanently Delete User: ${deleteModal.userName}`}
        description={`WARNING: Deleting account (${deleteModal.userEmail}) permanently removes their credentials and active sessions. If they own any business, the business ownership link will be unlinked.`}
        confirmText="Permanently Delete User"
        variant="danger"
        requireReason={true}
        onConfirm={handleDeleteUser}
        onClose={() => setDeleteModal({ isOpen: false, userId: '', userName: '', userEmail: '' })}
      />
    </div>
  );
}
