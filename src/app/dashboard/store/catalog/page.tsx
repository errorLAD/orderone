'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Store,
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  AlertCircle,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Boxes,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Loader2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Product, Category, ProductVariant, BusinessPlanUsage } from '@/types';
import { formatINR, cn, formatDate } from '@/lib/utils';
import { StoreLockedPrompt } from '@/components/dashboard/StoreLockedPrompt';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';
import { getCategoryConfig, getCategoryUnits, POPULAR_SIZE_PRESETS } from '@/lib/categories';
import { SalesChannelSelector, SalesChannelBadge, SalesChannel } from '@/components/dashboard/SalesChannelSelector';

export default function StoreCatalogPage() {
  const { currentBusiness } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all'); // 'all', 'in_stock', 'low_stock', 'out_of_stock'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [planUsage, setPlanUsage] = useState<BusinessPlanUsage | null>(null);
  const [productFormError, setProductFormError] = useState<string>('');

  // Category Quick-Add / Manager Modal
  const [showCatModal, setShowCatModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [isAddingCat, setIsAddingCat] = useState<boolean>(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');
  const [catActionError, setCatActionError] = useState<string>('');
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
    salePrice: '',
    sku: '',
    barcode: '',
    brand: '',
    unit: catConfig.supportedUnits[0] || 'piece',
    size: '',
    minOrderQty: '1',
    stockQuantity: '20',
    lowStockThreshold: '5',
    description: '',
    imageUrl: '',
    salesChannel: 'both' as SalesChannel,
    isAvailable: true,
  });

  // Variants (Multiple Sizes & Packs) State
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    price: number;
    unit?: string;
    size?: string;
    stockQuantity?: number;
    sku?: string;
  }>>([]);

  const fetchData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products?businessId=${currentBusiness.id}&sourceType=store`),
        fetch(`/api/categories?businessId=${currentBusiness.id}&sourceType=store`),
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
      console.error('Error fetching catalog:', e);
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

    // Client-side validations
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Only PNG, JPG, or WEBP images are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Set local preview
    setImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Upload to server/Supabase
    setIsUploadingImage(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'products');

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
    } catch (err: any) {
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

  // Auto-generate SKU
  const handleGenerateSKU = () => {
    const brandPrefix = (formData.brand || 'PRD').substring(0, 3).toUpperCase();
    const namePart = (formData.name || 'ITEM')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    const unitPart = (formData.unit || 'PC').substring(0, 2).toUpperCase();
    const generated = `${brandPrefix}-${namePart}-${rand}-${unitPart}`;
    setFormData((prev) => ({ ...prev, sku: generated }));
  };

  const resetCatForm = () => {
    setNewCatName('');
    setCatImageFile(null);
    setCatImagePreview('');
    setCatImageError('');
    setCatActionError('');
    setEditingCatId(null);
    setEditingCatName('');
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
      setCatImageError('Image exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setCatImageFile(file);
    setCatImagePreview(URL.createObjectURL(file));
    setIsUploadingCatImage(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'categories');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setCatImagePreview(data.url);
      } else {
        setCatImageError(data.error || 'Failed to upload category image.');
      }
    } catch (err) {
      setCatImageError('Upload connection error. Please try again.');
    } finally {
      setIsUploadingCatImage(false);
    }
  };

  const handleRemoveCatImage = () => {
    setCatImageFile(null);
    setCatImagePreview('');
    if (catFileInputRef.current) catFileInputRef.current.value = '';
  };

  // Add category inline / modal
  const handleQuickAddCategory = async (catNameOverride?: string) => {
    const nameToAdd = (typeof catNameOverride === 'string' ? catNameOverride : newCatName).trim();
    if (!nameToAdd || !currentBusiness) return;
    setIsAddingCat(true);
    setCatActionError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          sourceType: 'store',
          name: nameToAdd,
          description: `${catConfig.label} product category`,
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
      } else {
        setCatActionError(data.error || 'Failed to add category');
      }
    } catch (err: any) {
      console.error('Error adding category:', err);
      setCatActionError(err.message || 'Error adding category');
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleUpdateCatName = async (catId: string) => {
    if (!editingCatName.trim()) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: catId,
          name: editingCatName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) =>
          prev.map((c) => (c.id === catId ? { ...c, name: editingCatName.trim() } : c))
        );
        setEditingCatId(null);
        setEditingCatName('');
      }
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCatInline = async (catId: string) => {
    try {
      const res = await fetch(`/api/categories?id=${catId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
        if (selectedCat === catId) setSelectedCat('all');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('subscription_usage_changed'));
        }
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // Variant operations (Sizes & Quantities)
  const handleAddVariant = (defaultName = '') => {
    setVariants((prev) => [
      ...prev,
      {
        id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: defaultName || '',
        price: Number(formData.price) || 0,
        unit: formData.unit || 'piece',
        size: defaultName || '',
        stockQuantity: Number(formData.stockQuantity) || 20,
        sku: '',
      },
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

  const openAddModal = () => {
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    setProductFormError('');
    setVariants([]);
    setFormData({
      name: '',
      categoryId: categories[0]?.id || '',
      price: '',
      salePrice: '',
      sku: '',
      barcode: '',
      brand: '',
      unit: catConfig.supportedUnits[0] || 'piece',
      size: '',
      minOrderQty: '1',
      stockQuantity: '25',
      lowStockThreshold: '5',
      description: '',
      imageUrl: '',
      salesChannel: 'both' as SalesChannel,
      isAvailable: true,
    });
    setShowAddModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setImageError('');
    setProductFormError('');
    setVariants(p.variants || []);
    setFormData({
      name: p.name,
      categoryId: p.categoryId,
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : '',
      sku: p.sku || '',
      barcode: p.barcode || '',
      brand: p.brand || '',
      unit: p.unit || catConfig.supportedUnits[0] || 'piece',
      size: p.size || '',
      minOrderQty: String(p.minOrderQty || 1),
      stockQuantity: String(p.stockQuantity ?? 0),
      lowStockThreshold: String(p.lowStockThreshold || 5),
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      salesChannel: (p.salesChannel as SalesChannel) || 'both',
      isAvailable: p.isAvailable,
    });
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;

    const payload = {
      businessId: currentBusiness.id,
      sourceType: 'store' as const,
      name: formData.name.trim(),
      categoryId: formData.categoryId || (categories[0]?.id ?? ''),
      price: Number(formData.price),
      salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
      sku: formData.sku?.trim() || undefined,
      barcode: formData.barcode?.trim() || undefined,
      brand: formData.brand?.trim() || undefined,
      unit: formData.unit || undefined,
      size: formData.size?.trim() || undefined,
      minOrderQty: Number(formData.minOrderQty) || 1,
      stockQuantity: Number(formData.stockQuantity),
      lowStockThreshold: Number(formData.lowStockThreshold) || 5,
      description: formData.description?.trim() || '',
      imageUrl: formData.imageUrl?.trim() || undefined,
      salesChannel: formData.salesChannel || 'both',
      isAvailable: formData.isAvailable,
      variants: variants
        .filter((v) => v.name.trim() !== '')
        .map((v) => ({
          id: v.id || `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: v.name.trim(),
          price: Number(v.price) || 0,
          unit: v.unit || formData.unit || undefined,
          size: v.size?.trim() || v.name.trim() || undefined,
          stockQuantity: typeof v.stockQuantity === 'number' ? v.stockQuantity : Number(formData.stockQuantity) || 0,
          sku: v.sku?.trim() || undefined,
        })),
      sortOrder: products.length + 1,
    };

    try {
      setProductFormError('');
      if (editingProduct) {
        const res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProduct.id, ...payload }),
        });
        const data = await res.json();
        if (!data.success) {
          setProductFormError(data.error || 'Failed to update product');
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
          setProductFormError(data.error || 'Failed to create product');
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
      console.error('Error saving product:', e);
      setProductFormError(e.message || 'Error saving product');
    }
  };

  const [togglingAvailabilityId, setTogglingAvailabilityId] = useState<string | null>(null);

  const handleSetAvailability = async (product: Product, isAvailable: boolean) => {
    if (product.isAvailable === isAvailable) return;
    try {
      setTogglingAvailabilityId(product.id);
      // Optimistic update for instant UI feedback
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isAvailable } : p))
      );

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          isAvailable,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update product availability');
      }

      await fetchData();
    } catch (e) {
      console.error('Error adjusting availability:', e);
      await fetchData();
    } finally {
      setTogglingAvailabilityId(null);
    }
  };

  const handleQuickStockAdjust = async (product: Product, delta: number) => {
    const newQty = Math.max(0, (product.stockQuantity || 0) + delta);
    try {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          stockQuantity: newQty,
          isAvailable: newQty > 0,
        }),
      });
      await fetchData();
    } catch (e) {
      console.error('Error adjusting stock:', e);
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
      console.error('Error deleting product:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = [
      'ID',
      'Name',
      'Brand',
      'Category',
      'Unit',
      'MinOrderQty',
      'SKU',
      'Barcode',
      'Price',
      'SalePrice',
      'Stock',
      'IsAvailable',
      'CreatedAt',
      'UpdatedAt',
    ];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId)?.name || 'Uncategorized';
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${cat.replace(/"/g, '""')}"`,
        p.unit || 'piece',
        p.minOrderQty || 1,
        p.sku || '',
        p.barcode || '',
        p.price,
        p.salePrice || '',
        p.stockQuantity || 0,
        p.isAvailable,
        p.createdAt,
        p.updatedAt,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `store_catalog_${currentBusiness?.slug || 'export'}.csv`;
    link.click();
  };

  // Filtering
  const filteredProducts = products.filter((p) => {
    if (selectedCat !== 'all' && p.categoryId !== selectedCat) return false;

    if (stockFilter === 'out_of_stock') {
      if (p.isAvailable && (p.stockQuantity === undefined || p.stockQuantity > 0)) return false;
    } else if (stockFilter === 'low_stock') {
      const threshold = p.lowStockThreshold || 5;
      if (!p.isAvailable || p.stockQuantity === undefined || p.stockQuantity <= 0 || p.stockQuantity > threshold) {
        return false;
      }
    } else if (stockFilter === 'in_stock') {
      const threshold = p.lowStockThreshold || 5;
      if (!p.isAvailable || (p.stockQuantity !== undefined && p.stockQuantity <= threshold)) {
        return false;
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      const matchBrand = p.brand?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchBrand && !matchDesc) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Store className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  {catConfig.terminology.itemsTitle}
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {catConfig.label} Catalog
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage products, inventory levels, pricing, units, specifications, and images in Supabase.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              resetCatForm();
              setShowCatModal(true);
            }}
            disabled={planUsage?.categories.isLimitReached}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-colors shadow-2xs',
              planUsage?.categories.isLimitReached
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
            )}
            title={
              planUsage?.categories.isLimitReached
                ? `You've reached the ${planUsage.plan.name} plan limit of ${planUsage.categories.max} categories.`
                : 'Add or Manage Categories with Image Upload'
            }
          >
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>+ Add Category</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-200/70 text-indigo-900 font-bold">
              {categories.length}
            </span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download CSV Catalog"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            disabled={planUsage?.products.isLimitReached}
            onClick={openAddModal}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-colors shadow-xs',
              planUsage?.products.isLimitReached
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            )}
            title={
              planUsage?.products.isLimitReached
                ? `You've reached the ${planUsage.plan.name} plan limit of ${planUsage.products.max} products.`
                : undefined
            }
          >
            <Plus className="w-4 h-4" />
            <span>{catConfig.terminology.addItemButton}</span>
          </button>
        </div>
      </div>

      {/* Plan Usage Card (Real Supabase Record Capacity Meter) */}
      <PlanUsageCard compact onUsageLoaded={setPlanUsage} />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search by product name, brand, SKU or description...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
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
            {/* Category Filter & Quick Add */}
            <div className="flex items-center gap-1">
              <select
                value={selectedCat}
                onChange={(e) => {
                  setSelectedCat(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowCatModal(true)}
                className="px-2.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-2xs flex items-center gap-1 shrink-0"
                title="Add or Manage Categories"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">+ Category</span>
              </button>
            </div>

            {/* Stock Status Filter */}
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (Healthy)</option>
              <option value="low_stock">Low Stock Warning</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Table / Grid Switcher */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'table' ? 'bg-white shadow-2xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-white shadow-2xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setSelectedCat('all');
              setCurrentPage(1);
            }}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border text-xs',
              selectedCat === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCat(c.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors border text-xs flex items-center gap-1.5',
                  selectedCat === c.id
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
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
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                    selectedCat === c.id ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              resetCatForm();
              setShowCatModal(true);
            }}
            className="px-2.5 py-1.5 rounded-lg font-bold text-indigo-700 bg-indigo-50 border border-dashed border-indigo-300 hover:bg-indigo-100 transition-colors whitespace-nowrap text-xs flex items-center gap-1 shrink-0"
            title="Create New Category with Image"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Add Category</span>
          </button>
        </div>

        {/* Status Indicators Pill Counter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Catalog Summary:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
            {products.length} Total
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200">
            {products.filter((p) => p.isAvailable && (p.stockQuantity ?? 0) > (p.lowStockThreshold || 5)).length} In Stock
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-[11px] border border-amber-200">
            {products.filter((p) => p.isAvailable && (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= (p.lowStockThreshold || 5)).length} Low Stock
          </span>
          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-semibold text-[11px] border border-rose-200">
            {products.filter((p) => !p.isAvailable || (p.stockQuantity ?? 0) <= 0).length} Out of Stock
          </span>
        </div>
      </div>

      {/* Main Product Display */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading authorized catalog data...</p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {search || selectedCat !== 'all' || stockFilter !== 'all'
              ? 'No products match your filters'
              : `No products in ${catConfig.label.toLowerCase()} catalog`}
          </h3>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {search || selectedCat !== 'all' || stockFilter !== 'all'
              ? 'Try resetting your search query or selecting a different category filter.'
              : 'Add your retail items, construction materials, brand specifications and multi-unit catalog.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => {
                resetCatForm();
                setShowCatModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              <span>+ Add Category</span>
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{catConfig.terminology.addItemButton}</span>
            </button>

            {(selectedCat !== 'all' || search || stockFilter !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCat('all');
                  setSearch('');
                  setStockFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-3.5 pl-4">Product & Brand</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">SKU / Code</th>
                  <th className="p-3.5">Selling Price</th>
                  <th className="p-3.5">Stock Level</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Updated</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId)?.name || 'General';
                  const isLow = p.stockQuantity !== undefined && p.stockQuantity <= (p.lowStockThreshold || 5);
                  const isOut = !p.isAvailable || (p.stockQuantity !== undefined && p.stockQuantity <= 0);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product & Brand */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=200&auto=format&fit=crop&q=80';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 leading-snug">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.brand && (
                                <span className="font-semibold text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  {p.brand}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500">Unit: {p.unit || 'piece'}</span>
                              {p.size && (
                                <span className="font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {p.size}
                                </span>
                              )}
                              {p.variants && p.variants.length > 0 && (
                                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 font-bold">
                                  • {p.variants.length} size{p.variants.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {cat}
                          </span>
                          <SalesChannelBadge channel={p.salesChannel} size="xs" />
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600">
                        {p.sku || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Price */}
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 text-sm">
                          {formatINR(p.salePrice || p.price)}
                        </div>
                        {p.salePrice && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {formatINR(p.price)}
                          </div>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded font-black text-xs',
                              isOut
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            )}
                          >
                            {p.stockQuantity ?? '∞'} {p.unit || 'units'}
                          </span>

                          {/* Quick Adjust Buttons */}
                          <div className="inline-flex rounded-md shadow-2xs border border-slate-200 overflow-hidden">
                            <button
                              onClick={() => handleQuickStockAdjust(p, -1)}
                              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors"
                              title="Decrease 1"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuickStockAdjust(p, 5)}
                              className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border-l border-slate-200 transition-colors"
                              title="Add 5"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status / Availability Buttons */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
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
                              title="Mark product as Available"
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
                              title="Mark product as Not Available"
                            >
                              <XCircle className="w-3 h-3 shrink-0" />
                              <span>Not Available</span>
                            </button>
                          </div>
                          {p.isAvailable && isLow && !isOut && (
                            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Low Stock ({p.stockQuantity})
                            </span>
                          )}
                          {p.isAvailable && isOut && (
                            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Out of stock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Updated Date */}
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        <div>{formatDate(p.updatedAt || p.createdAt)}</div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Product"
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
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProducts.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId)?.name || 'General';
            const isLow = p.stockQuantity !== undefined && p.stockQuantity <= (p.lowStockThreshold || 5);
            const isOut = !p.isAvailable || (p.stockQuantity !== undefined && p.stockQuantity <= 0);

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col hover:border-slate-300 transition-all"
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
                          'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-[11px]">No Image Uploaded</span>
                    </div>
                  )}

                  {/* Status / Availability Badge Button */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <button
                      type="button"
                      onClick={() => handleSetAvailability(p, !p.isAvailable)}
                      disabled={togglingAvailabilityId === p.id}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md cursor-pointer transition-all active:scale-95',
                        p.isAvailable
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      )}
                      title={p.isAvailable ? 'Click to mark as Not Available' : 'Click to mark as Available'}
                    >
                      {p.isAvailable ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Available</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 shrink-0" />
                          <span>Not Available</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Brand Tag */}
                  {p.brand && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200">
                        {p.brand}
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {cat}
                        </span>
                        <SalesChannelBadge channel={p.salesChannel} size="xs" />
                      </div>
                      <span className="font-mono">{p.sku || 'No SKU'}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {p.size && (
                        <span className="font-bold text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {p.size}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">per {p.unit || 'piece'}</span>
                      {p.variants && p.variants.length > 0 && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                          {p.variants.length} sizes
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                    )}
                  </div>

                  <div>
                    {/* Price & Unit */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                      <div>
                        <div className="font-black text-slate-900 text-base">
                          {formatINR(p.salePrice || p.price)}
                        </div>
                        {p.salePrice && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {formatINR(p.price)}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-700">
                          {p.stockQuantity ?? '∞'} {p.unit || 'units'}
                        </span>
                        <div className="text-[10px] text-slate-400">Inventory</div>
                      </div>
                    </div>

                    {/* Quick Actions & Availability */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100">
                      <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleSetAvailability(p, true)}
                          disabled={togglingAvailabilityId === p.id}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
                            p.isAvailable
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          )}
                          title="Set Available"
                        >
                          Available
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAvailability(p, false)}
                          disabled={togglingAvailabilityId === p.id}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded transition-colors',
                            !p.isAvailable
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          )}
                          title="Set Not Available"
                        >
                          Not Available
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
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
      )}

      {/* Pagination Controls */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-slate-900">
              {Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)} -{' '}
              {Math.min(currentPage * pageSize, filteredProducts.length)}
            </span>
            <span>of {filteredProducts.length} items</span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {editingProduct ? 'Edit Product' : catConfig.terminology.addItemButton}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure real product details, stock, multi-unit specs, and upload image.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4 text-xs">
              {productFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">{productFormError}</p>
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
              {/* Product Image Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Product Image (Supabase / Media)</label>
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
                      <span className="text-[9px]">No image</span>
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
                        id="product-image-upload"
                      />
                      <label
                        htmlFor="product-image-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-50 shadow-2xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{imagePreview ? 'Replace Image' : 'Upload Image'}</span>
                      </label>

                      {imagePreview && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Supports PNG, JPG, WEBP up to 5MB. Previews live before saving.
                    </p>

                    {imageError && (
                      <p className="text-[11px] font-semibold text-rose-600">{imageError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">
                    Product / Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. UltraTech Super Cement or 12mm Rebars"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. UltraTech, Tata Tiscon, Supreme"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category, Unit & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCatModal(true)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      + Add New
                    </button>
                  </div>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Measurement Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-xs"
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
                    <label className="block font-bold text-slate-800">Product Size / Fitment</label>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </div>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    placeholder="e.g. 1 kg, 5 kg, 12-inch, 1/2 inch"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-xs"
                  />
                </div>
              </div>

              {/* Quick Size Presets Bar */}
              {((POPULAR_SIZE_PRESETS[catConfig.id] || POPULAR_SIZE_PRESETS.default) || []).length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-indigo-600" /> Quick Size / Fitment Presets:
                    </span>
                    <span className="text-[10px] text-slate-400">Click to fill size or add as variant</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(POPULAR_SIZE_PRESETS[catConfig.id] || POPULAR_SIZE_PRESETS.default).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, size: sz }));
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-semibold border transition',
                          formData.size === sz
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300'
                        )}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-800">SKU Code</label>
                    <button
                      type="button"
                      onClick={handleGenerateSKU}
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. CEM-ULT-50KG"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Barcode / EAN (Optional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 8901234567890"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="380.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Sale / Offer Price (₹, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    placeholder="350.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Stock Quantity & Low Stock Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">
                    Stock Quantity ({formData.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                    placeholder="25"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">Min Order Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minOrderQty}
                    onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">Product Specifications / Notes</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Grade 53 OPC Cement for high strength RCC construction, ISI certified..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Sales Channel Selector */}
              <SalesChannelSelector
                value={formData.salesChannel}
                onChange={(val) => setFormData((prev) => ({ ...prev, salesChannel: val }))}
                entityType="product"
              />

              {/* Variants Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-slate-800">
                      Product Sizes & Variants ({variants.length})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Support separate prices & stock for sizes like 1 kg, 5 kg, 12-inch, etc.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddVariant()}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-2xs"
                  >
                    + Add Size / Variant
                  </button>
                </div>

                {variants.length > 0 && (
                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Size / Variant Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 1 kg, 5 kg, 12-inch, 1/2 inch"
                              value={v.name}
                              onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Price (₹)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price ₹"
                              value={v.price}
                              onChange={(e) => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                                Stock Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Stock"
                                value={v.stockQuantity ?? formData.stockQuantity}
                                onChange={(e) => handleUpdateVariant(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariant(idx)}
                              className="mt-3.5 p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition"
                              title="Remove Variant"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability Toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Show on Online Storefront</span>
                  <p className="text-[11px] text-slate-500">If disabled, this product remains hidden from customers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Timestamps info if editing */}
              {editingProduct && (
                <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-2">
                  <span>Created: {formatDate(editingProduct.createdAt)}</span>
                  <span>Last Updated: {formatDate(editingProduct.updatedAt)}</span>
                </div>
              )}

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
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {showCatModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Store Categories</h3>
                  <p className="text-[11px] text-slate-500">
                    Add, edit, or manage categories for your materials & store products.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCatModal(false);
                  setEditingCatId(null);
                  setCatActionError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {catActionError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <span>{catActionError}</span>
                <button onClick={() => setCatActionError('')} className="text-rose-400 hover:text-rose-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Category Form with Image Upload */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickAddCategory();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Cement, Steel & Rebars, PVC Pipes, Electrical, Paints..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Category Image Upload */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Category Image <span className="font-normal text-slate-400">(Optional - shows on storefront)</span>
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
                      className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-2xs bg-white shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {catImageFile ? catImageFile.name : 'Category Image'}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">Ready to save with category</p>
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
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
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
                    className="w-full flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/40 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    {isUploadingCatImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Uploading category image...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span>Click to Upload Category Photo (JPG, PNG, WEBP)</span>
                      </>
                    )}
                  </button>
                )}

                {catImageError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{catImageError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isAddingCat || isUploadingCatImage || !newCatName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-xs"
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

            {/* Starter Category Suggestions */}
            {catConfig.starterCategories && (
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick Add Suggested {catConfig.label} Categories:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {catConfig.starterCategories
                    .filter((starter) => !categories.some((c) => c.name.toLowerCase() === starter.toLowerCase()))
                    .map((starter) => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => handleQuickAddCategory(starter)}
                        disabled={isAddingCat}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{starter}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Existing Categories List */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto divide-y divide-slate-100 pr-1 border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pb-1">
                <span>Existing Categories ({categories.length})</span>
                <span>Items</span>
              </div>
              {categories.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No categories created yet. Enter a name and image above to add one.
                </div>
              ) : (
                categories.map((c, i) => {
                  const count = products.filter((p) => p.categoryId === c.id).length;
                  const isEditing = editingCatId === c.id;

                  return (
                    <div key={c.id} className="flex items-center justify-between py-2 text-xs gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl}
                            alt={c.name}
                            className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 text-[10px] font-bold">
                            #{i + 1}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-hidden focus:ring-1 focus:ring-indigo-500 flex-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCatName(c.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(null);
                                setEditingCatName('');
                              }}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            {count} {count === 1 ? 'item' : 'items'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(c.id);
                              setEditingCatName(c.name);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="Rename Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCatInline(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with link to full category page */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <Link
                href="/dashboard/store/categories"
                onClick={() => setShowCatModal(false)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
              >
                <span>Full Categories Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowCatModal(false);
                  setEditingCatId(null);
                }}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Product?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to delete <strong className="text-slate-800 font-bold">{deleteConfirmProduct.name}</strong>?
                  This product will be permanently removed from your catalog and online storefront.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>SKU:</span>
                <span className="font-mono font-bold">{deleteConfirmProduct.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Selling Price:</span>
                <span className="font-bold text-slate-900">{formatINR(deleteConfirmProduct.price)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Stock:</span>
                <span className="font-bold text-slate-900">
                  {deleteConfirmProduct.stockQuantity ?? 0} {deleteConfirmProduct.unit || 'units'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
