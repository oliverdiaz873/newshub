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
}


export interface FeaturedSectionContent {
  title: string;
  primary: NewsArticle;
  secondary: [NewsArticle, NewsArticle, NewsArticle];
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
