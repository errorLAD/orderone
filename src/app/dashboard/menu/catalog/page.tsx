'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Flame,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sparkles,
  Eye,
  Upload,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Leaf,
  Layers,
  ArrowUpDown,
  X,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  FolderPlus,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Product, Category, ProductVariant, ProductAddOn, BusinessPlanUsage } from '@/types';
import { formatINR, cn, formatDate } from '@/lib/utils';
import { getCategoryConfig, getCategoryUnits, POPULAR_SIZE_PRESETS } from '@/lib/categories';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';
import { SalesChannelSelector, SalesChannelBadge, SalesChannel } from '@/components/dashboard/SalesChannelSelector';

export default function MenuCatalogPage() {
  const { currentBusiness } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all'); // 'all', 'veg', 'non_veg', 'jain', 'vegan'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [planUsage, setPlanUsage] = useState<BusinessPlanUsage | null>(null);
  const [itemFormError, setItemFormError] = useState<string>('');

  // Category Manager Modal
  const [showCatManager, setShowCatManager] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [isAddingCat, setIsAddingCat] = useState<boolean>(false);
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImagePreview, setCatImagePreview] = useState<string>('');
  const [isUploadingCatImage, setIsUploadingCatImage] = useState<boolean>(false);
  const [catImageError, setCatImageError] = useState<string>('');
  const catFileInputRef = useRef<HTMLInputElement>(null);

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const catConfig = getCategoryConfig(currentBusiness?.type);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    unit: catConfig.supportedUnits[0] || 'portion',
    size: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    salesChannel: 'both' as SalesChannel,
    isVeg: true,
    isSpicy: false,
    isJain: false,
    isVegan: false,
  });

  // Dynamic Variants (Sizes) & Add-ons
  const [variants, setVariants] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [addOns, setAddOns] = useState<Array<{ id: string; name: string; price: number }>>([]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products?businessId=${currentBusiness.id}&sourceType=menu`),
        fetch(`/api/categories?businessId=${currentBusiness.id}&sourceType=menu`),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.success) setProducts(prodData.products);
      if (catData.success) {
        setCategories(catData.categories);
        if (catData.categories.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: catData.categories[0].id }));
        }
      }
    } catch (e) {
      console.error('Error fetching menu items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBusiness?.id]);

  // Image handling
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Only PNG, JPG, or WEBP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'menu');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        setImagePreview(data.url);
      } else {
        setImageError(data.error || 'Failed to upload image');
      }
    } catch (err) {
      setImageError('Upload connection error. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add/Remove Variant & Addon helpers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      { id: `mv_${Date.now()}`, name: '', price: Number(formData.price) || 0 },
    ]);
  };
  const handleUpdateVariant = (index: number, field: string, val: any) => {
    setVariants((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };
  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddAddon = () => {
    setAddOns((prev) => [...prev, { id: `ma_${Date.now()}`, name: '', price: 20 }]);
  };
  const handleUpdateAddon = (index: number, field: string, val: any) => {
    setAddOns((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };
  const handleRemoveAddon = (index: number) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const resetCatForm = () => {
    setNewCatName('');
    setCatImageFile(null);
    setCatImagePreview('');
    setCatImageError('');
    if (catFileInputRef.current) catFileInputRef.current.value = '';
  };

  const handleCatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCatImageError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setCatImageError('Supported formats: PNG, JPG, WEBP, GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCatImageError('Image exceeds 5MB limit.');
      return;
    }

    setCatImageFile(file);
    setCatImagePreview(URL.createObjectURL(file));
    setIsUploadingCatImage(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');

      const res = await fetch('/api/upload', { method: 'POST', body });
      const data = await res.json();
      if (data.success && data.url) {
        setCatImagePreview(data.url);
      } else {
        setCatImageError(data.error || 'Failed to upload category image.');
      }
    } catch (err) {
      setCatImageError('Upload failed. Please try again.');
    } finally {
      setIsUploadingCatImage(false);
    }
  };

  const handleRemoveCatImage = () => {
    setCatImageFile(null);
    setCatImagePreview('');
    if (catFileInputRef.current) catFileInputRef.current.value = '';
  };

  // Category quick-add
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !currentBusiness) return;
    setIsAddingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          sourceType: 'menu',
          name: newCatName.trim(),
          imageUrl: catImagePreview || undefined,
          sortOrder: categories.length + 1,
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => [...prev, data.category]);
        setFormData((prev) => ({ ...prev, categoryId: data.category.id }));
        resetCatForm();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('subscription_usage_changed'));
        }
      }
    } catch (err) {
      console.error('Error adding menu category:', err);
    } finally {
      setIsAddingCat(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    setItemFormError('');
    setVariants([]);
    setAddOns([]);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      price: '',
      unit: catConfig.supportedUnits[0] || 'portion',
      size: '',
      description: '',
      imageUrl: '',
      isAvailable: true,
      salesChannel: 'both' as SalesChannel,
      isVeg: true,
      isSpicy: false,
      isJain: false,
      isVegan: false,
    });
    setShowAddModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setImageError('');
    setItemFormError('');
    setVariants(p.variants || []);
    setAddOns(p.addOns || []);
    setFormData({
      name: p.name,
      categoryId: p.categoryId,
      price: String(p.price),
      unit: p.unit || catConfig.supportedUnits[0] || 'portion',
      size: p.size || '',
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      isAvailable: p.isAvailable,
      salesChannel: (p.salesChannel as SalesChannel) || 'both',
      isVeg: p.dietaryFlags?.isVeg ?? true,
      isSpicy: p.dietaryFlags?.isSpicy ?? false,
      isJain: p.dietaryFlags?.isJain ?? false,
      isVegan: p.dietaryFlags?.isVegan ?? false,
    });
    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    const payload = {
      businessId: currentBusiness.id,
      sourceType: 'menu' as const,
      name: formData.name.trim(),
      categoryId: formData.categoryId || (categories[0]?.id ?? ''),
      price: Number(formData.price),
      unit: formData.unit || undefined,
      size: formData.size?.trim() || undefined,
      description: formData.description.trim(),
      imageUrl: formData.imageUrl?.trim() || undefined,
      isAvailable: formData.isAvailable,
      salesChannel: formData.salesChannel || 'both',
      dietaryFlags: {
        isVeg: formData.isVeg,
        isNonVeg: !formData.isVeg,
        isSpicy: formData.isSpicy,
        isJain: formData.isJain,
        isVegan: formData.isVegan,
      },
      variants: variants
        .filter((v) => v.name.trim() !== '')
        .map((v) => ({
          id: v.id || `mv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: v.name.trim(),
          price: Number(v.price) || 0,
          unit: formData.unit || undefined,
          size: v.name.trim(),
        })),
      addOns: addOns.filter((a) => a.name.trim() !== ''),
      sortOrder: products.length + 1,
    };

    try {
      setItemFormError('');
      if (editingProduct) {
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProduct.id, ...payload }),
        });
        const data = await res.json();
        if (!data.success) {
          setItemFormError(data.error || 'Failed to update menu item');
          return;
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) {
          setItemFormError(data.error || 'Failed to create menu item');
          return;
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('subscription_usage_changed'));
        }
      }
      setShowAddModal(false);
      setEditingProduct(null);
      await fetchData();
    } catch (e: any) {
      console.error('Error saving menu item:', e);
      setItemFormError(e.message || 'Error saving menu item');
    }
  };

  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<string | null>(null);

  const handleSetAvailability = async (product: Product, isAvailable: boolean) => {
    if (product.isAvailable === isAvailable) return;
    try {
      setTogglingAvailabilityId(product.id);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable } : p))
      );
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          isAvailable,
        }),
      });
      await fetchData();
    } catch (e) {
      console.error('Error toggling availability:', e);
      await fetchData();
    } finally {
      setTogglingAvailabilityId(null);
    }
  };

  const handleToggleSoldOut = async (product: Product) => {
    try {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          isAvailable: !product.isAvailable,
        }),
      });
      await fetchData();
    } catch (e) {
      console.error('Error toggling sold out:', e);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProduct) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/products?id=${deleteConfirmProduct.id}`, { method: 'DELETE' });
      setDeleteConfirmProduct(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('subscription_usage_changed'));
      }
      await fetchData();
    } catch (e) {
      console.error('Error deleting menu item:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;

    if (dietaryFilter === 'veg' && !p.dietaryFlags?.isVeg) return false;
    if (dietaryFilter === 'non_veg' && p.dietaryFlags?.isVeg) return false;
    if (dietaryFilter === 'jain' && !p.dietaryFlags?.isJain) return false;
    if (dietaryFilter === 'vegan' && !p.dietaryFlags?.isVegan) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {catConfig.terminology.itemsTitle}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                  {catConfig.label} Menu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage food & drink recipes, dietary badges, portion sizes, add-ons and customer previews.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              resetCatForm();
              setShowCatManager(true);
            }}
            disabled={planUsage?.categories.isLimitReached}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors shadow-2xs',
              planUsage?.categories.isLimitReached
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100'
            )}
            title={
              planUsage?.categories.isLimitReached
                ? `You've reached the ${planUsage.plan.name} plan limit of ${planUsage.categories.max} categories.`
                : 'Add or Manage Menu Categories with Image Upload'
            }
          >
            <FolderPlus className="w-4 h-4 text-orange-600" />
            <span>+ Add Category</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-200/70 text-orange-900 font-bold">
              {categories.length}
            </span>
          </button>

          <button
            disabled={planUsage?.products.isLimitReached}
            onClick={openAddModal}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-xs',
              planUsage?.products.isLimitReached
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            )}
            title={
              planUsage?.products.isLimitReached
                ? `You've reached the ${planUsage.plan.name} plan limit of ${planUsage.products.max} menu items.`
                : undefined
            }
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      </div>

      {/* Plan Usage Card (Real Supabase Record Capacity Meter) */}
      <PlanUsageCard compact onUsageLoaded={setPlanUsage} />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes, drinks, or ingredients..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Dietary Filter */}
            <select
              value={dietaryFilter}
              onChange={(e) => {
                setDietaryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
            >
              <option value="all">All Dietary Types</option>
              <option value="veg">🟢 Pure Veg Only</option>
              <option value="non_veg">🔴 Non-Veg Only</option>
              <option value="jain">🟡 Jain Friendly</option>
              <option value="vegan">🌱 Vegan</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'table' ? 'bg-white shadow-2xs text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-100">
          <button
            onClick={() => {
              setSelectedCat('all');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border text-xs',
              selectedCat === 'all'
                ? 'bg-orange-600 text-white border-orange-600 font-bold shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCat(c.id);
                setCurrentPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border text-xs flex items-center gap-1.5',
                selectedCat === c.id
                  ? 'bg-orange-600 text-white border-orange-600 font-bold shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {c.imageUrl && (
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  className="w-4 h-4 rounded-md object-cover border border-slate-200 shrink-0"
                />
              )}
              <span>{c.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              resetCatForm();
              setShowCatManager(true);
            }}
            className="px-2.5 py-1.5 rounded-lg font-bold text-orange-700 bg-orange-50 border border-dashed border-orange-300 hover:bg-orange-100 transition-colors whitespace-nowrap text-xs flex items-center gap-1 shrink-0"
            title="Create New Menu Category with Image"
          >
            <Plus className="w-3.5 h-3.5 text-orange-600" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* Main Items Display */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading authorized menu data...</p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">No menu items found</h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {search || selectedCat !== 'all' || dietaryFilter !== 'all'
              ? 'Try adjusting your search query or dietary filters.'
              : 'Add dishes, drinks, recipe photos and portion variants to your dining menu.'}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId)?.name || 'Menu';
            const isVeg = p.dietaryFlags?.isVeg ?? true;

            return (
              <div
                key={p.id}
                className={cn(
                  'bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col hover:border-slate-300 transition-all',
                  !p.isAvailable && 'opacity-70 bg-slate-50/50'
                )}
              >
                {/* Image & Badges */}
                <div className="relative h-44 bg-slate-100 overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px]">No Dish Photo</span>
                    </div>
                  )}

                  {/* Veg / Non-Veg Indicator */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center border shadow-xs bg-white',
                        isVeg ? 'border-emerald-600' : 'border-rose-600'
                      )}
                      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span
                        className={cn('w-2.5 h-2.5 rounded-full', isVeg ? 'bg-emerald-600' : 'bg-rose-600')}
                      />
                    </span>
                  </div>

                  {/* Sold Out Overlay / Badge */}
                  {!p.isAvailable && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center">
                      <span className="px-3 py-1 bg-rose-600 text-white font-black text-xs rounded-full uppercase tracking-wider shadow-md">
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Category Pill */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200">
                      {cat}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <SalesChannelBadge channel={p.salesChannel} size="xs" />
                      {p.dietaryFlags?.isSpicy && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> Spicy
                        </span>
                      )}
                      {p.dietaryFlags?.isJain && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          Jain
                        </span>
                      )}
                      {p.dietaryFlags?.isVegan && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                          <Leaf className="w-2.5 h-2.5" /> Vegan
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {p.size && (
                        <span className="font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {p.size}
                        </span>
                      )}
                      {p.unit && (
                        <span className="text-[10px] text-slate-500">/{p.unit}</span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                    )}
                  </div>

                  <div>
                    {/* Price & Variants summary */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <div>
                        <div className="font-black text-slate-900 text-base">{formatINR(p.price)}</div>
                        {p.variants && p.variants.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            +{p.variants.length} portion sizes
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleSoldOut(p)}
                        className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded transition-colors border',
                          p.isAvailable
                            ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black'
                        )}
                      >
                        {p.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-1 pt-3 mt-2 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => setPreviewProduct(p)}
                        className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-4">Dish & Category</th>
                <th className="p-3.5">Dietary</th>
                <th className="p-3.5">Base Price</th>
                <th className="p-3.5">Sizes & Add-ons</th>
                <th className="p-3.5">Availability</th>
                <th className="p-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId)?.name || 'Menu';
                const isVeg = p.dietaryFlags?.isVeg ?? true;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                            <UtensilsCrossed className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500">{cat}</span>
                            {p.size && (
                              <span className="font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {p.size}
                              </span>
                            )}
                            {p.unit && (
                              <span className="text-[10px] text-slate-500">/{p.unit}</span>
                            )}
                            <SalesChannelBadge channel={p.salesChannel} size="xs" />
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold',
                          isVeg ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        )}
                      >
                        {isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                      </span>
                    </td>

                    <td className="p-3.5 font-black text-slate-900 text-sm">
                      {formatINR(p.price)}
                    </td>

                    <td className="p-3.5 text-slate-600">
                      <div>{p.variants?.length ? `${p.variants.length} portion sizes` : 'Single size'}</div>
                      {p.addOns?.length ? (
                        <div className="text-[10px] text-slate-400">{p.addOns.length} add-on(s)</div>
                      ) : null}
                    </td>

                    {/* Status / Availability Buttons */}
                    <td className="p-3.5">
                      <div className="inline-flex items-center p-0.5 bg-slate-100/90 rounded-lg border border-slate-200/90 shadow-2xs whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleSetAvailability(p, true)}
                          disabled={togglingAvailabilityId === p.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95',
                            p.isAvailable
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                          )}
                          title="Mark menu item as Available"
                        >
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Available</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAvailability(p, false)}
                          disabled={togglingAvailabilityId === p.id}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer select-none active:scale-95',
                            !p.isAvailable
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                          )}
                          title="Mark menu item as Not Available (Sold Out)"
                        >
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>Not Available</span>
                        </button>
                      </div>
                    </td>

                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredProducts.length}</span> items
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT MENU ITEM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {editingProduct ? 'Edit Food / Drink Item' : 'Add Food / Drink Item'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure dish details, dietary flags, sizes, add-ons and upload recipe image.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 pt-4 text-xs">
              {itemFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{itemFormError}</p>
                    <Link
                      href="/dashboard/subscription?plan=gold"
                      className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 underline hover:text-rose-900"
                    >
                      <span>Upgrade to Gold for higher limits and Store access</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
              {/* Image Upload Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Food / Drink Photo</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  {imagePreview ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-200/60 border border-slate-300 flex flex-col items-center justify-center shrink-0 text-slate-400">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-[9px]">No photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="menu-image-upload"
                      />
                      <label
                        htmlFor="menu-image-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-orange-700 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50 shadow-2xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{imagePreview ? 'Replace Photo' : 'Upload Photo'}</span>
                      </label>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      High quality photos increase food orders by up to 35%. Max 5MB.
                    </p>

                    {imageError && (
                      <p className="text-[11px] font-semibold text-rose-600">{imageError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Base Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">
                    Item / Dish Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Paneer Butter Masala or Cappuccino"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">
                    Base Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="240.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* Category, Unit & Portion Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Menu Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Serving Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden bg-white text-xs"
                  >
                    {getCategoryUnits(catConfig.id).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">Portion / Size</label>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. Regular, Large, 500ml, 1 kg"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Quick Portion Presets */}
              {((POPULAR_SIZE_PRESETS[catConfig.id] || POPULAR_SIZE_PRESETS.restaurant) || []).length > 0 && (
                <div className="p-2.5 bg-orange-50/60 rounded-xl border border-orange-200/70 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-orange-950 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-orange-600" /> Quick Portion Presets:
                    </span>
                    <span className="text-[10px] text-orange-700">Click to set size</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(POPULAR_SIZE_PRESETS[catConfig.id] || POPULAR_SIZE_PRESETS.restaurant).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, size: sz }));
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-semibold border transition',
                          formData.size === sz
                            ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                            : 'bg-white hover:bg-orange-50 text-slate-700 border-orange-200 hover:border-orange-300'
                        )}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary Flags */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Primary Classification</label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="radio"
                      name="vegNonVeg"
                      checked={formData.isVeg}
                      onChange={() => setFormData({ ...formData, isVeg: true })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>🟢 Veg</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-rose-800">
                    <input
                      type="radio"
                      name="vegNonVeg"
                      checked={!formData.isVeg}
                      onChange={() => setFormData({ ...formData, isVeg: false })}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>🔴 Non-Veg</span>
                  </label>
                </div>
              </div>

              {/* Special Dietary Tags */}
              <div className="space-y-1 pt-1">
                <label className="block font-bold text-slate-800">Special Badges</label>
                <div className="flex flex-wrap items-center gap-3 pt-0.5">
                  <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSpicy}
                      onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>🔥 Spicy</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isJain}
                      onChange={(e) => setFormData({ ...formData, isJain: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Jain Available</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVegan}
                      onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>🌱 Vegan</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Dish Description / Ingredients</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rich cashew and tomato gravy with cottage cheese cubes, slow-cooked in butter..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              {/* Sales Channel Selector */}
              <SalesChannelSelector
                value={formData.salesChannel}
                onChange={(val) => setFormData((prev) => ({ ...prev, salesChannel: val }))}
                entityType="item"
              />

              {/* Portion Sizes / Variants */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Portion Sizes / Sizes</label>
                    <p className="text-[11px] text-slate-500">e.g. Half / Full, Regular / Large</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
                  >
                    + Add Size
                  </button>
                </div>

                {variants.map((v, idx) => (
                  <div key={v.id || idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Size Name (e.g. Full / Half / Large)"
                      value={v.name}
                      onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs min-w-0"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price ₹"
                        value={v.price}
                        onChange={(e) => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                        className="flex-1 sm:w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 shrink-0"
                        title="Remove Size"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add-ons Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">Add-ons & Customizations</label>
                    <p className="text-[11px] text-slate-500">e.g. Extra Cheese, Extra Sauce, Ice Cream Scoop</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAddon}
                    className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100"
                  >
                    + Add-on
                  </button>
                </div>

                {addOns.map((a, idx) => (
                  <div key={a.id || idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      placeholder="Add-on Name (e.g. Extra Butter)"
                      value={a.name}
                      onChange={(e) => handleUpdateAddon(idx, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs min-w-0"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Addon Price ₹"
                        value={a.price}
                        onChange={(e) => handleUpdateAddon(idx, 'price', Number(e.target.value))}
                        className="flex-1 sm:w-28 px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold min-w-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAddon(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 shrink-0"
                        title="Remove Add-on"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Availability */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Available to Order</span>
                  <p className="text-[11px] text-slate-500">Uncheck to mark this dish as Sold Out.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="px-5 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {editingProduct ? 'Save Dish' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER LIVE PREVIEW MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Customer View Preview
              </span>
              <button
                onClick={() => setPreviewProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Customer Card */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
              <div className="relative h-44 bg-slate-100">
                {previewProduct.imageUrl ? (
                  <img src={previewProduct.imageUrl} alt={previewProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <UtensilsCrossed className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center border shadow-xs bg-white',
                      previewProduct.dietaryFlags?.isVeg ? 'border-emerald-600' : 'border-rose-600'
                    )}
                  >
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full',
                        previewProduct.dietaryFlags?.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                      )}
                    />
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{previewProduct.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {previewProduct.description || 'Delicious freshly prepared dish.'}
                  </p>
                </div>

                {previewProduct.variants && previewProduct.variants.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Choose Portion:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewProduct.variants.map((v) => (
                        <span
                          key={v.id}
                          className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-900 rounded text-[11px] font-semibold"
                        >
                          {v.name} ({formatINR(v.price)})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-900 text-base">{formatINR(previewProduct.price)}</span>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-orange-600 text-white font-bold text-xs rounded-lg shadow-2xs hover:bg-orange-700"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              This is an exact preview of how this item appears on your public digital menu.
            </p>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {showCatManager && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
                  <FolderPlus className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Menu Categories</h3>
              </div>
              <button onClick={() => setShowCatManager(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Starters, Main Course, Breads, Mocktails..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Category Image Upload */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Category Image <span className="font-normal text-slate-400">(Optional)</span>
                </label>

                <input
                  type="file"
                  ref={catFileInputRef}
                  onChange={handleCatImageChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                />

                {catImagePreview ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={catImagePreview}
                      alt="Category Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {catImageFile ? catImageFile.name : 'Category Image'}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">Image attached</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => catFileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveCatImage}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => catFileInputRef.current?.click()}
                    disabled={isUploadingCatImage}
                    className="w-full flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-orange-400 bg-slate-50/70 rounded-xl text-xs font-medium text-slate-600 hover:text-orange-700 transition-colors"
                  >
                    {isUploadingCatImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 text-orange-500" />
                        <span>Upload Category Photo</span>
                      </>
                    )}
                  </button>
                )}

                {catImageError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{catImageError}</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAddingCat || isUploadingCatImage || !newCatName.trim()}
                  className="px-4 py-2 bg-orange-600 text-white font-bold rounded-lg text-xs hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {isAddingCat ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto divide-y divide-slate-100 border-t border-slate-100 pt-2">
              <div className="text-[11px] font-semibold text-slate-400 pb-1">
                Existing Categories ({categories.length})
              </div>
              {categories.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2">
                    {c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-6 h-6 rounded-md object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <span className="font-mono text-slate-400 text-[10px]">#{i + 1}</span>
                    )}
                    <span className="font-semibold text-slate-800">{c.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {products.filter((p) => p.categoryId === c.id).length} items
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <Link
                href="/dashboard/menu/categories"
                onClick={() => setShowCatManager(false)}
                className="font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1 hover:underline"
              >
                <span>Full Categories Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => setShowCatManager(false)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Menu Item?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove <strong className="text-slate-800 font-bold">{deleteConfirmProduct.name}</strong>?
                  It will no longer appear on the customer digital dining menu.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
