# Update Detection System

## Overview

This system automatically detects when the website is updated and ensures users get the latest version by clearing caches and prompting them to refresh.

## How It Works

### 1. Version File Generation
- On each build, `scripts/generate-version.js` creates a `public/version.json` file
- This file contains:
  - `version`: App version from package.json
  - `buildTime`: Timestamp of when the build was created
  - `buildHash`: Unique hash for each build

### 2. Version Checking
- The `UpdateNotification` component checks for updates:
  - 30 seconds after page load
  - Every 5 minutes while the app is running
  - When the page becomes visible (user returns to tab)
  - When the window regains focus
  - When service worker detects an update

### 3. Cache Clearing
When an update is detected:
- All localStorage caches are cleared
- All service worker caches are cleared
- IndexedDB caches are cleared (if used)
- User is prompted to refresh the page

### 4. Service Worker Integration
- The service worker (`public/sw.js`) checks for version changes on activation
- It clears old caches and notifies the app when updates are available
- Version.json is excluded from caching to ensure fresh checks

## Components

### `src/lib/app-version.ts`
Core version management utilities:
- `getCurrentAppVersion()`: Fetches version from version.json
- `getStoredAppVersion()`: Gets stored version from localStorage
- `hasVersionChanged()`: Compares versions to detect changes
- `clearAllCachesOnUpdate()`: Clears all caches when update detected

### `src/components/UpdateNotification.tsx`
UI component that:
- Checks for updates periodically
- Shows a dialog when update is available
- Allows user to update now or later
- Automatically clears caches and reloads on update

### `public/sw.js`
Service worker that:
- Checks version on activation
- Clears old caches
- Notifies app of version changes

## Usage

### Automatic (Recommended)
The system works automatically. Just build and deploy:

```bash
npm run build
```

The build script automatically generates version.json before building.

### Manual Version Check
You can manually trigger a version check:

```typescript
import { getCurrentAppVersion, getStoredAppVersion, hasVersionChanged } from '@/lib/app-version';

const current = await getCurrentAppVersion();
const stored = getStoredAppVersion();
if (hasVersionChanged(current, stored)) {
  // Update available
}
```

### Manual Cache Clear
To manually clear all caches:

```typescript
import { clearAllCachesOnUpdate } from '@/lib/app-version';

await clearAllCachesOnUpdate();
```

## Configuration

### Update Check Interval
Edit `src/components/UpdateNotification.tsx`:
- `CHECK_INTERVAL`: How often to check (default: 5 minutes)
- `INITIAL_CHECK_DELAY`: Delay before first check (default: 30 seconds)

### Version File Location
The version file is at `public/version.json` and is automatically generated on build.

## Testing

1. **Test Update Detection**:
   - Build the app: `npm run build`
   - Deploy and let users load it
   - Make a change and rebuild
   - Deploy again
   - Users should see update notification

2. **Test Cache Clearing**:
   - Load the app and let it cache data
   - Trigger an update
   - Verify all caches are cleared

3. **Test Service Worker**:
   - Register service worker
   - Update version.json manually
   - Reload page
   - Service worker should detect change

## Troubleshooting

### Updates Not Detected
- Check that `version.json` is being generated on build
- Verify `version.json` is accessible at `/version.json`
- Check browser console for errors
- Ensure service worker is registered

### Caches Not Clearing
- Check browser DevTools > Application > Storage
- Verify `clearAllCachesOnUpdate()` is being called
- Check service worker cache in DevTools > Application > Cache Storage

### Update Dialog Not Showing
- Check that `UpdateNotification` component is in App.tsx
- Verify no errors in console
- Check that version checking is running (check network tab for version.json requests)

## Notes

- Version.json is excluded from service worker caching to ensure fresh checks
- The system uses cache-busting query parameters when fetching version.json
- Users can dismiss the update dialog, but it will reappear on next check if version changed
- The system works with both service worker and non-service worker scenarios

