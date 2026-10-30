import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SEO_SOLUTIONS } from '@/lib/marketingContent';
import { SITE_URL } from '@/lib/seoConfig';

type Props = { params: { slug: string } };

function getSolution(slug: string) {
  return SEO_SOLUTIONS.find((solution) => solution.slug === slug);
}

export function generateStaticParams() {
  return SEO_SOLUTIONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const solution = getSolution(params.slug);
  if (!solution) return { title: 'Solution not found', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/solutions/${solution.slug}`;
  return {
    title: solution.title,
    description: solution.description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, title: solution.title, description: solution.description },
    twitter: { card: 'summary_large_image', title: solution.title, description: solution.description },
  };
}

export default function SolutionPage({ params }: Props) {
  const solution = getSolution(params.slug);
  if (!solution) notFound();
  const url = `${SITE_URL}/solutions/${solution.slug}`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Solutions', item: `${SITE_URL}/solutions` },
      { '@type': 'ListItem', position: 3, name: solution.title, item: url },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: solution.faqs.map((faq) => ({
      '@type': 'Question', name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumb, faqSchema]) }} />
      <PublicHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <article className="mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500"><Link href="/" className="hover:text-indigo-700">Home</Link><span className="mx-2">/</span><Link href="/solutions" className="hover:text-indigo-700">Solutions</Link><span className="mx-2">/</span><span aria-current="page">{solution.title}</span></nav>
          <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-700">OrderOne business tools</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{solution.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600">{solution.intro}</p>
            <Link href="/login?mode=register" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700">Register your business <ArrowRight className="h-4 w-4" /></Link>
          </header>
          <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="How this workflow helps">
            {solution.benefits.map((benefit) => <div key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6"><CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold">{benefit.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p></div>)}
          </section>
          <section className="mt-10 rounded-3xl bg-indigo-50 p-6 sm:p-9">
            <h2 className="text-2xl font-bold">A simple way to get started</h2>
            <ol className="mt-5 grid gap-4 md:grid-cols-3">
              {solution.workflow.map((step, index) => <li key={step} className="rounded-2xl bg-white p-5"><span className="text-xs font-black uppercase tracking-widest text-indigo-700">Step {index + 1}</span><p className="mt-2 font-semibold leading-6">{step}</p></li>)}
            </ol>
          </section>
          <section className="mt-10">
            <h2 className="text-2xl font-bold">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-6">
              {solution.faqs.map((faq) => <div key={faq.q} className="py-5"><h3 className="font-bold">{faq.q}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</p></div>)}
            </div>
          </section>
          <aside className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-bold">Related OrderOne workflows</h2>
            <div className="mt-3 flex flex-wrap gap-3">{SEO_SOLUTIONS.filter((item) => item.slug !== solution.slug && (item.slug.includes('qr') || item.slug.includes('billing') || item.slug.includes('inventory'))).slice(0, 4).map((item) => <Link key={item.slug} href={`/solutions/${item.slug}`} className="text-sm font-semibold text-indigo-700 hover:underline">{item.title}</Link>)}</div>
            <Link href="/resources" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline">Read practical guides <ArrowRight className="h-4 w-4" /></Link>
          </aside>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
