import { redirect } from '@/i18n/routing';

export default async function PoliticaRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/category/politica', locale: locale as 'es' | 'en' });
}
