'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Store,
  Check,
  X,
  Package,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  FolderPlus,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Category, Product, BusinessPlanUsage } from '@/types';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/categories';
import { StoreLockedPrompt } from '@/components/dashboard/StoreLockedPrompt';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';

export default function StoreCategoriesPage() {
  const { currentBusiness } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [planUsage, setPlanUsage] = useState<BusinessPlanUsage | null>(null);

  // Add Category form state
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatImageFile, setNewCatImageFile] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Category state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string>('');
  const [isUploadingEditImage, setIsUploadingEditImage] = useState<boolean>(false);
  const [editImageError, setEditImageError] = useState<string>('');
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Category state
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const catConfig = getCategoryConfig(currentBusiness?.type);

  const fetchData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`/api/categories?businessId=${currentBusiness.id}&sourceType=store`),
        fetch(`/api/products?businessId=${currentBusiness.id}&sourceType=store`),
      ]);
      const catData = await catRes.json();
      const prodData = await prodRes.json();

      if (catData.success) {
        setCategories(catData.categories);
      }
      if (prodData.success) {
        setProducts(prodData.products);
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBusiness?.id]);

  // Image Upload for New Category
  const handleNewImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Supported formats: PNG, JPG, WEBP, GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image exceeds 5MB limit.');
      return;
    }

    setNewCatImageFile(file);
    setNewCatImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');

      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json();
      if (data.success && data.url) {
        setNewCatImagePreview(data.url);
      } else {
        setImageError(data.error || 'Failed to upload image.');
      }
    } catch (err) {
      setImageError('Upload connection error.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Image Upload for Edit Category
  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditImageError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setEditImageError('Supported formats: PNG, JPG, WEBP, GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditImageError('Image exceeds 5MB limit.');
      return;
    }

    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
    setIsUploadingEditImage(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');

      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json();
      if (data.success && data.url) {
        setEditImagePreview(data.url);
      } else {
        setEditImageError(data.error || 'Failed to upload image.');
      }
    } catch (err) {
      setEditImageError('Upload connection error.');
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  const handleCreateCategory = async (catName?: string) => {
    const targetName = (catName || newCatName).trim();
    if (!targetName || !currentBusiness) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          sourceType: 'store',
          name: targetName,
          description: newCatDesc.trim() || `${catConfig.label} product category`,
          imageUrl: newCatImagePreview || undefined,
          sortOrder: categories.length + 1,
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => [...prev, data.category]);
        setNewCatName('');
        setNewCatDesc('');
        setNewCatImageFile(null);
        setNewCatImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('subscription_usage_changed'));
        }
        setFeedbackMsg({ type: 'success', text: `Category "${targetName}" created successfully!` });
        setTimeout(() => setFeedbackMsg(null), 3500);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to create category.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error saving category.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCategory.id,
          name: editName.trim(),
          description: editDesc.trim(),
          imageUrl: editImagePreview || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? { ...c, ...data.category } : c))
        );
        setEditingCategory(null);
        setFeedbackMsg({ type: 'success', text: 'Category updated successfully!' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to update category.' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Error updating category.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCat) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories?id=${deletingCat.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c.id !== deletingCat.id));
        setDeletingCat(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('subscription_usage_changed'));
        }
        setFeedbackMsg({ type: 'success', text: 'Category deleted successfully.' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        setFeedbackMsg({ type: 'error', text: data.error || 'Failed to delete category.' });
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Error deleting category.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if store module is unlocked for this business
  const isStoreCategory = [
    'hardware',
    'hardware_building_materials',
    'retail',
    'retail_shop',
    'grocery',
    'grocery_kirana',
    'other',
  ].includes(currentBusiness?.type || '');
  const hasStoreModule =
    isStoreCategory ||
    currentBusiness?.subscription?.planId === 'plan_gold' ||
    currentBusiness?.subscription?.planId === 'plan_basic';

  if (!hasStoreModule) {
    return <StoreLockedPrompt featureName="Product Categories" />;
  }

  // Filter categories by search
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Suggested starter categories that are not yet added
  const unaddedStarters = (catConfig.starterCategories || []).filter(
    (starter) => !categories.some((c) => c.name.toLowerCase() === starter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
            <Layers className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {catConfig.label} Categories
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {categories.length} Categories
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, group and organize your materials and products with images so customers find items instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/store/catalog"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Store className="w-4 h-4 text-slate-500" />
            <span>Open Catalog ({products.length})</span>
          </Link>
        </div>
      </div>

      {/* Plan Usage Card (Categories Limit Capacity) */}
      <PlanUsageCard compact onUsageLoaded={setPlanUsage} typeFilter="categories" />

      {/* Notification Toast */}
      {feedbackMsg && (
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all',
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          )}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create New Category Card with Image Upload */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">Create New Category (with Image Upload)</h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateCategory();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Cement & Aggregates, Plumbing Fittings, Power Tools, Paints..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Brief Description <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="e.g. Construction cement, sand bags, concrete mixes"
                className="w-full px-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Category Image Upload Row */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Category Image <span className="font-normal text-slate-400">(Optional - displays on digital storefront)</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleNewImageChange}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />

            {newCatImagePreview ? (
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={newCatImagePreview}
                  alt="Category Preview"
                  className="w-14 h-14 rounded-lg object-cover border border-slate-200 shadow-2xs bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {newCatImageFile ? newCatImageFile.name : 'Category Image'}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium">Ready to save</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatImageFile(null);
                      setNewCatImagePreview('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Uploading category photo...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    <span>Click to Upload Category Photo (JPG, PNG, WEBP)</span>
                  </>
                )}
              </button>
            )}

            {imageError && <p className="text-xs text-rose-600 font-semibold mt-1">{imageError}</p>}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingImage || !newCatName.trim() || planUsage?.categories.isLimitReached}
              className={cn(
                'px-5 py-2 font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0',
                planUsage?.categories.isLimitReached
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Category...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Category</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 1-Click Suggested Starter Categories */}
        {unaddedStarters.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Recommended starter categories for {catConfig.label} (1-Click Add):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unaddedStarters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => handleCreateCategory(starter)}
                  disabled={isSubmitting || planUsage?.categories.isLimitReached}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3 h-3 text-indigo-600" />
                  <span>{starter}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories Search & List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-700 font-bold">{filteredCategories.length}</strong> of{' '}
            <strong className="text-slate-700 font-bold">{categories.length}</strong> categories
          </div>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {search ? 'No categories match your search' : 'No store categories yet'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              {search
                ? 'Try a different search term or clear the filter.'
                : 'Create your first product category using the form above or pick from suggested categories.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCategories.map((cat, idx) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id);
              const itemCount = catProducts.length;

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden"
                >
                  {/* Category Image Header */}
                  {cat.imageUrl ? (
                    <div className="h-28 w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                        #{idx + 1}
                      </span>
                    </div>
                  ) : null}

                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {!cat.imageUrl && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              #{idx + 1}
                            </span>
                          )}
                          <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{cat.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/dashboard/store/catalog`}
                        className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <span>View Products</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditName(cat.name);
                            setEditDesc(cat.description || '');
                            setEditImagePreview(cat.imageUrl || '');
                            setEditImageFile(null);
                            setEditImageError('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Category & Image"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingCat(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MODAL WITH IMAGE UPLOAD */}
      {editingCategory && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Edit Category</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Edit Category Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Image
                </label>

                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditImageChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                />

                {editImagePreview ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={editImagePreview}
                      alt="Category Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {editImageFile ? editImageFile.name : 'Category Image'}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">Image attached</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditImageFile(null);
                          setEditImagePreview('');
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={isUploadingEditImage}
                    className="w-full flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-700 transition-colors"
                  >
                    {isUploadingEditImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span>Upload Category Image</span>
                      </>
                    )}
                  </button>
                )}

                {editImageError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{editImageError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || isUploadingEditImage || !editName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCat && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Category?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove <strong className="text-slate-800 font-bold">{deletingCat.name}</strong>?
                </p>
                {products.filter((p) => p.categoryId === deletingCat.id).length > 0 && (
                  <p className="text-xs text-amber-600 font-semibold mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    Warning: There are {products.filter((p) => p.categoryId === deletingCat.id).length} products assigned to this category.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCat(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCategory}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
