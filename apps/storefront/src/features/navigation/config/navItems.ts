/**
 * Configuración central del menú de navegación del sitio (Navbar/Sidebar).
 * Cada item contiene nameKey (clave para i18n) y path (ruta de navegación).
 */
export interface NavItem {
  nameKey: string;
  path: string;
}

export const navItems: NavItem[] = [
  { nameKey: 'home', path: '/' },
  { nameKey: 'politics', path: '/category/politica' },
  { nameKey: 'international', path: '/category/internacional' },
  { nameKey: 'economy', path: '/category/economia' },
  { nameKey: 'health', path: '/category/salud' },
  { nameKey: 'sports', path: '/category/deporte' },
  { nameKey: 'weather', path: '/category/clima' },
  { nameKey: 'justice', path: '/category/justicia' },
];
