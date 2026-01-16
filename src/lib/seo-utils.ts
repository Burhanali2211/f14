/**
 * SEO utility functions for generating meta tags and structured data
 * Optimized for search engine ranking - piece names, recitations, Islamic poetry
 */

import { getFirstImageUrl } from './utils';
import type { Piece, Category, Imam } from './supabase-types';

const SITE_NAME = 'Followers of 14';
const SITE_ALT_NAMES = ['Khanda Azaadars', 'Lyrics Hub', 'F14'];
const SITE_URL = 'https://followersof14.com';

/**
 * Generate SEO-optimized meta description from piece content
 * Prioritizes piece title/name for search ranking
 */
export function generateMetaDescription(piece: Piece, maxLength = 160): string {
  const title = piece.title || '';
  const reciter = piece.reciter || '';
  const language = piece.language || '';
  
  let desc = `${title}`;
  if (reciter) desc += ` by ${reciter}`;
  desc += ` - Read complete text, lyrics & audio.`;
  
  if (piece.text_content && piece.text_content.length > 0) {
    const cleanText = piece.text_content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .trim()
      .substring(0, 80);
    
    if (cleanText.length > 20) {
      desc += ` "${cleanText}..."`;
    }
  }
  
  desc += ` Free on ${SITE_NAME}.`;
  
  if (desc.length > maxLength) {
    desc = desc.substring(0, maxLength - 3) + '...';
  }
  
  return desc;
}

/**
 * Generate comprehensive keywords for piece - optimized for search ranking
 */
export function generateKeywords(piece: Piece, category?: Category, imam?: Imam): string {
  const keywords: string[] = [];
  
  if (piece.title) {
    keywords.push(piece.title);
    const titleWords = piece.title.split(/\s+/).filter(w => w.length > 2);
    keywords.push(...titleWords);
    keywords.push(`${piece.title} lyrics`);
    keywords.push(`${piece.title} text`);
    keywords.push(`read ${piece.title}`);
    keywords.push(`${piece.title} online`);
  }
  
  if (piece.reciter) {
    keywords.push(piece.reciter);
    keywords.push(`${piece.reciter} recitation`);
    keywords.push(`${piece.reciter} naat`);
    keywords.push(`${piece.reciter} noha`);
    if (piece.title) {
      keywords.push(`${piece.title} ${piece.reciter}`);
    }
  }
  
  if (category?.name) {
    keywords.push(category.name);
    keywords.push(`${category.name} lyrics`);
    keywords.push(`${category.name} text`);
    if (piece.title) {
      keywords.push(`${piece.title} ${category.name}`);
    }
  }
  
  if (imam?.name) {
    keywords.push(imam.name);
    if (piece.title) {
      keywords.push(`${piece.title} ${imam.name}`);
    }
  }
  
  if (piece.language) {
    keywords.push(piece.language);
    keywords.push(`${piece.language} poetry`);
    keywords.push(`${piece.language} recitation`);
  }
  
  if (piece.tags && Array.isArray(piece.tags)) {
    keywords.push(...piece.tags);
  }
  
  keywords.push(
    SITE_NAME,
    ...SITE_ALT_NAMES,
    'islamic poetry',
    'naat',
    'noha', 
    'dua',
    'manqabat',
    'marsiya',
    'islamic content',
    'islamic recitation',
    'recitation lyrics',
    'read online',
    'free recitation'
  );
  
  return [...new Set(keywords)].join(', ');
}

/**
 * Generate Article structured data (JSON-LD) for a piece
 */
export function generateArticleStructuredData(
  piece: Piece,
  category?: Category,
  imam?: Imam,
  siteUrl?: string
): Record<string, any> {
  const currentUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const pieceUrl = `${currentUrl}/piece/${piece.id}`;
  const firstImageUrl = getFirstImageUrl(piece.image_url);
  const imageUrl = firstImageUrl 
    ? (firstImageUrl.startsWith('http') ? firstImageUrl : `${currentUrl}${firstImageUrl}`) 
    : `${currentUrl}/main.png`;
  
  const structuredData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: piece.title,
    description: generateMetaDescription(piece),
    image: imageUrl,
    url: pieceUrl,
    datePublished: piece.created_at,
    dateModified: piece.updated_at || piece.created_at,
    author: {
      '@type': 'Person',
      name: piece.reciter || 'Unknown Reciter',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Followers of 14',
      url: currentUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${currentUrl}/main.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pieceUrl,
    },
  };
  
  // Add category
  if (category) {
    structuredData.articleSection = category.name;
    structuredData.about = {
      '@type': 'Thing',
      name: category.name,
    };
  }
  
  // Add imam
  if (imam) {
    structuredData.about = {
      '@type': 'Person',
      name: imam.name,
      ...(imam.title && { jobTitle: imam.title }),
    };
  }
  
  // Add keywords
  structuredData.keywords = generateKeywords(piece, category, imam);
  
  // Add language
  if (piece.language) {
    structuredData.inLanguage = piece.language;
  }
  
  // Add comprehensive video schema if available
  if (piece.video_url) {
    structuredData.video = {
      '@type': 'VideoObject',
      name: piece.title,
      description: generateMetaDescription(piece),
      thumbnailUrl: imageUrl,
      contentUrl: piece.video_url,
      embedUrl: piece.video_url,
      uploadDate: piece.created_at,
      duration: 'PT0M', // Can be updated if duration is available
      ...(piece.reciter && { publisher: { '@type': 'Person', name: piece.reciter } }),
    };
  }
  
  // Add audio schema if available
  if (piece.audio_url) {
    structuredData.audio = {
      '@type': 'AudioObject',
      name: piece.title,
      description: generateMetaDescription(piece),
      contentUrl: piece.audio_url,
      ...(piece.reciter && { creator: { '@type': 'Person', name: piece.reciter } }),
    };
  }
  
  // Add text content for better indexing
  if (piece.text_content) {
    structuredData.text = piece.text_content.substring(0, 500); // First 500 chars for preview
  }
  
  // Add view count for credibility
  if (piece.view_count && piece.view_count > 0) {
    structuredData.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'ViewAction' },
      userInteractionCount: piece.view_count,
    };
  }
  
  return structuredData;
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
  siteUrl?: string
): Record<string, any> {
  const currentUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${currentUrl}${item.url}`,
    })),
  };
}

/**
 * Generate CollectionPage structured data for category pages
 */
export function generateCollectionPageStructuredData(
  category: Category,
  pieces: Piece[],
  siteUrl?: string
): Record<string, any> {
  const currentUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const categoryUrl = `${currentUrl}/category/${category.slug}`;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.name,
    description: category.description || `Browse ${category.name} - Complete Islamic poetry collection on Followers of 14. Read ${category.name} with text, audio, and video.`,
    url: categoryUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: pieces.length,
      itemListElement: pieces.slice(0, 20).map((piece, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          name: piece.title,
          url: `${currentUrl}/piece/${piece.id}`,
          ...(piece.reciter && { author: { '@type': 'Person', name: piece.reciter } }),
        },
      })),
    },
    publisher: {
      '@type': 'Organization',
      name: 'Followers of 14',
    },
  };
}

/**
 * Generate WebSite structured data with search action
 */
export function generateWebSiteStructuredData(siteUrl?: string): Record<string, any> {
  const currentUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    url: currentUrl,
    description: 'Followers of 14 (Khanda Azaadars, Lyrics Hub) - Complete Islamic poetry and recitation platform. Search any Naat, Noha, Dua, Manqabat, Marsiya by name with text, audio, and video. Free access to thousands of Islamic spiritual content.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${currentUrl}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5',
      ratingCount: '1000',
    },
    inLanguage: ['en', 'ur', 'ar', 'fa'],
    keywords: 'Followers of 14, khanda azaadars, lyrics hub, naat, noha, dua, manqabat, marsiya, islamic poetry, recitation lyrics',
  };
}

/**
 * Clean and optimize text for SEO
 */
export function cleanTextForSEO(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u0600-\u06FF.,!?;:'"-]/g, '')
    .trim();
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
