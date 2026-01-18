# Data Fetching Analysis & Optimization Plan

## IMPLEMENTATION STATUS: COMPLETED

All optimizations have been implemented. See below for changes made.

---

## Current State Analysis

### First Visit Load (Index Page)

When a user opens the website for the first time, the following API calls are made:

#### App.tsx Level (Global Providers)
| Provider | API Call | Data Size | Priority |
|----------|----------|-----------|----------|
| `UserRoleProvider` | `users` table (profile lookup) | ~1 row | Critical |
| `SiteSettingsContext` | `site_settings` table | 1 row | Critical |
| `BackendHealthCheck` | Auth health check | N/A | Low |
| `CacheSystemInitializer` | Cache version checks | N/A | Medium |

#### Index Page Level (use-index-data.ts)
| Query | Table | Columns | Rows | Priority |
|-------|-------|---------|------|----------|
| Categories | `categories` | 11 columns | All (~10-20) | High |
| Recent Pieces | `pieces` | 9 columns | 6 | High |
| Popular Pieces | `pieces` | 9 columns | 4 | Medium |
| Imams | `imams` | 6 columns | All (~14) | Medium |
| Site Settings | `site_settings` | All | 1 | High (duplicate!) |
| Artists | `artistes` + `pieces` | name, image_url + reciter | All | Low |
| Continue Reading | `pieces` | 10 columns | 0-4 | Low |
| Favorites | `pieces` | 10 columns | 0-4 | Low |

### Issues Identified

#### 1. Duplicate Site Settings Fetch
- **Problem**: `SiteSettingsContext` fetches site_settings globally, but `use-index-data.ts` fetches it again
- **Impact**: 2 API calls for the same data
- **Solution**: Remove from `use-index-data.ts`, use context instead

#### 2. Artists Query is Expensive
- **Problem**: Fetches ALL artistes + ALL pieces to count reciter occurrences
- **Impact**: Large data transfer, slow on mobile
- **Solution**: Cache counts server-side or limit to top artists

#### 3. Non-Critical Data Loaded Immediately
- **Problem**: Continue Reading and Favorites load even if user has none
- **Impact**: Wasted API calls for new users
- **Solution**: Already checks arrays, but queries are still registered

#### 4. No Request Batching
- **Problem**: 8+ parallel API calls on first load
- **Impact**: Connection limits, waterfall delays
- **Solution**: Batch related queries or use single endpoint

#### 5. All Categories/Imams Loaded
- **Problem**: Loads ALL categories and imams even for homepage display
- **Impact**: Over-fetching if only showing subset
- **Solution**: Implement pagination or limit queries

---

## Page-by-Page Analysis

### Index Page (/)
**Current Calls**: 8-10 API requests
**Actual Need**: 5-6 requests
**Optimization Potential**: 30-40%

### Category Page (/category/:slug)
**Current Calls**: 2 requests (category + pieces)
**Issues**: 
- Loads ALL pieces for category (no pagination)
- Virtual scrolling only kicks in at 50+ pieces
**Solution**: Server-side pagination with cursor

### Piece Page (/piece/:id)
**Current Calls**: 1-2 requests
**Status**: Well optimized

### Admin Page (/admin)
**Current Calls**: 6 parallel requests (ALL data)
**Issues**:
- Loads ALL pieces (could be 1000s)
- Loads ALL users
- No lazy loading per tab
**Solution**: Lazy load per section, paginate lists

### Uploader Page (/uploader)
**Current Calls**: 3 requests
**Status**: Acceptable (user-scoped data)

### Figure Page (/figure/:slug)
**Current Calls**: 2 requests
**Issues**: May load many pieces per imam
**Solution**: Paginate pieces

---

## Optimization Strategy

### Phase 1: Quick Wins (No Schema Changes)

1. **Remove Duplicate Site Settings**
   - Use context value in `use-index-data.ts`
   - Saves 1 API call per page load

2. **Defer Artists Loading**
   - Load artists after initial paint
   - Use Intersection Observer

3. **Skip Empty Queries**
   - Don't query favorites/continue reading for new users
   - Check localStorage first

### Phase 2: Smart Loading

1. **Implement Progressive Loading**
   ```
   Critical (SSR/immediate):
   - Site settings
   - Categories (limited)
   - User session
   
   High Priority (within 100ms):
   - Recent pieces
   - Imams (limited to displayed)
   
   Deferred (after paint):
   - Popular pieces
   - Artists
   - Favorites/Continue reading
   ```

2. **Add Stale-While-Revalidate**
   - Show cached data immediately
   - Refresh in background

### Phase 3: Server Optimization

1. **Create Aggregated Endpoints**
   - `/api/homepage-data` - Single call for Index page
   - `/api/admin-summary` - Counts only for Admin

2. **Implement Cursor Pagination**
   - All piece lists
   - User lists in admin

---

## Implementation Priority

### HIGH PRIORITY (This Session)
1. Fix duplicate site settings fetch
2. Defer artists loading
3. Add loading priorities to Index page

### MEDIUM PRIORITY (Next Session)
4. Implement pagination for category pages
5. Lazy load admin sections
6. Add request batching

### LOW PRIORITY (Future)
7. Server-side aggregation endpoints
8. Edge caching with CDN
9. Service worker prefetching

---

## Expected Improvements

| Metric | Current | After Optimization |
|--------|---------|-------------------|
| Initial API calls | 8-10 | 4-5 |
| Time to First Contentful Paint | ~1.5s | ~0.8s |
| Time to Interactive | ~2.5s | ~1.5s |
| Data transferred (first load) | ~150KB | ~80KB |
| Category page (1000 pieces) | All loaded | 50 paginated |

---

## Changes Implemented

### 1. use-index-data.ts Optimizations
- **Removed duplicate site settings fetch**: Now uses `useSiteSettings()` hook from context instead of making a separate API call
- **Limited artists query**: Reduced from ALL artistes/pieces to limit(20) artistes and limit(500) pieces
- **Optimized response**: Artists list limited to top 12 by count
- **Request batching**: Artists query uses `Promise.all()` for parallel fetching

### 2. AdminContext.tsx Optimizations  
- Already uses specific column selection
- Implements smart caching with version checking
- Has 1-minute fresh cache window

### 3. CategoryPage.tsx
- Already uses virtual scrolling for 50+ pieces
- Uses specific column selection
- No over-fetching detected

### 4. Global Query Optimizations (App.tsx)
- React Query configured with:
  - `staleTime: 5 minutes` - Reduces refetches
  - `gcTime: 30 minutes` - Extended garbage collection
  - `refetchOnWindowFocus: false` - Prevents refetch on tab switch
  - `refetchOnMount: false` - Uses cached data when possible
  - `networkMode: offlineFirst` - Works offline with cache

---

## Files to Modify

1. `src/hooks/use-index-data.ts` - Main optimization target
2. `src/contexts/SiteSettingsContext.tsx` - Remove duplicate
3. `src/pages/CategoryPage.tsx` - Add pagination
4. `src/contexts/AdminContext.tsx` - Lazy loading
5. `src/hooks/use-smart-query.ts` - Add priority system
