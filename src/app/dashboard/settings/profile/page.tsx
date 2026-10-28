'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Store,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { BUSINESS_CATEGORIES, getCategoryConfig, BusinessCategoryConfig } from '@/lib/categories';
import { BusinessType } from '@/types';
import Link from 'next/link';

export default function BusinessProfilePage() {
  const { currentBusiness, setCurrentBusiness, refreshBusinesses, currentUser } = useApp();

  // Form State
  const [businessName, setBusinessName] = useState<string>('');
  const [ownerName, setOwnerName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<BusinessType>('hardware');

  // Logo State
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isRemovingLogo, setIsRemovingLogo] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category Confirmation Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [pendingCategory, setPendingCategory] = useState<BusinessType | null>(null);

  // Status & Feedback
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize from active business
  const resetFormToCurrentBusiness = () => {
    if (currentBusiness) {
      setBusinessName(currentBusiness.name || '');
      setOwnerName(currentBusiness.ownerName || currentUser?.name || '');
      setEmail(currentBusiness.email || '');
      setPhone(currentBusiness.phone || '');
      setAddress(currentBusiness.address || '');
      setDescription(currentBusiness.description || '');
      setCategory(currentBusiness.type || 'hardware');
      setCurrentLogoUrl(currentBusiness.logoUrl || '');
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setIsRemovingLogo(false);
      setValidationErrors({});
    }
  };

  useEffect(() => {
    resetFormToCurrentBusiness();
  }, [currentBusiness]);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  // Handle Logo File Selection
  const handleLogoFileSelect = (file: File) => {
    // Validate format
    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      setFeedback({
        type: 'error',
        message: 'Unsupported image format. Please upload a PNG, JPG, or WebP logo file.',
      });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'File size exceeds 5MB limit. Please upload an image under 5MB.',
      });
      return;
    }

    // Revoke previous blob if any
    if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedLogoFile(file);
    setLogoPreviewUrl(preview);
    setIsRemovingLogo(false);
    setIsEditing(true);
    setFeedback(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl && logoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setSelectedLogoFile(null);
    setLogoPreviewUrl(null);
    setIsRemovingLogo(true);
    setIsEditing(true);
  };

  const handleCategorySelectChange = (newCat: BusinessType) => {
    if (newCat === category) return;
    setPendingCategory(newCat);
    setIsCategoryModalOpen(true);
  };

  const handleConfirmCategoryChange = () => {
    if (pendingCategory) {
      setCategory(pendingCategory);
      setIsCategoryModalOpen(false);
      setPendingCategory(null);
      setIsEditing(true);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!businessName.trim()) {
      errors.businessName = 'Business/Store name is required';
    } else if (businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters';
    }

    if (!ownerName.trim()) {
      errors.ownerName = 'Owner name is required';
    }

    if (!email.trim()) {
      errors.email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      errors.phone = 'Mobile/WhatsApp number is required';
    } else if (phone.trim().replace(/\D/g, '').length < 8) {
      errors.phone = 'Please enter a valid phone number (at least 8 digits)';
    }

    if (!address.trim()) {
      errors.address = 'Business address is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCancel = () => {
    resetFormToCurrentBusiness();
    setIsEditing(false);
    setFeedback(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    if (!validateForm()) {
      setFeedback({
        type: 'error',
        message: 'Please review and fix the highlighted form validation errors.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      let finalLogoUrl = currentLogoUrl;

      // 1. Upload new logo to Supabase Storage if a new file was chosen
      if (selectedLogoFile) {
        setIsUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', selectedLogoFile);
        formData.append('folder', 'logos');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Failed to upload logo to storage');
        }

        finalLogoUrl = uploadData.url;
        setIsUploadingLogo(false);
      } else if (isRemovingLogo) {
        finalLogoUrl = '';
      }

      // 2. Prepare payload for updating business
      const catConfig = getCategoryConfig(category);
      const isFood = catConfig.primaryModule === 'menu';

      // Update modules appropriately if category changed
      const modules = {
        store: !isFood,
        menu: isFood,
      };

      const payload = {
        id: currentBusiness.id,
        name: businessName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        description: description.trim(),
        type: category,
        logoUrl: finalLogoUrl || null,
        settings: {
          ...currentBusiness.settings,
          modules: category !== currentBusiness.type ? modules : currentBusiness.settings.modules,
          ownerName: ownerName.trim(),
        },
      };

      // 3. Persist to Supabase via PATCH /api/businesses
      const res = await fetch('/api/businesses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save business profile to Supabase');
      }

      const updatedBiz = data.business;
      setCurrentBusiness(updatedBiz);
      setCurrentLogoUrl(finalLogoUrl);
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setIsRemovingLogo(false);
      setIsEditing(false);

      // Refresh global context
      await refreshBusinesses();

      setFeedback({
        type: 'success',
        message: 'Business profile and logo updated successfully across your dashboard and storefront!',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Error saving business profile:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'An error occurred while saving your profile. Please try again.',
      });
    } finally {
      setSaving(false);
      setIsUploadingLogo(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Loading business profile...</p>
      </div>
    );
  }

  const activeLogoToDisplay = isRemovingLogo
    ? null
    : logoPreviewUrl || currentLogoUrl || null;

  const currentCatConfig = getCategoryConfig(category);
  const pendingCatConfig = pendingCategory ? getCategoryConfig(pendingCategory) : null;
  const storefrontUrl = category.includes('restaurant') || category.includes('cafe') || category.includes('bakery') || category.includes('juice') || category.includes('hotel')
    ? `/menu/${currentBusiness.slug}`
    : `/store/${currentBusiness.slug}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Business Profile</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Identity & Branding
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your store name, logo, contact details, and category. Changes update live across the dashboard and storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={storefrontUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-all"
          >
            <span>Preview Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-fadeIn',
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Logo & Storefront Branding */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">Store Logo & Brand Icon</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your official brand logo. Displayed on public storefront, receipt tokens, and TV display.
              </p>
            </div>
            {activeLogoToDisplay && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Custom Logo Active
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Logo Preview Tile */}
            <div className="relative group shrink-0">
              <div className="w-32 h-32 rounded-2xl border-2 border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-inner relative">
                {activeLogoToDisplay ? (
                  <img
                    src={activeLogoToDisplay}
                    alt={businessName || 'Business Logo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-xl font-black shadow-md mb-1.5">
                      {businessName ? businessName.slice(0, 2).toUpperCase() : 'BIZ'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Default Icon
                    </span>
                  </div>
                )}
              </div>

              {selectedLogoFile && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded-full shadow-xs uppercase">
                  Pending Save
                </span>
              )}
            </div>

            {/* Logo Upload Zone & Actions */}
            <div className="flex-1 w-full space-y-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                    : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleLogoFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center">
                  <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    <span className="text-indigo-600 underline">Click to upload</span> or drag and drop logo here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PNG, JPG, WEBP or GIF (Max file size: 5MB)
                  </p>
                </div>
              </div>

              {/* Action Buttons for Logo */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{activeLogoToDisplay ? 'Replace Logo' : 'Choose Logo File'}</span>
                </button>

                {activeLogoToDisplay && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Remove Logo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Store Identity & Category */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900">Business Identity & Category</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Core brand naming and your commercial industry categorization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business / Store Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    setIsEditing(true);
                  }}
                  disabled={!isEditing}
                  placeholder="e.g. Sri Ram Krishna Traders"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                    validationErrors.businessName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                />
              </div>
              {validationErrors.businessName && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.businessName}</p>
              )}
            </div>

            {/* Business Category with Explicit Confirmation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Category <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategorySelectChange(e.target.value as BusinessType)}
                  disabled={!isEditing}
                  className={cn(
                    'w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium appearance-none transition-all',
                    'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label} ({cat.primaryModule === 'store' ? 'Store Module' : 'Menu Module'})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Current: <span className="font-bold text-slate-600">{currentCatConfig.icon} {currentCatConfig.label}</span>. Changing category requires confirmation.
              </p>
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Short Business Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsEditing(true);
              }}
              disabled={!isEditing}
              placeholder="e.g. Authorized dealer for UltraTech Cement, Tata Tiscon steel, and CPVC plumbing fittings in Darbhanga."
              className={cn(
                'w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                'border-slate-200 bg-white',
                !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
              )}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Displayed as subtitle on your public storefront and search results.
            </p>
          </div>
        </div>

        {/* Section 3: Owner & Contact Information */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900">Owner & Contact Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Contact channels for customer orders, notifications, and invoicing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Owner Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Owner / Authorized Person Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    setIsEditing(true);
                  }}
                  disabled={!isEditing}
                  placeholder="e.g. Krishna Kumar"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                    validationErrors.ownerName ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                />
              </div>
              {validationErrors.ownerName && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.ownerName}</p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEditing(true);
                  }}
                  disabled={!isEditing}
                  placeholder="e.g. krishna1@gmail.com"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                    validationErrors.email ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile / WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsEditing(true);
                  }}
                  disabled={!isEditing}
                  placeholder="e.g. 7004689858"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                    validationErrors.phone ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                />
              </div>
              {validationErrors.phone && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.phone}</p>
              )}
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Physical Business Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setIsEditing(true);
                  }}
                  disabled={!isEditing}
                  placeholder="e.g. Chowk, Gangwara, Chandan Patti, Darbhanga, Bihar"
                  className={cn(
                    'w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all',
                    validationErrors.address ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white',
                    !isEditing && 'bg-slate-50 text-slate-600 cursor-not-allowed'
                  )}
                />
              </div>
              {validationErrors.address && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Action Buttons Bar */}
        {isEditing && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 animate-fadeIn">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              You have unsaved business profile changes.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isUploadingLogo ? 'Uploading Logo...' : 'Saving to Supabase...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Explicit Category Change Confirmation Modal */}
      {isCategoryModalOpen && pendingCatConfig && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Change Business Category?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are changing your category from{' '}
                  <span className="font-bold text-slate-800">{currentCatConfig.label}</span> to{' '}
                  <span className="font-bold text-indigo-700">{pendingCatConfig.label}</span>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <p>
                <strong>What happens when you change:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
                <li>
                  Your dashboard navigation and primary operations will adapt to{' '}
                  <span className="font-semibold text-slate-800">{pendingCatConfig.shortLabel}</span> terminology.
                </li>
                <li>
                  Primary module will shift to{' '}
                  <span className="font-semibold text-slate-800">
                    {pendingCatConfig.primaryModule === 'store' ? 'Digital Store' : 'Digital Menu'}
                  </span>.
                </li>
                <li>
                  All your existing products, categories, orders, and subscriptions will remain safely preserved in Supabase.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setPendingCategory(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCategoryChange}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Confirm Category Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
