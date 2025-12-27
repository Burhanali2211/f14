/**
 * SEO utility functions for generating meta tags and structured data
 */

import type { Piece, Category, Imam } from './supabase-types';

/**
 * Generate meta description from piece content
 */
export function generateMetaDescription(piece: Piece, maxLength = 160): string {
  // Try to use text_content first
  if (piece.text_content && piece.text_content.length > 0) {
    const cleanText = piece.text_content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .trim();
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }
    
    // Truncate at word boundary
    const truncated = cleanText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
  }
  
  // Fallback to title-based description - optimized for search clicks
  const reciterText = piece.reciter ? ` by ${piece.reciter}` : '';
  const categoryText = piece.language ? ` in ${piece.language}` : '';
  const categoryName = categoryText ? categoryText.replace(' in ', '') : '';
  return `Read "${piece.title}"${reciterText}${categoryText} - Complete text, audio, and video available. ${categoryName ? `Best ${categoryName} collection.` : 'Islamic poetry and spiritual content.'} Free access on Followers of 14.`;
}

/**
 * Generate keywords from piece data
 */
export function generateKeywords(piece: Piece, category?: Category, imam?: Imam): string {
  const keywords: string[] = [];
  
  // Add title words (first few important words)
  if (piece.title) {
    const titleWords = piece.title.split(/\s+/).slice(0, 5);
    keywords.push(...titleWords);
  }
  
  // Add reciter
  if (piece.reciter) {
    keywords.push(piece.reciter);
  }
  
  // Add category name
  if (category?.name) {
    keywords.push(category.name);
  }
  
  // Add imam name
  if (imam?.name) {
    keywords.push(imam.name);
  }
  
  // Add language
  if (piece.language) {
    keywords.push(piece.language);
  }
  
  // Add tags
  if (piece.tags && Array.isArray(piece.tags)) {
    keywords.push(...piece.tags);
  }
  
  // Add common islamic poetry keywords - optimized for search
  keywords.push('Followers of 14', 'islamic poetry', 'Naat', 'Noha', 'Dua', 'Manqabat', 'Marsiya', 'Islamic content', 'Islamic recitation', 'spiritual content', 'read online', 'free recitation', 'Islamic text');
  
  // Add search-friendly variations
  if (piece.reciter) {
    keywords.push(`${piece.reciter} recitation`, `${piece.reciter} naat`, `${piece.reciter} noha`);
  }
  if (piece.title) {
    keywords.push(`read ${piece.title}`, `${piece.title} text`, `${piece.title} online`);
  }
  
  // Remove duplicates and join
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
  const imageUrl = piece.image_url ? (piece.image_url.startsWith('http') ? piece.image_url : `${currentUrl}${piece.image_url}`) : `${currentUrl}/main.png`;
  
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
    name: 'Followers of 14',
    url: currentUrl,
    description: 'Followers of 14 - Complete Islamic poetry and recitation platform. Read Naat, Noha, Dua, Manqabat, and Marsiya with text, audio, and video. Free access to the best Islamic spiritual content.',
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
    sameAs: [
      currentUrl,
    ],
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
