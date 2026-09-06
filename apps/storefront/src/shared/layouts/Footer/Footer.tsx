import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { FacebookIcon, TwitterIcon, InstagramIcon } from '../../components/icons';

/**
 * Footer
 * 
 * Componente de pie de página global.
 * Contiene derechos reservados, redes sociales y enlaces legales.
 */
export const Footer = async () => {
  const t = await getTranslations('footer');

  return (
    <footer className="w-full bg-[rgba(0,0,0,0.85)] text-white py-5 md:pt-4 md:pb-6 lg:pt-5 lg:px-7 lg:pb-7 text-center">
      <div className="flex flex-col items-center gap-4 md:gap-[15px] lg:gap-5 max-w-[1200px] mx-auto">
        
        {/* Derechos reservados */}
        <div className="text-[18px]">
          <small>{t('copyright', { year: new Date().getFullYear() })}</small>
        </div>

        {/* Íconos de redes sociales */}
        <div className="flex gap-[25px]">
          <a href="https://facebook.com/newshub" target="_blank" rel="nofollow noopener noreferrer" aria-label={t('visitFacebook')} className="text-white hover:text-[#fd3030ec] hover:scale-120 transition-all duration-300">
            <FacebookIcon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
          </a>
          <a href="https://twitter.com/newshub" target="_blank" rel="nofollow noopener noreferrer" aria-label={t('visitTwitter')} className="text-white hover:text-[#fd3030ec] hover:scale-120 transition-all duration-300">
            <TwitterIcon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
          </a>
          <a href="https://instagram.com/newshub" target="_blank" rel="nofollow noopener noreferrer" aria-label={t('visitInstagram')} className="text-white hover:text-[#fd3030ec] hover:scale-120 transition-all duration-300">
            <InstagramIcon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
          </a>
        </div>

        {/* Enlaces legales */}
        <div className="footer-links">
          <Link href="/legal/privacy" title={t('privacyPolicy')}>{t('privacyPolicy')}</Link>
          <span className="mx-2 w-px h-4 bg-gray-400 inline-block align-middle" />
          <Link href="/legal/terms" title={t('termsOfUse')}>{t('termsOfUse')}</Link>
        </div>
      </div>
    </footer>
  );
};
