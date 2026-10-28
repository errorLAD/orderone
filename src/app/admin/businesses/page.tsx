'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Store,
  UtensilsCrossed,
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle2
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface EditBusinessForm {
  id: string;
  name: string;
  slug: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  isStoreOpen: boolean;
  onlineOrderingEnabled: boolean;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [planId, setPlanId] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Status modal state
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    businessId: string;
    businessName: string;
    action: 'suspend' | 'reactivate';
  }>({
    isOpen: false,
    businessId: '',
    businessName: '',
    action: 'suspend',
  });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditBusinessForm | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    businessId: string;
    businessName: string;
  }>({
    isOpen: false,
    businessId: '',
    businessName: '',
  });

  const fetchBusinesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'all') params.set('category', category);
      if (planId !== 'all') params.set('planId', planId);
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`/api/admin/businesses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.businesses);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to load business records');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page, category, planId, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBusinesses();
  };

  const handleConfirmStatusChange = async (reason: string) => {
    const res = await fetch('/api/admin/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: statusModal.businessId,
        status: statusModal.action === 'suspend' ? 'suspended' : 'active',
        reason,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to update business account status');
    }

    await fetchBusinesses();
  };

  const openEditModal = (biz: any) => {
    setEditForm({
      id: biz.id,
      name: biz.name || '',
      slug: biz.slug || '',
      type: biz.type || 'retail',
      email: biz.email || '',
      phone: biz.phone || '',
      address: biz.address || '',
      isStoreOpen: biz.isStoreOpen !== false,
      onlineOrderingEnabled: biz.onlineOrderingEnabled !== false,
    });
    setEditReason('');
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editReason.trim() || editReason.trim().length < 3) {
      setEditError('Please provide a documented reason for this modification.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const res = await fetch(`/api/admin/businesses/${editForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          updates: {
            name: editForm.name.trim(),
            slug: editForm.slug.trim(),
            type: editForm.type,
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
            address: editForm.address.trim(),
            isStoreOpen: editForm.isStoreOpen,
            onlineOrderingEnabled: editForm.onlineOrderingEnabled,
          },
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update business details');
      }

      setEditModalOpen(false);
      await fetchBusinesses();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteBusiness = async (reason: string) => {
    const res = await fetch(`/api/admin/businesses/${deleteModal.businessId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete business');
    }

    await fetchBusinesses();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Business Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full management access: View, Edit profile, suspend or delete tenant businesses with immutable audit logs.
          </p>
        </div>

        <button
          onClick={fetchBusinesses}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-indigo-600')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by store name, slug, phone or owner email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Categories</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe & Coffee</option>
              <option value="bakery">Bakery</option>
              <option value="grocery">Grocery & Kirana</option>
              <option value="retail">Retail Shop</option>
              <option value="hardware">Hardware & Materials</option>
            </select>

            <select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Plans</option>
              <option value="plan_basic">Basic (₹49/mo)</option>
              <option value="plan_gold">Gold (₹149/mo)</option>
              <option value="plan_diamond">Diamond (₹249/mo)</option>
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

      {/* Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading && businesses.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
            Loading business directory...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No business accounts match the selected filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Business & Slug</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Subscription Plan</th>
                    <th className="p-3.5">Catalog</th>
                    <th className="p-3.5">Orders (S/M)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businesses.map((biz) => {
                    const isSuspended = biz.subscription?.status === 'suspended';
                    const plan = biz.subscription?.planId?.replace('plan_', '') || 'basic';

                    return (
                      <tr key={biz.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <Link href={`/admin/businesses/${biz.id}`} className="hover:underline">
                              {biz.name}
                            </Link>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            /{biz.slug} • {biz.phone}
                          </div>
                          <div className="text-[10px] text-slate-400">{biz.ownerEmail || biz.email}</div>
                        </td>

                        <td className="p-3.5">
                          <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {biz.type}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 capitalize">{plan} Plan</div>
                          <div className="text-[10px] text-slate-400">
                            Expires: {biz.subscription?.renewsAt ? formatDate(biz.subscription.renewsAt) : 'Active'}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          <div>{biz.productCount || 0} items</div>
                          <div className="text-[10px] text-slate-400">{biz.categoryCount || 0} categories</div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px]">
                          <div>Store: {biz.storeOrderCount || 0}</div>
                          <div className="text-[10px] text-slate-400">Menu: {biz.menuOrderCount || 0}</div>
                        </td>

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
                            href={`/admin/businesses/${biz.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs"
                            title="View Dossier"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>View</span>
                          </Link>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(biz)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs"
                            title="Edit Details"
                          >
                            <Edit className="w-3 h-3 text-indigo-600" />
                            <span>Edit</span>
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() =>
                              setStatusModal({
                                isOpen: true,
                                businessId: biz.id,
                                businessName: biz.name,
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

                          {/* Delete */}
                          <button
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                businessId: biz.id,
                                businessName: biz.name,
                              })
                            }
                            className="inline-flex items-center p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                            title="Delete Business"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                  Showing {businesses.length} of {pagination.total} businesses (Page {pagination.page} of {pagination.totalPages})
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

      {/* Edit Business Modal */}
      {editModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Business Profile</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {editForm.id}</p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Slug</label>
                  <input
                    type="text"
                    required
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe & Coffee</option>
                    <option value="bakery">Bakery</option>
                    <option value="grocery">Grocery & Kirana</option>
                    <option value="retail">Retail Shop</option>
                    <option value="hardware">Hardware & Materials</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.isStoreOpen}
                    onChange={(e) => setEditForm({ ...editForm, isStoreOpen: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Store Open for Business</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.onlineOrderingEnabled}
                    onChange={(e) => setEditForm({ ...editForm, onlineOrderingEnabled: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Online Ordering Active</span>
                </label>
              </div>

              {/* Required reason */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Updated contact phone hotline and store slug per merchant request."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
        title={statusModal.action === 'suspend' ? `Suspend Business: ${statusModal.businessName}` : `Reactivate Business: ${statusModal.businessName}`}
        description={
          statusModal.action === 'suspend'
            ? 'Suspension immediately restricts public storefront ordering. Business catalog and records remain safe.'
            : 'Reactivation restores public storefront and ordering access according to the current plan.'
        }
        confirmText={statusModal.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
        variant={statusModal.action === 'suspend' ? 'danger' : 'primary'}
        requireReason={true}
        onConfirm={handleConfirmStatusChange}
        onClose={() => setStatusModal({ isOpen: false, businessId: '', businessName: '', action: 'suspend' })}
      />

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteModal.isOpen}
        title={`Permanently Delete Business: ${deleteModal.businessName}`}
        description="WARNING: This permanently removes this business, its products, categories, orders, and unlinks all merchant staff. Dependency check will block deletion if any active unfulfilled orders exist."
        confirmText="Permanently Delete Business"
        variant="danger"
        requireReason={true}
        reasonPlaceholder="Specify mandatory justification for business deletion..."
        onConfirm={handleDeleteBusiness}
        onClose={() => setDeleteModal({ isOpen: false, businessId: '', businessName: '' })}
      />
    </div>
  );
}
