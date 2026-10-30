'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Trash2, Save, RefreshCw, FileText, Eye, Download, Printer, CalendarDays } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils';
import { PosBill } from '@/types';
import { downloadPosBillPdf } from '@/lib/posPdfGenerator';

type DraftItem = { productName: string; quantity: string; unit: string; unitPrice: string };
type SalesReport = {
  channels: Record<'pos' | 'calculator' | 'store' | 'menu', { count: number; revenue: number }>;
  totalCount: number; totalRevenue: number;
};
const dateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function CalculatorPage() {
  const { currentBusiness, currentRole, currentUser } = useApp();
  const isBusinessOwner = (currentUser?.role || currentRole) === 'owner';
  const [tab, setTab] = useState<'billing' | 'history' | 'sales'>('billing');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [billExpanded, setBillExpanded] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [lineName, setLineName] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineUnit, setLineUnit] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('0');
  const [taxRate, setTaxRate] = useState(String(currentBusiness?.settings?.orderSettings?.taxRatePercentage || 0));
  const [bills, setBills] = useState<PosBill[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyOffset = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PosBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestId, setRequestId] = useState('');
  const [startDate, setStartDate] = useState(dateInput(new Date()));
  const [endDate, setEndDate] = useState(dateInput(new Date()));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const totals = useMemo(() => {
    const subtotal = Math.round(items.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const price = Number(row.unitPrice) || 0;
      return sum + Math.round(quantity * price * 100) / 100;
    }, 0) * 100) / 100;
    const rawDiscount = Math.max(0, Number(discountValue) || 0);
    const discount = Math.min(subtotal, Math.round((discountType === 'percentage'
      ? subtotal * rawDiscount / 100 : rawDiscount) * 100) / 100);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round(taxable * Math.max(0, Number(taxRate) || 0)) / 100;
    return { subtotal, discount, tax, total: Math.round((taxable + tax) * 100) / 100 };
  }, [items, discountType, discountValue, taxRate]);

  const loadBills = useCallback(async (append = false) => {
    if (!currentBusiness?.id) return;
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const offset = append ? historyOffset.current : 0;
      const response = await fetch(`/api/calculator/bills?businessId=${encodeURIComponent(currentBusiness.id)}&limit=50&offset=${offset}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load bills.');
      setBills(current => append ? [...current, ...(data.bills || [])] : data.bills || []);
      setHistoryTotal(data.totalCount || 0);
      historyOffset.current = offset + (data.bills || []).length;
    } catch (e: any) { setError(e.message || 'Could not load bills.'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [currentBusiness?.id]);

  const loadReport = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setReportLoading(true);
    setError('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const query = new URLSearchParams({ businessId: currentBusiness.id, startDate, endDate, timeZone });
      const response = await fetch(`/api/calculator/reports?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load sales report.');
      setReport(data.report);
    } catch (e: any) { setError(e.message || 'Could not load sales report.'); }
    finally { setReportLoading(false); }
  }, [currentBusiness?.id, startDate, endDate]);

  useEffect(() => { void loadBills(); }, [loadBills]);
  useEffect(() => { if (tab === 'sales') void loadReport(); }, [tab, loadReport]);
  useEffect(() => {
    const configuredTax = currentBusiness?.settings?.orderSettings?.taxRatePercentage;
    if (typeof configuredTax === 'number') setTaxRate(String(configuredTax));
  }, [currentBusiness?.id, currentBusiness?.settings?.orderSettings?.taxRatePercentage]);

  const updateItem = (index: number, key: keyof DraftItem, value: string) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };
  const runOperation = (left: number, right: number, op: string) => {
    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') return right === 0 ? NaN : left / right;
    return right;
  };
  const pressCalculatorKey = (key: string) => {
    setError('');
    if (/^\d$/.test(key)) {
      setDisplay(current => waitingForOperand || current === '0' ? key : current.length < 14 ? current + key : current);
      setWaitingForOperand(false);
      return;
    }
    if (key === '.') {
      setDisplay(current => waitingForOperand ? '0.' : current.includes('.') ? current : current + '.');
      setWaitingForOperand(false);
      return;
    }
    if (key === 'AC') {
      setDisplay('0'); setExpression(''); setStoredValue(null); setPendingOperator(null); setWaitingForOperand(false);
      return;
    }
    if (key === 'DEL') {
      setDisplay(current => current.length > 1 ? current.slice(0, -1) : '0');
      setWaitingForOperand(false);
      return;
    }
    if (key === '%') {
      const value = Number(display) / 100;
      setDisplay(String(Number(value.toPrecision(10))));
      setWaitingForOperand(true);
      return;
    }
    if (key === '+/-') {
      setDisplay(current => String(-Number(current)));
      return;
    }
    if (key === '=') {
      if (pendingOperator && storedValue !== null) {
        const result = runOperation(storedValue, Number(display), pendingOperator);
        if (!Number.isFinite(result)) { setError('Cannot divide by zero.'); return; }
        const rounded = Number(result.toFixed(2));
        setDisplay(String(rounded)); setExpression(''); setStoredValue(null); setPendingOperator(null); setWaitingForOperand(true);
      }
      return;
    }
    if (['+', '-', '*', '/'].includes(key)) {
      let left = Number(display);
      if (pendingOperator && storedValue !== null && !waitingForOperand) {
        left = runOperation(storedValue, Number(display), pendingOperator);
        if (!Number.isFinite(left)) { setError('Cannot divide by zero.'); return; }
        left = Number(left.toFixed(2));
        setDisplay(String(left));
      }
      const operatorLabel = key === '*' ? '×' : key === '/' ? '÷' : key === '-' ? '−' : key;
      setStoredValue(left); setPendingOperator(key); setExpression(`${left} ${operatorLabel}`); setWaitingForOperand(true);
    }
  };
  const addCalculatedLine = () => {
    if (pendingOperator && storedValue !== null) {
      setError('Press = to finish the calculation before adding it to the bill.'); return;
    }
    const amount = Number(display);
    const quantity = Number(lineQuantity);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter a valid amount and a quantity greater than zero.'); return;
    }
    setItems(current => [...current, {
      productName: lineName.trim() || `Item ${current.length + 1}`,
      quantity: String(quantity), unit: lineUnit.trim(), unitPrice: amount.toFixed(2),
    }]);
    setLineName(''); setLineQuantity('1'); setLineUnit('');
    setDisplay('0'); setExpression(''); setStoredValue(null); setPendingOperator(null); setWaitingForOperand(false);
    setError(''); setNotice('');
  };
  const saveBill = async () => {
    if (!currentBusiness?.id || saving) return;
    const validItems = items.filter(item => Number(item.quantity) > 0 && Number(item.unitPrice) >= 0 && item.unitPrice.trim() !== '');
    if (!validItems.length) { setError('Enter a quantity and price for at least one item.'); return; }
    setSaving(true); setError(''); setNotice('');
    const stableRequestId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setRequestId(stableRequestId);
    try {
      const response = await fetch('/api/calculator/bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusiness.id, requestId: stableRequestId,
          items: validItems.map(item => ({ productName: item.productName, quantity: Number(item.quantity), unit: item.unit, unitPrice: Number(item.unitPrice) })),
          discountType, discountValue: Number(discountValue) || 0, taxRate: Number(taxRate) || 0 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bill could not be saved.');
      const isNewBill = !bills.some(bill => bill.id === data.bill.id);
      setBills(current => [data.bill, ...current.filter(bill => bill.id !== data.bill.id)]);
      if (isNewBill) setHistoryTotal(current => current + 1);
      setNotice(`Bill ${data.bill.billNumber} saved with all items.`);
      setSelectedBill(data.bill); setItems([]); setDiscountValue('0');
      setDisplay('0'); setExpression(''); setStoredValue(null); setPendingOperator(null); setWaitingForOperand(false);
      setRequestId(''); setTab('history');
    } catch (e: any) { setError(e.message || 'Bill could not be saved.'); }
    finally { setSaving(false); }
  };

  if (!isBusinessOwner) {
    return <main className="mx-auto max-w-3xl p-5 sm:p-8"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">The Calculator is available to the business owner.</div></main>;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 pb-28 sm:space-y-6 sm:pb-24">
      <header className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200"><Calculator size={21} /></span>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Billing tools</p><h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Calculator</h1><p className="hidden text-sm text-slate-500 sm:block">Manual bills and sales across your business.</p></div>
        </div>
        <button onClick={() => { void loadBills(); if (tab === 'sales') void loadReport(); }} aria-label="Refresh calculator data" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 sm:px-4"><RefreshCw size={16} /><span className="hidden sm:inline">Refresh</span></button>
      </header>

      <nav className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:gap-2 sm:p-2" aria-label="Calculator sections">
        {([['billing', 'Manual Billing', Calculator], ['history', 'Bill History', FileText], ['sales', 'Daily Sales', CalendarDays]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); setError(''); }} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-1.5 text-[11px] font-semibold transition sm:min-h-12 sm:gap-2 sm:px-3 sm:text-sm ${tab === id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={15} className="shrink-0 sm:h-4 sm:w-4" /><span className="truncate">{label}</span></button>
        ))}
      </nav>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {tab === 'billing' && <section className="grid items-start gap-4 xl:grid-cols-[minmax(290px,0.85fr)_minmax(0,1.15fr)] xl:gap-5">
        <div className="min-w-0">
          <section className="mx-auto w-full max-w-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 xl:mx-0 xl:max-w-none" aria-label="Calculator keypad">
            <div className="flex min-h-28 flex-col justify-end overflow-hidden rounded-2xl bg-slate-950 px-4 py-3 text-right text-white shadow-inner sm:min-h-32 sm:px-5 sm:py-4">
              <div className="min-h-5 truncate text-xs font-medium text-slate-400" aria-live="polite">{expression || 'AMOUNT'}</div>
              <output className="mt-1 block truncate text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl" aria-label={`Calculator value ${display}`}><span className="mr-1 text-2xl text-slate-400 sm:text-3xl">&#8377;</span>{display}</output>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-2.5">
              {['AC','DEL','%','/','7','8','9','*','4','5','6','-','1','2','3','+','+/-','0','.','='].map(key => {
                const special = ['AC','DEL','%','/','*','-','+','='].includes(key);
                const label = key === '*' ? '×' : key === '/' ? '÷' : key === '-' ? '−' : key === '+/-' ? '±' : key;
                return <button key={key} type="button" onClick={() => pressCalculatorKey(key)} aria-label={key === 'DEL' ? 'Delete last digit' : label} className={`min-h-14 rounded-xl text-lg font-semibold transition duration-150 active:scale-[0.97] sm:min-h-16 sm:rounded-2xl ${key === '=' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' : special ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>{label}</button>;
              })}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4">
              <div className="mb-3"><p className="text-sm font-bold text-slate-900">Add amount to bill</p><p className="mt-0.5 text-xs text-slate-500">Enter an optional name, quantity, or unit.</p></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_84px_92px]">
                <label className="col-span-2 min-w-0 text-[11px] font-semibold text-slate-500 sm:col-span-1 sm:text-xs">Item name <input value={lineName} onChange={e => setLineName(e.target.value)} placeholder="Optional item name" className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
                <label className="min-w-0 text-[11px] font-semibold text-slate-500 sm:text-xs">Qty <input type="number" inputMode="decimal" min="0.001" step="0.001" value={lineQuantity} onChange={e => setLineQuantity(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
                <label className="min-w-0 text-[11px] font-semibold text-slate-500 sm:text-xs">Unit <input value={lineUnit} onChange={e => setLineUnit(e.target.value)} placeholder="pcs / kg" className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
              </div>
              <button type="button" onClick={addCalculatedLine} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"><span aria-hidden="true">+</span> Add {formatINR(Number(display) || 0)} to bill</button>
            </div>
          </section>
        </div>
        <section className="min-w-0 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600">Bill total</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1"><strong className="text-2xl font-bold tracking-tight text-slate-900">{formatINR(totals.total)}</strong><span className="text-xs font-medium text-slate-500">{items.length} item{items.length === 1 ? '' : 's'}</span></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setBillExpanded(value => !value)} aria-expanded={billExpanded} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:text-sm">{billExpanded ? 'Hide items' : 'View items'}</button>
              <button onClick={saveBill} disabled={saving || totals.total <= 0} className="hidden min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 xl:inline-flex"><Save size={17} />{saving ? 'Saving...' : 'Save bill'}</button>
            </div>
          </div>
          {billExpanded && <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Bill items</h2><p className="mt-0.5 text-xs text-slate-500">Edit item details, discount, or tax.</p></div>{items.length > 0 && <button type="button" onClick={() => setItems([])} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 sm:text-sm">Clear all</button>}</div>
            {items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm"><FileText size={19} /></span><p className="mt-3 text-sm font-semibold text-slate-700">Your bill is empty</p><p className="mt-1 text-xs text-slate-500">Use the keypad, then tap Add to bill.</p></div> : <div className="space-y-2.5">{items.map((item, index) => <div key={index} className="grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-[minmax(0,1fr)_76px_90px_110px_40px] sm:items-end sm:gap-2.5">
              <label className="col-span-2 min-w-0 text-[11px] font-semibold text-slate-500 sm:col-span-1 sm:text-xs">Item name <input value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} placeholder={`Item ${index + 1}`} className="mt-1 min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></label>
              <label className="min-w-0 text-[11px] font-semibold text-slate-500 sm:text-xs">Qty <input type="number" inputMode="decimal" min="0.001" step="0.001" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} className="mt-1 min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400" /></label>
              <label className="min-w-0 text-[11px] font-semibold text-slate-500 sm:text-xs">Unit <input value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} placeholder="pcs" className="mt-1 min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400" /></label>
              <label className="min-w-0 text-[11px] font-semibold text-slate-500 sm:text-xs">Each (&#8377;) <input type="number" inputMode="decimal" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(index, 'unitPrice', e.target.value)} className="mt-1 min-h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-indigo-400" /></label>
              <button type="button" aria-label={`Remove bill item ${index + 1}`} onClick={() => setItems(current => current.filter((_, i) => i !== index))} className="mt-5 grid min-h-10 min-w-10 place-items-center self-end rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button>
              <p className="col-span-2 text-right text-xs font-bold text-slate-800 sm:col-span-5">Line total: {formatINR((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</p>
            </div>)}</div>}
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Discount <div className="mt-1 flex"><select value={discountType} onChange={e => setDiscountType(e.target.value as 'fixed' | 'percentage')} className="min-h-11 rounded-l-lg border border-slate-200 bg-slate-50 px-2 text-sm"><option value="fixed">Amount</option><option value="percentage">Percent</option></select><input type="number" inputMode="decimal" min="0" max={discountType === 'percentage' ? 100 : undefined} value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-r-lg border border-l-0 border-slate-200 px-3 text-sm" /></div></label>
              <label className="text-sm font-semibold text-slate-700">Tax rate (%) <input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
            </div>
          </div>}
        </section>
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur xl:hidden">
          <div><p className="text-[11px] font-medium uppercase text-slate-500">Bill total</p><p className="text-xl font-bold text-slate-900">{formatINR(totals.total)}</p></div>
          <button onClick={saveBill} disabled={saving || totals.total <= 0} className="inline-flex min-h-12 min-w-[155px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white disabled:opacity-50"><Save size={17} /> {saving ? 'Saving...' : 'Save bill'}</button>
        </div>
      </section>}
      {tab === 'history' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="text-lg font-bold text-slate-900">Saved calculator bills</h2><p className="mt-1 text-sm text-slate-500">{bills.length} recent bill{bills.length === 1 ? '' : 's'}</p></div><button onClick={() => void loadBills()} className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-200 text-slate-600" aria-label="Refresh bill history"><RefreshCw size={16} /></button></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading saved bills…</p> : bills.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-semibold text-slate-700">No calculator bills yet</p><button onClick={() => setTab('billing')} className="mt-3 text-sm font-semibold text-indigo-600">Create your first bill</button></div> : <><div className="divide-y divide-slate-100">{bills.map(bill => <article key={bill.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="min-w-0"><p className="font-bold text-slate-900">{bill.billNumber} <span className="ml-1 text-xs font-medium text-indigo-600">Manual</span></p><p className="mt-1 text-xs text-slate-500">{new Date(bill.createdAt).toLocaleDateString('en-IN')} · {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {bill.items.length} item{bill.items.length === 1 ? '' : 's'}</p><p className="mt-1 truncate text-xs text-slate-500">{bill.items.map(item => item.productName).join(', ')}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><strong className="text-lg text-slate-900">{formatINR(bill.totalAmount)}</strong><button onClick={() => setSelectedBill(bill)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"><Eye size={16} /> View</button><button onClick={() => void downloadPosBillPdf(bill, currentBusiness)} className="grid min-h-10 min-w-10 place-items-center rounded-lg border border-slate-200 text-slate-600" aria-label={`Download ${bill.billNumber} PDF`}><Download size={16} /></button></div></article>)}</div>{bills.length < historyTotal && <div className="border-t border-slate-100 p-4 text-center"><button onClick={() => void loadBills(true)} disabled={loadingMore} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">{loadingMore ? 'Loading…' : `Load older bills (${historyTotal - bills.length} remaining)`}</button></div>}</>}
      </section>}

      {tab === 'sales' && <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:p-5"><label className="flex-1 text-xs font-semibold text-slate-500">From <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3"><CalendarDays size={16} /><input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none" /></span></label><label className="flex-1 text-xs font-semibold text-slate-500">To <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3"><CalendarDays size={16} /><input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none" /></span></label><button onClick={() => void loadReport()} disabled={reportLoading} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60">{reportLoading ? 'Loading…' : 'Apply dates'}</button></div>
        {report && <><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-indigo-600 p-5 text-white"><p className="text-sm text-indigo-100">Total revenue</p><p className="mt-2 text-3xl font-bold">{formatINR(report.totalRevenue)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Bills and orders</p><p className="mt-2 text-3xl font-bold text-slate-900">{report.totalCount}</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([['pos','POS billing'],['calculator','Manual calculator'],['store','Store orders'],['menu','Menu orders']] as const).map(([key,label]) => <article key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatINR(report.channels[key].revenue)}</p><p className="mt-1 text-xs text-slate-500">{report.channels[key].count} bill{report.channels[key].count === 1 ? '' : 's/orders'}</p></article>)}</div></>}
        {!report && !reportLoading && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Choose a date range to load sales from saved POS bills, calculator bills, Store Orders, and Menu Orders.</div>}
      </section>}

      {selectedBill && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Bill details" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedBill(null); }}>
        <div className="print-area max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Manual bill</p><h2 className="mt-1 text-xl font-bold text-slate-900">{selectedBill.billNumber}</h2><p className="mt-1 text-sm text-slate-500">{new Date(selectedBill.createdAt).toLocaleString('en-IN')}</p></div><button onClick={() => setSelectedBill(null)} className="min-h-10 min-w-10 rounded-full bg-slate-100 text-slate-700" aria-label="Close bill details">×</button></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Item</th><th className="py-2 text-right">Qty / unit</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{selectedBill.items.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="py-3 font-medium text-slate-800">{item.productName}</td><td className="py-3 text-right text-slate-600">{item.quantity} {item.unit || ''}</td><td className="py-3 text-right text-slate-600">{formatINR(item.unitPrice)}</td><td className="py-3 text-right font-semibold text-slate-900">{formatINR(item.totalPrice)}</td></tr>)}</tbody></table></div>
          <dl className="ml-auto mt-5 max-w-xs space-y-2 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(selectedBill.subtotal)}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>− {formatINR(selectedBill.discountAmount)}</dd></div><div className="flex justify-between"><dt>Tax ({selectedBill.taxRate}%)</dt><dd>{formatINR(selectedBill.taxAmount)}</dd></div><div className="flex justify-between border-t pt-3 text-base font-bold"><dt>Total</dt><dd>{formatINR(selectedBill.totalAmount)}</dd></div></dl>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"><Printer size={16} /> Print bill</button><button onClick={() => void downloadPosBillPdf(selectedBill, currentBusiness)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"><Download size={16} /> Download PDF</button></div>
        </div>
        <style jsx global>{`@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: fixed !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; box-shadow: none !important; } }`}</style>
      </div>}
    </main>
  );
}
