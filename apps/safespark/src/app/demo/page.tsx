import { DemoWorkbench } from './DemoWorkbench';

// DemoWorkbench uses useSearchParams() — require dynamic rendering.
export const dynamic = 'force-dynamic';

type DemoPageProps = {
  searchParams: Promise<{ code?: string | string[] }>;
};

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const { code } = await searchParams;
  const initialDemoCode = Array.isArray(code) ? code[0] : code;

  return <DemoWorkbench initialDemoCode={initialDemoCode ?? ''} />;
}
