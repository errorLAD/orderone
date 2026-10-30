import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SEO_SOLUTIONS } from '@/lib/marketingContent';
import { SITE_URL } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Business Software Solutions for Retail, Grocery and Restaurants',
  description: 'Explore OrderOne tools for retail POS, restaurant billing, grocery shops, hardware stores, inventory, online ordering and QR menus.',
  alternates: { canonical: `${SITE_URL}/solutions` },
  openGraph: { title: 'OrderOne Business Software Solutions', description: 'Practical billing, product and ordering workflows for Indian businesses.', url: `${SITE_URL}/solutions`, type: 'website' },
};

export default function SolutionsIndexPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PublicHeader />
      <main className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500"><Link href="/" className="hover:text-indigo-700">Home</Link><span className="mx-2">/</span><span aria-current="page">Solutions</span></nav>
          <header className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">OrderOne solutions</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Billing and ordering tools for everyday business</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">Explore how OrderOne’s POS, catalog, storefront and menu workflows fit different retail and food-service operations.</p>
          </header>
          <section aria-label="Business software solutions" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_SOLUTIONS.map((solution) => (
              <Link key={solution.slug} href={`/solutions/${solution.slug}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
                <CheckCircle2 className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                <h2 className="mt-4 text-xl font-bold group-hover:text-indigo-700">{solution.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{solution.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">Explore solution <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </section>
          <div className="mt-12 rounded-3xl bg-slate-900 p-7 text-white sm:p-10">
            <h2 className="text-2xl font-bold">See whether OrderOne fits your workflow</h2>
            <p className="mt-2 max-w-2xl text-slate-300">Review available modules, plans and limits, then create a business account to explore the dashboard.</p>
            <Link href="/login?mode=register" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-5 font-bold hover:bg-indigo-400">Register your business <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
