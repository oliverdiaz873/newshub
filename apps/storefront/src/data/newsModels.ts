export interface NewsArticle {
  id: string;
  title: string;
  href: string;
  category: string;
  date: string;
  datetime: string;
  summary: string;
  imageUrl: string;
  alt: string;
  isBreaking?: boolean;
  // F1.1 API-first provenance (optional so local static data keeps compiling).
  // Present when mapped from the NestJS API; absent on legacy local objects.
  author?: { slug: string; name: string; bio: string | null } | null;
  updatedAt?: string;
  fallback?: boolean;
  localeResolved?: string;
}

export interface FullNewsArticle extends NewsArticle {
  content: string[];
  relatedNews: NewsArticle[];
  breadcrumb: {
    home: string;
    category: string;
    current: string;
  };
}

export interface OpinionArticle {
  id: string;
  title: string;
  href: string;
  category: string;
  slug?: string;
  summary: string;
  imageUrl: string;
  alt: string;
  date: string;
  datetime: string;
  // F2.0 API-first provenance (optional so local static data keeps compiling).
  author?: { slug: string; name: string; bio: string | null } | null;
  updatedAt?: string;
  fallback?: boolean;
  localeResolved?: string;
}


export interface FeaturedSectionContent {
  title: string;
  // F4.0: API pools may be thin; callers tolerate undefined entries
  // (FeaturedNewsSection drops them and renders nothing when empty).
  primary: NewsArticle | undefined;
  secondary: (NewsArticle | undefined)[];
  grid: NewsArticle[];
}

export interface CategoryPageContent {
  slug: string;
  label: string;
  description: string;
  featuredSection: FeaturedSectionContent;
  latestTitle: string;
  latestNews: NewsArticle[];
  sidebarTitle: string;
  sidebarNews: NewsArticle[];
  opinionArticles: OpinionArticle[];
}

export type ArticleContent = FullNewsArticle;
