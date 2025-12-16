import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  category?: string;
  // For structured data
  structuredData?: Record<string, any>;
  canonicalUrl?: string;
}

/**
 * Comprehensive SEO component for dynamic meta tags
 * Updates document head with SEO-optimized meta tags
 */
export function SEOHead({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  category,
  structuredData,
  canonicalUrl,
}: SEOHeadProps) {
  const location = useLocation();
  const siteName = 'Kalam Reader';
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = url || `${siteUrl}${location.pathname}`;
  const ogImage = image || `${siteUrl}/main.png`;
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - islamic poetry & Content Reader`;

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = fullTitle;
    }

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Primary meta tags
    if (title) updateMetaTag('title', title);
    if (description) updateMetaTag('description', description);
    if (keywords) updateMetaTag('keywords', keywords);
    if (author) updateMetaTag('author', author);

    // Open Graph tags
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:title', fullTitle, true);
    if (description) updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', ogImage, true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:site_name', siteName, true);
    if (type === 'article' && publishedTime) {
      updateMetaTag('og:published_time', publishedTime, true);
    }
    if (type === 'article' && modifiedTime) {
      updateMetaTag('og:modified_time', modifiedTime, true);
    }
    if (type === 'article' && category) {
      updateMetaTag('article:section', category, true);
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', fullTitle, true);
    if (description) updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', ogImage, true);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl || currentUrl);

    // Structured Data (JSON-LD)
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
    if (structuredData) {
      if (!structuredDataScript) {
        structuredDataScript = document.createElement('script');
        structuredDataScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(structuredDataScript);
      }
      structuredDataScript.textContent = JSON.stringify(structuredData);
    } else if (structuredDataScript && structuredDataScript.id !== 'default-structured-data') {
      // Remove if exists and not default
      structuredDataScript.remove();
    }

    // Cleanup function
    return () => {
      // Optionally reset to defaults on unmount
    };
  }, [
    title,
    description,
    keywords,
    image,
    url,
    type,
    author,
    publishedTime,
    modifiedTime,
    category,
    structuredData,
    canonicalUrl,
    currentUrl,
    ogImage,
    fullTitle,
  ]);

  return null; // This component doesn't render anything
}
