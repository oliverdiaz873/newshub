/** Anti-flicker inline script (same behavior as the mockup `<head>` snippet). Server-safe: no client directives. */
export function themeInitScript(): string {
  return `(function(){try{var k='newshub-theme';var p=localStorage.getItem(k);var r=p==='light'||p==='dark'?p:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(p!=='light'&&p!=='dark')r=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',r);document.documentElement.setAttribute('data-theme-preference',p||'system');document.documentElement.style.colorScheme=r;}catch(e){}})();`;
}
