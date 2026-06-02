import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LESSONS, getLessonBySlug } from '../lessons';
import { LessonView } from './LessonView';

type LessonRouteParams = { slug: string };

/**
 * Pre-render every lesson at build time. Static content; no runtime
 * data fetch needed.
 */
export function generateStaticParams(): LessonRouteParams[] {
  return LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LessonRouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) {
    return { title: 'SafeSpark — Lesson not found' };
  }
  return {
    title: `SafeSpark — ${lesson.title}`,
    description: lesson.description,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<LessonRouteParams>;
}) {
  const { slug } = await params;
  const lesson = getLessonBySlug(slug);
  if (!lesson) notFound();
  return <LessonView slug={slug} />;
}
