import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { App } from '@/components/app';
import { AuthScreen } from '@/components/auth-screen';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const path = '/' + ((await params).path ?? []).join('/');
  const session = await auth.api.getSession({ headers: await headers() });
  if (path === '/login' || path === '/signup') {
    if (session) redirect('/dashboard');
    return <AuthScreen signup={path === '/signup'} />;
  }
  if (!session) redirect('/login');
  if (path === '/') redirect('/dashboard');
  return <App />;
}
