import { redirect } from '@/i18n/routing';

export default async function JusticiaRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/category/justicia', locale: locale as 'es' | 'en' });
}
