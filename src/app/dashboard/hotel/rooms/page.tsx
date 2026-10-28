'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BedDouble,
  Plus,
  QrCode,
  Edit2,
  Trash2,
  Search,
  Filter,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Printer,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Building,
  AlertCircle,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { HotelRoom } from '@/types';

export default function HotelRoomsPage() {
  const { currentBusiness } = useApp();
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [floorFilter, setFloorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [activeQrRoom, setActiveQrRoom] = useState<HotelRoom | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Single room form state
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [roomType, setRoomType] = useState('Standard');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bulk generator state
  const [bulkStart, setBulkStart] = useState('101');
  const [bulkEnd, setBulkEnd] = useState('110');
  const [bulkFloor, setBulkFloor] = useState('1');
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkRoomType, setBulkRoomType] = useState('Deluxe');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://orderone.in';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchRooms = async () => {
    if (!currentBusiness?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/hotel/rooms?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      }
    } catch (e) {
      console.error('Failed to load hotel rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [currentBusiness?.id]);

  // Generate QR code data URL whenever activeQrRoom changes
  useEffect(() => {
    if (activeQrRoom && currentBusiness?.slug) {
      const roomUrl = `${baseUrl}/menu/${currentBusiness.slug}?room=${encodeURIComponent(activeQrRoom.roomNumber)}`;
      QRCode.toDataURL(roomUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [activeQrRoom, currentBusiness?.slug, baseUrl]);

  // Computed room stats
  const stats = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.isActive).length;
    const inactive = total - active;
    const floors = Array.from(new Set(rooms.map((r) => r.floor).filter(Boolean))) as string[];
    floors.sort();
    return { total, active, inactive, floors };
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch =
        searchQuery === '' ||
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.roomType && room.roomType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (room.floor && room.floor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFloor = floorFilter === 'ALL' || room.floor === floorFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && room.isActive) ||
        (statusFilter === 'INACTIVE' && !room.isActive);

      return matchesSearch && matchesFloor && matchesStatus;
    });
  }, [rooms, searchQuery, floorFilter, statusFilter]);

  // Toggle active status
  const handleToggleActive = async (room: HotelRoom) => {
    const updatedStatus = !room.isActive;
    // Optimistic update
    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, isActive: updatedStatus } : r))
    );

    try {
      const res = await fetch('/api/hotel/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: room.id, isActive: updatedStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        // Rollback
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, isActive: !updatedStatus } : r))
        );
        showToast(data.error || 'Failed to update room');
      } else {
        showToast(`Room ${room.roomNumber} set to ${updatedStatus ? 'Active' : 'Inactive'}`);
      }
    } catch (e: any) {
      showToast('Network error while updating room');
      fetchRooms();
    }
  };

  // Open add modal
  const openAddModal = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setFloor(stats.floors[0] || '1');
    setRoomType('Standard');
    setNotes('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (room: HotelRoom) => {
    setEditingRoom(room);
    setRoomNumber(room.roomNumber);
    setFloor(room.floor || '');
    setRoomType(room.roomType || 'Standard');
    setNotes(room.notes || '');
    setIsActive(room.isActive);
    setIsAddModalOpen(true);
  };

  // Save room (add or edit)
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !currentBusiness?.id) return;
    setSubmitting(true);

    try {
      if (editingRoom) {
        const res = await fetch('/api/hotel/rooms', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRoom.id,
            roomNumber: roomNumber.trim(),
            floor: floor.trim() || undefined,
            roomType: roomType.trim() || undefined,
            notes: notes.trim() || undefined,
            isActive,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Failed to update room');
        } else {
          showToast(`Room ${roomNumber} updated successfully`);
          setIsAddModalOpen(false);
          fetchRooms();
        }
      } else {
        const res = await fetch('/api/hotel/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusiness.id,
            roomNumber: roomNumber.trim(),
            floor: floor.trim() || undefined,
            roomType: roomType.trim() || undefined,
            notes: notes.trim() || undefined,
            isActive,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          alert(data.error || 'Failed to create room');
        } else {
          showToast(`Room ${roomNumber} created successfully`);
          setIsAddModalOpen(false);
          fetchRooms();
        }
      }
    } catch (err: any) {
      alert('Error saving room. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk generate rooms
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness?.id) return;
    setBulkSubmitting(true);

    try {
      const res = await fetch('/api/hotel/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          bulkRange: {
            start: bulkStart,
            end: bulkEnd,
            floor: bulkFloor,
            prefix: bulkPrefix,
            roomType: bulkRoomType,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to generate bulk rooms');
      } else {
        showToast(data.message || 'Rooms generated successfully');
        setIsBulkModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      alert('Error creating rooms. Please try again.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Delete room
  const handleDeleteRoom = async (room: HotelRoom) => {
    if (!confirm(`Are you sure you want to delete Room ${room.roomNumber}? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/hotel/rooms?id=${room.id}&businessId=${currentBusiness?.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Room ${room.roomNumber} deleted`);
        fetchRooms();
      } else {
        alert(data.error || 'Failed to delete room');
      }
    } catch (e) {
      alert('Network error while deleting room');
    }
  };

  const handleCopyRoomUrl = (r: HotelRoom) => {
    if (!currentBusiness?.slug) return;
    const url = `${baseUrl}/menu/${currentBusiness.slug}?room=${encodeURIComponent(r.roomNumber)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast(`Ordering link for Room ${r.roomNumber} copied!`);
  };

  const handleDownloadQrPng = () => {
    if (!qrCodeDataUrl || !activeQrRoom) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `room_${activeQrRoom.roomNumber}_qr_${currentBusiness?.slug || 'hotel'}.png`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                  <BedDouble className="w-6 h-6 text-white" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider bg-white/25 px-2.5 py-1 rounded-full text-white">
                  Hotel Room Operations
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Guest Rooms & In-Room Dining QR Codes
              </h1>
              <p className="mt-2 text-amber-100 max-w-2xl text-sm sm:text-base leading-relaxed">
                Add guest rooms, manage active occupancy, and print contactless room QR standees.
                Guests scan the standee to browse the food menu and order room service instantly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-medium text-sm rounded-xl backdrop-blur-md border border-white/25 transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                Bulk Room Generator
              </button>
              <button
                onClick={openAddModal}
                className="px-5 py-2.5 bg-white text-amber-800 hover:bg-amber-50 font-semibold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 hover:shadow-lg"
              >
                <Plus className="w-4 h-4 text-amber-800" />
                Add Room
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Rooms</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active for Ordering</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deactivated</p>
            <p className="text-2xl font-bold text-slate-700 mt-0.5">{stats.inactive}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Floors</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {stats.floors.length || (rooms.length > 0 ? 1 : 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by room #, type, or floor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {stats.floors.length > 0 && (
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="ALL">All Floors</option>
              {stats.floors.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({rooms.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({stats.inactive})
            </button>
          </div>
        </div>

        <button
          onClick={fetchRooms}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title="Refresh rooms"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">Loading hotel rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 border border-amber-100">
            <BedDouble className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {rooms.length === 0 ? 'No Guest Rooms Added Yet' : 'No Rooms Match Your Filter'}
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1.5">
            {rooms.length === 0
              ? 'Add your hotel rooms one-by-one or use the Bulk Generator to create all rooms in seconds.'
              : 'Try clearing your search query or switching floor/status filters.'}
          </p>
          {rooms.length === 0 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
              >
                Use Bulk Generator (e.g. 101–115)
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-xl transition-all"
              >
                Add Single Room
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const roomUrl = `${baseUrl}/menu/${currentBusiness?.slug}?room=${encodeURIComponent(
              room.roomNumber
            )}`;

            return (
              <div
                key={room.id}
                className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                  room.isActive
                    ? 'border-slate-200 hover:border-amber-300'
                    : 'border-slate-200/60 bg-slate-50/50 opacity-75'
                }`}
              >
                {/* Room Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                        🛏️
                      </span>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 leading-tight">
                          Room {room.roomNumber}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {room.floor ? `Floor ${room.floor}` : 'Ground'}
                          {room.roomType && ` • ${room.roomType}`}
                        </p>
                      </div>
                    </div>

                    {/* Active Toggle Switch */}
                    <button
                      onClick={() => handleToggleActive(room)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        room.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={room.isActive ? 'Room active for ordering (Click to deactivate)' : 'Room deactivated (Click to activate)'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          room.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {room.notes && (
                    <p className="text-xs text-slate-500 italic mt-2.5 line-clamp-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {room.notes}
                    </p>
                  )}
                </div>

                {/* Room Card Footer / Actions */}
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 rounded-b-xl flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    {/* View Room QR Standee */}
                    <button
                      onClick={() => setActiveQrRoom(room)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-amber-200/70"
                      title="View & Print Room QR Standee"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Room QR</span>
                    </button>

                    {/* Copy Link */}
                    <button
                      onClick={() => handleCopyRoomUrl(room)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                      title="Copy guest ordering URL"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Open in new tab */}
                    <a
                      href={roomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
                      title="Open guest room menu view"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => openEditModal(room)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
                      title="Edit room"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD / EDIT ROOM MODAL */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <BedDouble className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingRoom ? `Edit Room ${editingRoom.roomNumber}` : 'Add New Hotel Room'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Room Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 204, Suite-A"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Floor Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1, 2, Ground"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deluxe, Suite, Standard"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes (Staff only)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. East wing, near elevator, balcony view"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Active for Room Service</p>
                  <p className="text-xs text-slate-500">Guests can scan and order to this room</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BULK ROOM GENERATOR MODAL */}
      {/* ============================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Bulk Room Generator</h3>
                  <p className="text-xs text-amber-800">Generate multiple rooms in sequence instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkGenerate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Room Number *
                  </label>
                  <input
                    type="number"
                    required
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Room Number *
                  </label>
                  <input
                    type="number"
                    required
                    value={bulkEnd}
                    onChange={(e) => setBulkEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Floor Number
                  </label>
                  <input
                    type="text"
                    value={bulkFloor}
                    onChange={(e) => setBulkFloor(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Prefix (Optional)
                  </label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="e.g. R-"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room Type
                  </label>
                  <input
                    type="text"
                    value={bulkRoomType}
                    onChange={(e) => setBulkRoomType(e.target.value)}
                    placeholder="e.g. Deluxe"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Range Preview Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-1">Preview Generation:</p>
                <p className="text-xs text-slate-600">
                  Will create up to{' '}
                  <span className="font-bold text-amber-700">
                    {Math.max(0, parseInt(bulkEnd || '0') - parseInt(bulkStart || '0') + 1)}
                  </span>{' '}
                  rooms from{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {bulkPrefix}
                    {bulkStart}
                  </span>{' '}
                  to{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {bulkPrefix}
                    {bulkEnd}
                  </span>{' '}
                  on Floor {bulkFloor || 'N/A'}. Existing rooms will be safely preserved.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {bulkSubmitting ? 'Generating...' : 'Generate Rooms'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ROOM QR STANDEE PREVIEW & PRINT MODAL */}
      {/* ============================================================== */}
      {activeQrRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <QrCode className="w-4 h-4" />
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  In-Room QR Standee • Room {activeQrRoom.roomNumber}
                </span>
              </div>
              <button
                onClick={() => setActiveQrRoom(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Standee Card */}
            <div className="p-6 bg-slate-100 flex justify-center">
              <div
                id="printable-standee"
                className="w-full max-w-[320px] bg-white rounded-2xl p-6 text-center shadow-xl border-2 border-amber-600/30 flex flex-col items-center relative overflow-hidden"
              >
                {/* Standee Header */}
                <div className="w-full pb-3 border-b border-slate-100 mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    In-Room Dining
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-lg mt-2 leading-tight">
                    {currentBusiness?.name || 'Hotel Room Service'}
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">Contactless Guest Ordering</p>
                </div>

                {/* Big Room Badge */}
                <div className="my-1 py-1.5 px-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl shadow-xs">
                  <span className="text-xs uppercase font-medium tracking-wider">ROOM</span>
                  <p className="text-2xl font-black tracking-tight leading-none">
                    {activeQrRoom.roomNumber}
                  </p>
                </div>

                {/* QR Code */}
                <div className="my-3 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt={`Room ${activeQrRoom.roomNumber} QR Code`}
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-50">
                      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <p className="text-xs font-bold text-slate-800">
                  Point Camera at QR to View Menu
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fresh food prepared & delivered directly to your room
                </p>

                <div className="mt-3 pt-2.5 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span>Powered by</span>
                  <span className="font-bold text-slate-600">OrderOne.in</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyRoomUrl(activeQrRoom)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
                <Link
                  href={`/dashboard/qr-codes?type=room&room=${encodeURIComponent(activeQrRoom.roomNumber)}`}
                  className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5 border border-amber-300/80"
                  title="Open Acrylic Standee Designer for A5, 4x6, and A4 table stands"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Acrylic Standee Studio</span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadQrPng}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Raw QR
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Standee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
