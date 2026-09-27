'use client';

import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

export const SearchIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
  </svg>
);

const SidebarIcon = ({ className, children }: IconProps & { children: ReactNode }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const OverviewIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </SidebarIcon>
);

export const ArticleIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M6 3h9l3 3v15H6z" />
    <path d="M15 3v4h4M9 12h6M9 16h6" />
  </SidebarIcon>
);

export const OpinionIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M5 5h14v10H9l-4 4z" />
    <path d="M9 9h6M9 12h4" />
  </SidebarIcon>
);

export const MediaIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8" cy="9" r="1.5" />
    <path d="m4 17 5-5 4 4 3-3 4 4" />
  </SidebarIcon>
);

export const CategoryIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M4 5h7l2 2h7v12H4z" />
    <path d="M4 7h16" />
  </SidebarIcon>
);

export const AuthorIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <circle cx="12" cy="8" r="3" />
    <path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" />
  </SidebarIcon>
);

export const PlanningIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h5" />
  </SidebarIcon>
);

export const ScheduledIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </SidebarIcon>
);

export const AnalyticsIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M5 19V9M12 19V5M19 19v-7" />
    <path d="M3 19h18" />
  </SidebarIcon>
);

export const NotificationIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M6 10a6 6 0 0 1 12 0c0 5 2 5 2 7H4c0-2 2-2 2-7" />
    <path d="M10 20h4" />
  </SidebarIcon>
);

export const SyndicationIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <circle cx="6" cy="18" r="1.5" />
    <path d="M6 12a6 6 0 0 1 6 6M6 6a12 12 0 0 1 12 12" />
  </SidebarIcon>
);

export const AuditLogIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="M6 4h12v16H6z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </SidebarIcon>
);

export const SettingsIcon = ({ className }: IconProps) => (
  <SidebarIcon className={className}>
    <path d="m12 3 1 2.1 2.3.5.9-1.1 1.4 1.4-1.1.9.5 2.3 2.1 1v2l-2.1 1-.5 2.3 1.1.9-1.4 1.4-.9-1.1-2.3.5-1 2.1h-2l-1-2.1-2.3-.5-.9 1.1-1.4-1.4 1.1-.9-.5-2.3-2.1-1v-2l2.1-1 .5-2.3-1.1-.9 1.4-1.4.9 1.1 2.3-.5L10 3z" />
    <circle cx="12" cy="12" r="2.5" />
  </SidebarIcon>
);

/**
 * Newshub design-system icons — exact SVG paths/viewBoxes/strokes reused
 * from the storefront (`apps/storefront/.../icons/Icons.tsx`).
 * Visual reuse only: no storefront logic, providers or routing is imported.
 */

export const SunIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708" />
  </svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
  </svg>
);

export const SystemIcon = ({ className }: IconProps) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2.25 2A1.75 1.75 0 0 0 .5 3.75v7.5C.5 12.216 1.284 13 2.25 13h4.875v1.5H5.5a.625.625 0 1 0 0 1.25h5a.625.625 0 1 0 0-1.25H8.875V13h4.875a1.75 1.75 0 0 0 1.75-1.75v-7.5A1.75 1.75 0 0 0 13.75 2h-11.5Zm-.5 1.75a.5.5 0 0 1 .5-.5h11.5a.5.5 0 0 1 .5.5v6.875H1.75V3.75Zm0 8.125h12.5v-.625H1.75v.625Z" />
  </svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg className={className} style={{ fill: 'none' }} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 9l-7 7-7-7" />
  </svg>
);

export const WorldIcon = ({ className }: IconProps) => (
  <svg className={className} style={{ fill: 'none' }} xmlns="http://www.w3.org/2000/svg" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <svg className={className} style={{ fill: 'none' }} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 13l4 4L19 7" />
  </svg>
);
