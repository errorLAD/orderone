'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Zap,
  Calendar,
  AlertCircle,
  Receipt,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Copy,
  Info,
  Clock,
  ShieldCheck,
  Printer,
  ChevronDown,
  ArrowDownCircle,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { SubscriptionPlan, SubscriptionPayment } from '@/types';
import { formatINR, formatDate, cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';
import { PLATFORM_CONFIG } from '@/lib/platformConfig';
import { trackConversion } from '@/components/analytics/GoogleAnalytics';

export default function SubscriptionPage() {
  const { currentBusiness, refreshBusinesses } = useApp();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);

  // Razorpay Checkout State
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [initiatingRzp, setInitiatingRzp] = useState<boolean>(false);
  const [verifyingPayment, setVerifyingPayment] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    planName: string;
    paymentId: string;
    expiryDate?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [razorpayMissingEnv, setRazorpayMissingEnv] = useState<string[] | null>(null);

  // Downgrade Modal State
  const [showDowngradeModal, setShowDowngradeModal] = useState<boolean>(false);
  const [processingDowngrade, setProcessingDowngrade] = useState<boolean>(false);
  const [downgradeSuccessMsg, setDowngradeSuccessMsg] = useState<string | null>(null);

  // View Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<SubscriptionPayment | null>(null);

  // Fetch active plans (Basic and Gold; Diamond strictly omitted)
  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans.filter((p: SubscriptionPlan) => p.isVisible !== false));
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!currentBusiness) return;
    setLoadingPayments(true);
    try {
      const res = await fetch(`/api/subscriptions/payments?businessId=${currentBusiness.id}`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (e) {
      console.error('Error fetching payment history:', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (currentBusiness) {
      fetchPaymentHistory();
    }
  }, [currentBusiness?.id]);

  // Handle URL param ?plan=gold
  useEffect(() => {
    const targetSlug = searchParams.get('plan');
    if (targetSlug && plans.length > 0) {
      const matched = plans.find((p) => p.slug === targetSlug || p.id === `plan_${targetSlug}`);
      if (matched && matched.id !== currentBusiness?.subscription?.planId) {
        handleStartRazorpayCheckout(matched);
      }
    }
  }, [searchParams, plans, currentBusiness?.subscription?.planId]);

  // Load Razorpay Checkout Script Dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartRazorpayCheckout = async (plan: SubscriptionPlan) => {
    if (!currentBusiness) return;
    setCheckoutPlan(plan);
    setInitiatingRzp(true);
    setErrorMsg(null);
    setRazorpayMissingEnv(null);

    try {
      // 1. Create Order on Server
      const res = await fetch('/api/subscriptions/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          planId: plan.id,
          billingCycle,
        }),
      });

      const orderData = await res.json();

      if (!orderData.success) {
        if (orderData.code === 'RAZORPAY_NOT_CONFIGURED') {
          setRazorpayMissingEnv(orderData.requiredEnvVars || ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
        }
        setErrorMsg(orderData.error || 'Failed to create Razorpay checkout order');
        setInitiatingRzp(false);
        return;
      }

      // 2. Load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setErrorMsg('Razorpay payment gateway failed to load. Please check your internet connection.');
        setInitiatingRzp(false);
        return;
      }

      // 3. Open Official Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'OrderOne.in',
        description: `${orderData.plan.name} Plan — 30 Days Subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.business.name,
          email: orderData.business.email,
          contact: orderData.business.phone,
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response: any) {
          // 4. Server-side Cryptographic Signature Verification
          setVerifyingPayment(true);
          setErrorMsg(null);
          try {
            const verifyRes = await fetch('/api/subscriptions/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: orderData.paymentId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              trackConversion('purchase', {
                transaction_id: response.razorpay_payment_id,
                value: Number(orderData.amount || 0) / 100,
                currency: orderData.currency || 'INR',
                item_name: orderData.plan.name,
                billing_cycle: billingCycle,
              });
              setPaymentSuccess({
                planName: orderData.plan.name,
                paymentId: response.razorpay_payment_id,
                expiryDate: verifyData.subscription?.renewsAt,
              });
              await refreshBusinesses();
              await fetchPaymentHistory();
            } else {
              setErrorMsg(verifyData.error || 'Server payment verification failed.');
            }
          } catch (verErr: any) {
            setErrorMsg(verErr.message || 'Error communicating with verification server.');
          } finally {
            setVerifyingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setInitiatingRzp(false);
            setCheckoutPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        console.error('Razorpay payment failed:', resp.error);
        setErrorMsg(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setInitiatingRzp(false);
      });
      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error launching Razorpay checkout');
      setInitiatingRzp(false);
    }
  };

  // Schedule Downgrade
  const handleScheduleDowngrade = async () => {
    if (!currentBusiness) return;
    setProcessingDowngrade(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          targetPlanId: 'plan_basic',
          action: 'schedule',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDowngradeSuccessMsg(data.message);
        await refreshBusinesses();
        setTimeout(() => {
          setShowDowngradeModal(false);
          setDowngradeSuccessMsg(null);
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Failed to schedule downgrade');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error scheduling downgrade');
    } finally {
      setProcessingDowngrade(false);
    }
  };

  // Cancel Scheduled Downgrade
  const handleCancelDowngrade = async () => {
    if (!currentBusiness) return;
    setProcessingDowngrade(true);
    try {
      const res = await fetch('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          action: 'cancel',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshBusinesses();
      }
    } catch (err: any) {
      console.error('Error cancelling downgrade:', err);
    } finally {
      setProcessingDowngrade(false);
    }
  };

  const currentPlanId = currentBusiness?.subscription?.planId || 'plan_basic';
  const activePlan = plans.find((p) => p.id === currentPlanId) || {
    name: currentPlanId === 'plan_gold' ? 'Gold' : currentPlanId === 'plan_diamond' ? 'Diamond' : 'Basic',
    priceMonthly: currentPlanId === 'plan_gold' ? 149 : currentPlanId === 'plan_diamond' ? 249 : 49,
  };

  // 30-Day Expiry status calculations
  const nowMs = Date.now();
  const renewsAtMs = currentBusiness?.subscription?.renewsAt
    ? new Date(currentBusiness.subscription.renewsAt).getTime()
    : 0;
  const daysRemaining = renewsAtMs > 0 ? Math.ceil((renewsAtMs - nowMs) / (1000 * 60 * 60 * 24)) : 0;
  const isExpired =
    currentBusiness?.subscription?.status === 'expired' ||
    (renewsAtMs > 0 && nowMs > renewsAtMs);
  const isExpiringSoon = !isExpired && daysRemaining > 0 && daysRemaining <= 3;
  const isScheduledDowngrade = Boolean(currentBusiness?.subscription?.scheduledDowngradePlanId);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-[#4F46E5]">
              <CreditCard className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-[#0F172A] tracking-tight">
              Plans, Billing & 30-Day Subscriptions
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Razorpay Secured
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            OrderOne.in • Operated by <strong className="text-slate-800">{PLATFORM_CONFIG.legalCompanyName}</strong>. Dynamic cloud pricing & instant Razorpay activation.
          </p>
        </div>

        {/* 30 Days Badge */}
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Validity: 30 Days per Subscription Cycle</span>
        </div>
      </div>

      {/* Razorpay Configuration Diagnostic Banner (if missing in server env) */}
      {razorpayMissingEnv && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-black text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Razorpay Credentials Required</span>
          </div>
          <p className="text-amber-800">
            To enable Razorpay subscription checkout, please add your Razorpay API keys to{' '}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">.env.local</code>:
          </p>
          <ul className="list-disc pl-5 font-mono text-[11px] space-y-1 text-amber-950">
            {razorpayMissingEnv.map((v) => (
              <li key={v}>
                <span className="font-bold">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scheduled Downgrade Warning Banner */}
      {isScheduledDowngrade && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-blue-900">
            <ArrowDownCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-black text-blue-950">
                Scheduled Downgrade: Transitioning to Basic on{' '}
                {formatDate(currentBusiness?.subscription?.scheduledDowngradeDate)}
              </p>
              <p className="text-blue-700 text-[11px] mt-0.5">
                You retain all Gold benefits until the expiration date. Existing catalog products and categories will stay safe.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelDowngrade}
            disabled={processingDowngrade}
            className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-blue-700 font-bold hover:bg-blue-50 text-xs shadow-2xs self-start sm:self-auto shrink-0"
          >
            {processingDowngrade ? 'Cancelling...' : 'Cancel Downgrade'}
          </button>
        </div>
      )}

      {/* Active Subscription Status Banner */}
      {currentBusiness && (
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-3 rounded-xl border',
                isExpired
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : isExpiringSoon
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
              )}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#0F172A] uppercase">
                  Active Tier: {activePlan.name} Plan
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                    isExpired
                      ? 'bg-rose-100 text-rose-800'
                      : isExpiringSoon
                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                      : 'bg-emerald-100 text-emerald-800'
                  )}
                >
                  {isExpired ? 'Expired' : isExpiringSoon ? `Expiring Soon (${daysRemaining}d left)` : 'Active'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                Pricing: ₹{currentBusiness.subscription?.amount || activePlan.priceMonthly} / 30 days •{' '}
                {isExpired ? (
                  <span className="text-rose-600 font-bold">
                    Expired on {formatDate(currentBusiness.subscription?.renewsAt)}
                  </span>
                ) : (
                  <span>Next Expiry: {formatDate(currentBusiness.subscription?.renewsAt)}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* If on Gold and not scheduled for downgrade, offer downgrade option */}
            {currentPlanId === 'plan_gold' && !isScheduledDowngrade && (
              <button
                type="button"
                onClick={() => setShowDowngradeModal(true)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Downgrade to Basic
              </button>
            )}

            {/* Quick Renew button */}
            <button
              onClick={() => {
                const target = plans.find((p) => p.id === currentPlanId) || plans[0];
                if (target) handleStartRazorpayCheckout(target);
              }}
              disabled={initiatingRzp || verifyingPayment}
              className="px-4 py-2 text-xs font-black text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', (initiatingRzp || verifyingPayment) && 'animate-spin')} />
              <span>{isExpired ? 'Renew 30 Days' : 'Extend 30 Days'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Current Subscription Capacity & Plan Usage Card */}
      <PlanUsageCard />

      {/* Available Plans Grid: Basic (₹49) vs Gold (₹149) */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-black text-slate-900">Choose Your Subscription Plan</h2>
          <p className="text-xs text-slate-500">
            Each subscription payment is processed directly through Razorpay and activates 30 days of validity.
          </p>
        </div>

        <div className={cn(
          'grid gap-6',
          plans.length >= 3 ? 'grid-cols-1 md:grid-cols-3 max-w-5xl' : 'grid-cols-1 md:grid-cols-2 max-w-4xl'
        )}>
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isGold = plan.id === 'plan_gold';
            const price = plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={cn(
                  'bg-white rounded-3xl border p-6 flex flex-col justify-between transition-all relative',
                  plan.isPopular
                    ? 'border-[#4F46E5] shadow-xl ring-2 ring-[#4F46E5]/10'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                )}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#4F46E5] text-white font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-[#0F172A] tracking-tight">{plan.name}</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {isGold ? 'Store + Menu + Custom UPI' : 'Essential Catalog & Menu'}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="my-5 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#0F172A]">{formatINR(price)}</span>
                    <span className="text-xs text-[#64748B] font-bold">/ 30 days</span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {!plan.customUpi && (
                      <div className="flex items-start gap-2 text-slate-400">
                        <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>Custom merchant UPI & dynamic payment QR</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                  <button
                    disabled={initiatingRzp || verifyingPayment}
                    onClick={() => handleStartRazorpayCheckout(plan)}
                    className={cn(
                      'w-full py-2.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5',
                      isCurrent
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        : plan.isPopular
                        ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
                        : 'bg-[#0F172A] hover:bg-slate-800 text-white'
                    )}
                  >
                    {isCurrent ? (
                      isExpired ? (
                        'Re-activate Plan with Razorpay (₹' + price + ')'
                      ) : (
                        `Extend Active Plan (${plan.validityDaysMonthly || 30} Days • ₹${price})`
                      )
                    ) : (
                      <>
                        <span>Select {plan.name} Plan (₹{price})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-slate-400">
                    {isCurrent
                      ? 'Extends validity by 30 days from payment verification'
                      : isGold
                      ? 'Upgrades immediately upon verified payment with 30-day validity'
                      : '30 days validity per cycle'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Security & Legal Links Notice */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 max-w-4xl">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Powered by Razorpay
          </span>
          <span>•</span>
          <Link href="/terms" target="_blank" className="text-[#4F46E5] hover:underline font-medium">
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link href="/refund-policy" target="_blank" className="text-[#4F46E5] hover:underline font-medium">
            Refund & Cancellation Policy
          </Link>
          <span>•</span>
          <Link href="/privacy-policy" target="_blank" className="text-[#4F46E5] hover:underline font-medium">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="font-bold text-[#0F172A] text-sm mb-3">Feature & Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                <th className="p-3">Feature</th>
                <th className="p-3 text-center">Basic (₹49 / 30 days)</th>
                <th className="p-3 text-center text-[#4F46E5]">Gold (₹149 / 30 days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="p-3 font-medium">Validity Term</td>
                <td className="p-3 text-center font-bold text-slate-800">30 Days</td>
                <td className="p-3 text-center font-bold text-[#4F46E5]">30 Days</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Materials & Storefront Module (Hardware & Retail)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Digital Food & Drink Menu (Restaurants & Cafes)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Customer Orders & Token Queue (S- & M- Tokens)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Product & Menu Item Limit</td>
                <td className="p-3 text-center text-slate-800 font-bold">Up to 20 items</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Up to 50 items</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Category Limit</td>
                <td className="p-3 text-center text-slate-800 font-bold">Up to 10 categories</td>
                <td className="p-3 text-center text-emerald-600 font-bold">Up to 30 categories</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Storefront Design & Appearance Customization</td>
                <td className="p-3 text-center text-rose-500 font-semibold">✕ Locked (Gold only)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">Custom Merchant UPI ID & Payment QR Code</td>
                <td className="p-3 text-center text-rose-500 font-semibold">✕ Locked (Gold only)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-3 font-medium">GST Configuration & Official Tax Invoices</td>
                <td className="p-3 text-center text-rose-500 font-semibold">✕ Locked (Gold only)</td>
                <td className="p-3 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Supabase / Razorpay Payment History Table */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#4F46E5]" />
            <h3 className="font-bold text-[#0F172A] text-xs">Payment & Invoice History</h3>
          </div>
          <span className="text-[11px] text-slate-500">Live Supabase / Razorpay Records</span>
        </div>

        {loadingPayments ? (
          <div className="py-6 text-center text-xs text-slate-400">Loading payment history...</div>
        ) : payments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No subscription payments recorded yet. Verified Razorpay purchases will appear here with full invoice receipts.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-3 block sm:hidden">
              {payments.map((p) => (
                <div key={p.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#0F172A] capitalize text-sm">
                        {p.planId.replace('plan_', '')} Plan
                      </span>
                      <p className="text-[11px] text-slate-500">{formatDate(p.createdAt)}</p>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                        p.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                    <span className="font-mono truncate max-w-[180px]">
                      {p.razorpayPaymentId || p.paymentReference || p.id}
                    </span>
                    <span className="font-black text-slate-900 text-xs">{formatINR(p.amount)}</span>
                  </div>

                  {p.status === 'completed' && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="px-3 py-1.5 text-xs font-bold text-[#4F46E5] bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg shadow-2xs transition-all w-full text-center"
                      >
                        View Receipt
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Plan</th>
                    <th className="py-2.5">Provider & Reference</th>
                    <th className="py-2.5">Validity</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-800">{formatDate(p.createdAt)}</td>
                      <td className="py-3 font-bold text-[#0F172A] capitalize">
                        {p.planId.replace('plan_', '')} Plan
                      </td>
                      <td className="py-3 font-mono text-[11px] text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-800">
                            {p.paymentProvider === 'razorpay' ? 'Razorpay' : 'UPI Direct'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {p.razorpayPaymentId || p.paymentReference || p.id}
                        </div>
                      </td>
                      <td className="py-3 text-[11px] text-slate-600">30 Days</td>
                      <td className="py-3 font-black text-slate-900">{formatINR(p.amount)}</td>
                      <td className="py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                            p.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {p.status === 'completed' && (
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="px-2 py-1 text-[11px] font-bold text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            View Receipt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-black">
                <ArrowDownCircle className="w-5 h-5 text-amber-600" />
                <h3>Downgrade to Basic Plan</h3>
              </div>
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {downgradeSuccessMsg ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-black text-sm text-slate-900">Downgrade Scheduled</h4>
                <p className="text-xs text-slate-600">{downgradeSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1.5">
                  <p className="font-bold">Scheduled Policy Terms:</p>
                  <ul className="list-disc pl-4 space-y-1 text-amber-800">
                    <li>
                      Your downgrade will take effect on{' '}
                      <strong>{formatDate(currentBusiness?.subscription?.renewsAt)}</strong> when your current paid 30-day term ends.
                    </li>
                    <li>
                      You will retain all Gold benefits (Store module, custom UPI, GST) until that date.
                    </li>
                    <li>
                      <strong>Zero data deletion:</strong> Existing products and categories will stay completely safe. If you have more than 20 products, new item creation will be paused until capacity fits Basic.
                    </li>
                    <li>You can cancel this downgrade anytime before the effective date.</li>
                  </ul>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDowngradeModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Keep Gold Plan
                  </button>
                  <button
                    type="button"
                    disabled={processingDowngrade}
                    onClick={handleScheduleDowngrade}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black shadow-xs transition-all"
                  >
                    {processingDowngrade ? 'Scheduling...' : 'Confirm Scheduled Downgrade'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div>
              <h3 className="font-black text-slate-900 text-base">Subscription Activated!</h3>
              <p className="text-xs text-slate-600 mt-1">
                Your business is now active on the <strong>{paymentSuccess.planName}</strong> plan.
              </p>
              {paymentSuccess.expiryDate && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  Valid for 30 days until {formatDate(paymentSuccess.expiryDate)}.
                </p>
              )}
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-[11px] space-y-1">
              <p className="text-slate-500">
                Payment ID: <span className="font-mono text-slate-800">{paymentSuccess.paymentId}</span>
              </p>
              <p className="text-slate-500">
                Verified via: <span className="font-bold text-slate-800">Razorpay Cryptographic Signature</span>
              </p>
            </div>
            <button
              onClick={() => setPaymentSuccess(null)}
              className="w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-black text-xs shadow-xs"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto print:p-0 print:border-none">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-black text-slate-900 text-sm">Subscription Payment Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-xs font-sans">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-black text-indigo-600 tracking-tight">OrderOne.in</h2>
                  <p className="text-[10px] text-slate-400">Digital Store & Menu SaaS Platform</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-slate-500 block">
                    Receipt #{selectedReceipt.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{formatDate(selectedReceipt.createdAt)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">Billed To:</p>
                <p className="font-black text-slate-900">{currentBusiness?.name}</p>
                <p className="text-[11px] text-slate-500">{currentBusiness?.email}</p>
              </div>

              <div className="border-t border-b border-slate-100 py-3 space-y-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>
                    {selectedReceipt.planId.replace('plan_', '').toUpperCase()} Plan (30 Days Validity)
                  </span>
                  <span>{formatINR(selectedReceipt.amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Payment Gateway</span>
                  <span className="capitalize">{selectedReceipt.paymentProvider || 'Razorpay'}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Razorpay Reference</span>
                  <span className="font-mono">
                    {selectedReceipt.razorpayPaymentId || selectedReceipt.paymentReference || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-black text-slate-900 text-sm">Total Paid</span>
                <span className="font-black text-slate-900 text-base">{formatINR(selectedReceipt.amount)}</span>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-400">
                Official Razorpay payment verification record • OrderOne.in, operated by {PLATFORM_CONFIG.legalCompanyName}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 flex items-center gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-xl font-black text-xs hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform & Corporate Identity Footer */}
      <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2 pb-6">
        <p className="font-semibold text-slate-700">
          OrderOne.in • Operated by {PLATFORM_CONFIG.legalCompanyName}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
          <Link href="/about" target="_blank" className="hover:text-slate-900 transition-colors">
            About Us
          </Link>
          <span>•</span>
          <Link href="/terms" target="_blank" className="hover:text-slate-900 transition-colors">
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link href="/privacy-policy" target="_blank" className="hover:text-slate-900 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/refund-policy" target="_blank" className="hover:text-slate-900 transition-colors">
            Refund & Cancellation Policy
          </Link>
          <span>•</span>
          <a
            href={`mailto:${PLATFORM_CONFIG.billingEmail}`}
            className="hover:text-slate-900 transition-colors text-indigo-600 font-medium"
          >
            Billing Support: {PLATFORM_CONFIG.billingEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
