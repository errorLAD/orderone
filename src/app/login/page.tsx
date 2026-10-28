'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  Building2,
  CheckCircle2,
  ArrowRight,
  Phone,
  MapPin,
  User as UserIcon,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { BUSINESS_CATEGORIES } from '@/lib/categories';
import { BusinessType } from '@/types';
import { cn } from '@/lib/utils';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';

export default function LoginPage() {
  const router = useRouter();
  const { login, registerBusiness } = useApp();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  
  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Business Form State
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<BusinessType>('hardware');
  const [ownerName, setOwnerName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (res.success) {
        if (res.hasBusiness) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else {
        setErrorMsg(res.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!businessName.trim()) {
      setErrorMsg('Please enter your business or brand name');
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter the owner full name');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Please enter a valid contact email');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile / WhatsApp number');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your business address');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerBusiness({
        businessName: businessName.trim(),
        category,
        ownerName: ownerName.trim(),
        email: regEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        password: regPassword,
      });

      if (res.success && res.business) {
        // Connected flow: seamlessly proceed to category setup wizard
        router.push('/onboarding');
      } else {
        setErrorMsg(res.error || 'Failed to register business');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-black shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-[#0F172A] tracking-tight">
            OrderOne<span className="text-[#4F46E5]">.in</span>
          </span>
        </Link>
        <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
          {mode === 'signin' ? 'Sign In to Your Merchant Dashboard' : 'Register Your Business'}
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          {mode === 'signin'
            ? 'Access your category-tailored orders, inventory, live tokens and storefront'
            : 'Select your business category to setup an automated storefront in 2 minutes'}
        </p>
      </div>

      <div className={`mt-6 sm:mx-auto sm:w-full ${mode === 'signin' ? 'sm:max-w-md' : 'sm:max-w-2xl'}`}>
        <Card className="p-6 sm:p-8 shadow-card border-[#E2E8F0]">
          {/* Main 2-Option Tabs: Sign In vs Register Business */}
          <div className="flex border-b border-[#E2E8F0] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`pb-3 text-xs font-bold border-b-2 flex-1 text-center transition-colors ${
                mode === 'signin'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
              }}
              className={`pb-3 text-xs font-bold border-b-2 flex-1 text-center transition-colors ${
                mode === 'register'
                  ? 'border-[#4F46E5] text-[#4F46E5]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Register Business
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= OPTION 1: SIGN IN ================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="owner@business.in"
              />

              <Input
                label="Password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-[#64748B] cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#4F46E5] focus:ring-[#4F46E5] w-3.5 h-3.5"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" isLoading={isLoading}>
                Sign In to Dashboard
              </Button>
            </form>
          )}

          {/* ================= OPTION 2: REGISTER BUSINESS ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterBusiness} className="space-y-5">
              {/* 1. Business Category Selector */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Business Category <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-[#64748B] mb-2.5">
                  Your category customizes your dashboard terminology, setup wizard, order flows and units.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24',
                          isSelected
                            ? 'bg-[#EEF2FF] border-[#4F46E5] ring-2 ring-[#4F46E5]/20 shadow-xs'
                            : 'bg-white border-[#E2E8F0] hover:border-slate-300 hover:bg-slate-50/50'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">{cat.icon}</span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[10px]">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#0F172A] leading-tight truncate">
                            {cat.label}
                          </p>
                          <span
                            className={cn(
                              'inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider',
                              cat.primaryModule === 'menu'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-sky-50 text-sky-700'
                            )}
                          >
                            {cat.primaryModule === 'menu' ? 'Food / Menu' : 'Retail / Store'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Business & Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-[#F1F5F9]">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Business / Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Royal Hardware Mart"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Owner Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Contact Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="owner@mybusiness.in"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Mobile / WhatsApp Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Business Physical Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop #12, Market Main Road, Indiranagar, Bengaluru, Karnataka"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Create Account Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] bg-white"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold" isLoading={isLoading}>
                <span>Create Business & Launch Category Setup</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          {/* Secure Production Notice */}
          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
              <Lock className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Real Supabase PostgreSQL encrypted session authentication</span>
            </div>
          </div>
        </Card>

        {/* Corporate Identity & Legal Links */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-2 pb-6">
          <p className="font-semibold text-slate-700">
            OrderOne.in • Operated by {PLATFORM_CONFIG.legalCompanyName}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
            <Link href="/about" className="hover:text-slate-900 transition-colors">
              About Us
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-slate-900 transition-colors">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:text-slate-900 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-slate-900 transition-colors">
              Refund Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
