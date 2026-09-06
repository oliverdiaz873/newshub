import { redirect } from '@/i18n/routing';

export default async function InternacionalRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/category/internacional', locale: locale as 'es' | 'en' });
}
