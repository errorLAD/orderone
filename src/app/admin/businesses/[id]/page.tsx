'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Store,
  UtensilsCrossed,
  CreditCard,
  Receipt,
  Package,
  Layers,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface EditBusinessForm {
  name: string;
  slug: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  isStoreOpen: boolean;
  onlineOrderingEnabled: boolean;
}

export default function AdminBusinessDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status toggle
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'suspend' | 'reactivate'>('suspend');

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditBusinessForm | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/businesses/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Business record not found');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const handleStatusChange = async (reason: string) => {
    const res = await fetch(`/api/admin/businesses/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: pendingAction === 'suspend' ? 'suspended' : 'active',
        reason,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update business status');
    }
    await fetchDetail();
  };

  const openEditModal = () => {
    if (!data?.business) return;
    const b = data.business;
    setEditForm({
      name: b.name || '',
      slug: b.slug || '',
      type: b.type || 'retail',
      email: b.email || '',
      phone: b.phone || '',
      address: b.address || '',
      isStoreOpen: b.isStoreOpen !== false,
      onlineOrderingEnabled: b.onlineOrderingEnabled !== false,
    });
    setEditReason('');
    setEditError(null);
    setEditOpen(true);
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

      const res = await fetch(`/api/admin/businesses/${params.id}`, {
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update business details');
      }

      setEditOpen(false);
      await fetchDetail();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteBusiness = async (reason: string) => {
    const res = await fetch(`/api/admin/businesses/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete business');
    }

    router.push('/admin/businesses');
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
        Loading complete business dossier from database...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900">{error || 'Business record not found'}</h2>
        <Link href="/admin/businesses" className="inline-block text-xs font-bold text-indigo-600 hover:underline">
          ← Return to Businesses Directory
        </Link>
      </div>
    );
  }

  const { business } = data;
  const productData = data.products;
  const categoryData = data.categories;
  const products = Array.isArray(productData) ? productData : (productData?.list ?? []);
  const productCount = Array.isArray(productData) ? productData.length : (productData?.total ?? products.length);
  const categories = Array.isArray(categoryData) ? categoryData : (categoryData?.list ?? []);
  const categoryCount = Array.isArray(categoryData) ? categoryData.length : (categoryData?.total ?? categories.length);
  const orderData = data.orders;
  const orders = Array.isArray(orderData)
    ? orderData
    : [...(orderData?.storeOrders ?? []), ...(orderData?.menuOrders ?? [])];
  const payments = Array.isArray(data.payments) ? data.payments : [];
  const isSuspended = business.subscription?.status === 'suspended';
  const plan = business.subscription?.planId?.replace('plan_', '') || 'basic';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/businesses"
            className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            title="Back to Businesses"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{business.name}</h1>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                  isSuspended ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                )}
              >
                {isSuspended ? 'Suspended' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Category: <span className="font-semibold text-slate-700 capitalize">{business.type}</span> • Registered: {formatDate(business.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit, Suspend/Reactivate, Delete */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Edit Button */}
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <Edit className="w-3.5 h-3.5 text-indigo-600" />
            <span>Edit Profile</span>
          </button>

          {/* Suspend / Reactivate */}
          <button
            onClick={() => {
              setPendingAction(isSuspended ? 'reactivate' : 'suspend');
              setIsConfirmOpen(true);
            }}
            className={cn(
              'px-3.5 py-2 text-xs font-bold rounded-xl shadow-2xs transition-colors',
              isSuspended
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            )}
          >
            {isSuspended ? 'Reactivate Account' : 'Suspend Account'}
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Profile, Products & Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Profile Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Business Profile</h2>
              <button
                onClick={openEditModal}
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Public Storefront Slug:</span>
                <span className="font-mono font-bold text-slate-900">{business.slug}</span>
                <div className="mt-1 flex items-center gap-2">
                  <a
                    href={`/store/${business.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
                  >
                    <span>Store Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`/menu/${business.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-600 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
                  >
                    <span>Menu Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Owner Contact:</span>
                <span className="font-bold text-slate-900">{business.ownerName || 'Merchant'}</span>
                <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  <span>{business.ownerEmail || business.email}</span>
                </div>
                <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{business.phone}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Physical Address:</span>
                <span className="text-slate-800">{business.address || 'No physical address configured'}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Store Status:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${business.isStoreOpen !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {business.isStoreOpen !== false ? 'Open for Orders' : 'Store Closed'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${business.onlineOrderingEnabled !== false ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {business.onlineOrderingEnabled !== false ? 'Ordering Enabled' : 'Ordering Paused'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders Section (Separated Store vs Menu) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Recent Orders ({orders.length})
              </h2>
              <span className="text-[11px] text-slate-400">Strictly Isolated Channels</span>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No orders placed at this business yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.slice(0, 8).map((ord: any) => (
                  <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span className="font-mono">#{ord.tokenNumber || ord.id.slice(0, 6)}</span>
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded text-[10px] font-bold uppercase',
                            ord.sourceType === 'menu'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          {ord.sourceType === 'menu' ? 'Menu Order' : 'Store Order'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Customer: {ord.customer?.name || 'Walk-in'} • {formatDate(ord.createdAt)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatINR(ord.total)}</div>
                      <span className="capitalize text-[11px] text-slate-500 font-semibold">
                        {ord.orderStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subscription & Payments */}
        <div className="space-y-6">
          {/* Subscription Entitlements Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Subscription & Quota</h2>

            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 capitalize">{plan} Plan</span>
                <span className="text-xs font-bold text-indigo-600">
                  {formatINR(business.subscription?.amount || (plan === 'gold' ? 149 : 49))}/mo
                </span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Status: <strong className="uppercase">{business.subscription?.status || 'Active'}</strong>
              </p>
              <p className="text-[10px] text-indigo-500">
                Renews: {business.subscription?.renewsAt ? formatDate(business.subscription.renewsAt) : 'Never'}
              </p>
            </div>

            <div className="space-y-3 text-xs pt-2">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600">Product / Item Quota</span>
                  <span className="text-slate-900">{productCount} / {plan === 'gold' ? 50 : 20}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, (productCount / (plan === 'gold' ? 50 : 20)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600">Category Quota</span>
                  <span className="text-slate-900">{categoryCount} / {plan === 'gold' ? 30 : 10}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: `${Math.min(100, (categoryCount / (plan === 'gold' ? 30 : 10)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Transactions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Payments Ledger</h2>

            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No payment transactions recorded.</p>
              ) : (
                payments.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{formatINR(p.amount)}</span>
                      <span className="text-[10px] uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {p.razorpayPaymentId || p.paymentReference || p.id}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDate(p.createdAt)} • {p.paymentProvider || 'Razorpay'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Business Profile</h3>
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

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.isStoreOpen}
                    onChange={(e) => setEditForm({ ...editForm, isStoreOpen: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Store Open for Orders</span>
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

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specify documented reason for modifying this business..."
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
        isOpen={isConfirmOpen}
        title={pendingAction === 'suspend' ? `Suspend Account: ${business.name}` : `Reactivate Account: ${business.name}`}
        description={
          pendingAction === 'suspend'
            ? 'Suspension immediately restricts public storefront ordering. Catalog and order history remain intact.'
            : 'Reactivation restores public storefront and ordering access.'
        }
        confirmText={pendingAction === 'suspend' ? 'Confirm Suspension' : 'Confirm Reactivation'}
        variant={pendingAction === 'suspend' ? 'danger' : 'primary'}
        requireReason={true}
        onConfirm={handleStatusChange}
        onClose={() => setIsConfirmOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteOpen}
        title={`Permanently Delete Business: ${business.name}`}
        description="WARNING: Deleting this business permanently removes products, categories, orders, and unlinks connected staff. Active unfulfilled orders will prevent deletion."
        confirmText="Permanently Delete Business"
        variant="danger"
        requireReason={true}
        onConfirm={handleDeleteBusiness}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
