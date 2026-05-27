import type { Metadata } from 'next';
import { DemoWorkbench } from '../demo/DemoWorkbench';

export const metadata: Metadata = {
  title: 'SafeSpark — a safe way for kids to learn AI by building',
  description: 'Kids ages 10-13 build real games, flashcards, quizzes, tools, and posters with AI. Safe by default. Talk to Spark, watch the code, share what you made.',
};

export default function SparkPage() {
  return <DemoWorkbench initialDemoCode="BELLA-BUILD" />;
}
