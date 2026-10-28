'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Filter,
  Trash2,
  Eye,
  X as CloseIcon,
  ShoppingBag,
  Ticket
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';

interface NotificationItem {
  id: string;
  businessId?: string;
  userId?: string;
  type?: string;
  title: string;
  message: string;
  orderId?: string;
  tokenNumber?: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export default function AdminNotificationsPage() {
  const { refreshAdmin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detail Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // Clear All Read Confirm Modal
  const [clearReadModalOpen, setClearReadModalOpen] = useState(false);

  // Delete Single Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<NotificationItem | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/notifications?unread=${unreadOnly}`);
      const data = await res.json();
      if (data.success) {
        // Normalize isRead from either isRead or read property
        const normalized = (data.notifications || []).map((n: any) => ({
          ...n,
          isRead: n.isRead === true || n.read === true,
        }));
        setNotifications(normalized);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setMarkingId(id);
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        refreshAdmin();
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        refreshAdmin();
        setStatusMessage({ type: 'success', text: 'All platform notifications marked as read.' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
      setStatusMessage({ type: 'error', text: 'Failed to mark all as read.' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteSingle = (n: NotificationItem) => {
    setNotificationToDelete(n);
    setDeleteModalOpen(true);
  };

  const handleDeleteSingle = async () => {
    if (!notificationToDelete) return;
    try {
      setDeletingId(notificationToDelete.id);
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notificationToDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete.id));
        setDeleteModalOpen(false);
        setNotificationToDelete(null);
        refreshAdmin();
        setStatusMessage({ type: 'success', text: 'Notification permanently dismissed.' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      setStatusMessage({ type: 'error', text: 'Failed to delete notification.' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllRead = async () => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearRead: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        setClearReadModalOpen(false);
        refreshAdmin();
        setStatusMessage({ type: 'success', text: 'All read notifications cleared.' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
      setStatusMessage({ type: 'error', text: 'Failed to clear read notifications.' });
    } finally {
      setActionLoading(false);
    }
  };

  const openViewModal = (n: NotificationItem) => {
    setSelectedNotification(n);
    setViewModalOpen(true);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const readCount = notifications.filter((n) => n.isRead).length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Platform Notifications & Alerts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time notifications for payment settlements, tenant account updates, and system-level alerts.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" /> Mark All Read
            </button>
          )}

          {readCount > 0 && (
            <button
              onClick={() => setClearReadModalOpen(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition shadow-xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Read ({readCount})
            </button>
          )}

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition shadow-xs">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-slate-900 focus:ring-slate-900"
            />
            <span>Unread Only</span>
          </label>

          <button
            onClick={fetchNotifications}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-xs"
            title="Refresh Notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
            Loading notifications from database...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No {unreadOnly ? 'unread ' : ''}notifications at this time.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 transition ${
                !n.isRead ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </h3>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 break-words">{n.message}</p>
                  
                  <div className="flex items-center flex-wrap gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                    {n.orderId && (
                      <span className="inline-flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        <ShoppingBag className="w-3 h-3" /> {n.orderId}
                      </span>
                    )}
                    {n.tokenNumber && (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <Ticket className="w-3 h-3" /> Token #{n.tokenNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openViewModal(n)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition"
                  title="Inspect Notification Details"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {!n.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    disabled={markingId === n.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
                    title="Mark as Read"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">Mark Read</span>
                  </button>
                )}

                <button
                  onClick={() => confirmDeleteSingle(n)}
                  disabled={deletingId === n.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                  title="Dismiss / Delete Notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inspect Notification Modal */}
      {viewModalOpen && selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  {getIcon(selectedNotification.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Notification Payload
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedNotification.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Title:</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedNotification.title}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Message Body:</span>
                <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1">
                  {selectedNotification.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 font-medium block">Status:</span>
                  <span className={`inline-flex items-center gap-1 font-semibold mt-0.5 ${selectedNotification.isRead ? 'text-slate-600' : 'text-blue-600'}`}>
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block">Timestamp:</span>
                  <span className="text-slate-700 mt-0.5 block font-mono">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>

                {selectedNotification.orderId && (
                  <div>
                    <span className="text-slate-400 font-medium block">Referenced Order:</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {selectedNotification.orderId}
                    </span>
                  </div>
                )}

                {selectedNotification.tokenNumber && (
                  <div>
                    <span className="text-slate-400 font-medium block">Queue Token:</span>
                    <span className="font-mono font-bold text-amber-700 mt-0.5 block">
                      #{selectedNotification.tokenNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              {!selectedNotification.isRead && (
                <button
                  onClick={() => {
                    handleMarkAsRead(selectedNotification.id);
                    setSelectedNotification((prev) => prev ? { ...prev, isRead: true } : null);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Mark as Read
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Notification Modal */}
      <AdminConfirmModal
        isOpen={deleteModalOpen}
        title="Dismiss Platform Notification"
        description={`Are you sure you want to dismiss and delete notification "${notificationToDelete?.title}"? This action removes it permanently from the database.`}
        confirmText="Dismiss Notification"
        variant="danger"
        requireReason={false}
        onConfirm={async () => {
          await handleDeleteSingle();
        }}
        onClose={() => {
          setDeleteModalOpen(false);
          setNotificationToDelete(null);
        }}
      />

      {/* Clear All Read Confirm Modal */}
      <AdminConfirmModal
        isOpen={clearReadModalOpen}
        title="Clear All Read Notifications"
        description={`This will permanently remove all ${readCount} read notifications from PostgreSQL. Unread notifications will be preserved.`}
        confirmText="Clear Read Notifications"
        variant="danger"
        requireReason={false}
        onConfirm={async () => {
          await handleClearAllRead();
        }}
        onClose={() => setClearReadModalOpen(false)}
      />
    </div>
  );
}
