import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SEO_ARTICLES, SEO_SOLUTIONS } from '@/lib/marketingContent';
import { SITE_URL } from '@/lib/seoConfig';

type Props = { params: { slug: string } };
const getArticle = (slug: string) => SEO_ARTICLES.find((article) => article.slug === slug);

export function generateStaticParams() {
  return SEO_ARTICLES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle(params.slug);
  if (!article) return { title: 'Guide not found', robots: { index: false, follow: false } };
  const url = `${SITE_URL}/resources/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: article.title, description: article.description },
    twitter: { card: 'summary_large_image', title: article.title, description: article.description },
  };
}

export default function ResourceArticlePage({ params }: Props) {
  const article = getArticle(params.slug);
  if (!article) notFound();
  const url = `${SITE_URL}/resources/${article.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        mainEntityOfPage: url,
        publisher: { '@id': `${SITE_URL}/#organization` },
        author: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Resources', item: `${SITE_URL}/resources` },
          { '@type': 'ListItem', position: 3, name: article.title, item: url },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <article className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500"><Link href="/" className="hover:text-indigo-700">Home</Link><span className="mx-2">/</span><Link href="/resources" className="hover:text-indigo-700">Resources</Link><span className="mx-2">/</span><span aria-current="page">{article.title}</span></nav>
          <header><p className="text-sm font-bold uppercase tracking-widest text-indigo-700">Business guide</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{article.title}</h1><p className="mt-5 text-lg leading-relaxed text-slate-600">{article.intro}</p></header>
          <div className="mt-9 space-y-9">
            {article.sections.map((section) => <section key={section.heading}><h2 className="text-2xl font-bold">{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 leading-7 text-slate-700">{paragraph}</p>)}{section.steps && <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>}</section>)}
          </div>
          <section className="mt-10 rounded-2xl bg-indigo-50 p-6">
            <h2 className="font-bold">Explore related workflows</h2>
            <div className="mt-3 flex flex-wrap gap-4">{article.relatedSolutions.map((slug) => { const solution = SEO_SOLUTIONS.find((item) => item.slug === slug); return solution ? <Link key={slug} href={`/solutions/${slug}`} className="text-sm font-semibold text-indigo-700 hover:underline">{solution.title}</Link> : null; })}</div>
            <Link href="/login?mode=register" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white hover:bg-indigo-700">Register your business <ArrowRight className="h-4 w-4" /></Link>
          </section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
