import { Suspense } from 'react';
import { ChatShell } from '@/components/assistant/ChatShell';

export const metadata = { title: 'AI Assistant' };

export default function Page() {
  return <Suspense fallback={null}><ChatShell variant="full" /></Suspense>;
}
