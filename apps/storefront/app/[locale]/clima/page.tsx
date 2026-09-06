import { redirect } from '@/i18n/routing';

export default async function ClimaRedirect({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/category/clima', locale: locale as 'es' | 'en' });
}
