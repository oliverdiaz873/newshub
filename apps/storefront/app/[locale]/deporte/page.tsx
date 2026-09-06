import { redirect } from '@/i18n/routing';

export default async function DeporteRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/category/deporte', locale: locale as 'es' | 'en' });
}
