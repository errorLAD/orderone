import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenText } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SEO_ARTICLES } from '@/lib/marketingContent';
import { SITE_URL } from '@/lib/seoConfig';

export const metadata: Metadata = {
  title: 'Guides for Retail, Grocery and Restaurant Owners',
  description: 'Practical guides to retail billing, product catalogs, restaurant QR menus and day-to-day shop workflows.',
  alternates: { canonical: `${SITE_URL}/resources` },
  openGraph: { type: 'website', url: `${SITE_URL}/resources`, title: 'OrderOne Guides and Resources', description: 'Practical software and operations guides for Indian business owners.' },
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <PublicHeader />
      <main className="flex-1 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500"><Link href="/" className="hover:text-indigo-700">Home</Link><span className="mx-2">/</span><span aria-current="page">Resources</span></nav>
          <header className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-widest text-indigo-700">OrderOne resources</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Practical guides for running your shop</h1><p className="mt-5 text-lg leading-relaxed text-slate-600">Straightforward checklists for billing, catalogs, QR menus and the workflows small businesses manage every day.</p></header>
          <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Guides">
            {SEO_ARTICLES.map((article) => <article key={article.slug} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><BookOpenText className="h-6 w-6 text-indigo-600" aria-hidden="true" /><h2 className="mt-4 text-xl font-bold"><Link href={`/resources/${article.slug}`} className="hover:text-indigo-700">{article.title}</Link></h2><p className="mt-3 text-sm leading-6 text-slate-600">{article.description}</p><Link href={`/resources/${article.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700">Read guide <ArrowRight className="h-4 w-4" /></Link></article>)}
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
