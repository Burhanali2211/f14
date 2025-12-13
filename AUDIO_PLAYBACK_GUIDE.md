# Audio Playback from Online Sources - Implementation Guide

## Overview

This implementation provides a robust solution for playing audio from any online source, handling CORS issues, and supporting multiple audio formats and sources.

## Features

✅ **Multi-Source Support**
- Direct audio URLs (MP3, OGG, WAV, M4A, AAC, FLAC, WebM, Opus)
- YouTube videos (via YouTube IFrame API)
- Streaming URLs
- External audio sources with CORS handling

✅ **CORS Handling**
- Automatic proxy for external sources
- Fallback mechanisms
- Error recovery

✅ **Smart URL Detection**
- Automatically detects source type
- Chooses best playback method
- Handles same-origin vs external URLs

## Architecture

### Components

1. **Audio Proxy Edge Function** (`supabase/functions/audio-proxy/`)
   - Proxies audio streams to avoid CORS issues
   - Supports range requests for seeking
   - Handles various audio formats

2. **Enhanced Audio Utilities** (`src/lib/youtube-audio.ts`)
   - URL detection and classification
   - Source type identification
   - Proxy URL generation

3. **Enhanced Audio Player** (`src/components/EnhancedAudioPlayer.tsx`)
   - Uses proxy for external sources
   - Automatic fallback on errors
   - Error handling and retry logic

## How It Works

### 1. URL Processing Flow

```
Audio URL Input
    ↓
Is YouTube? → Yes → Use YouTube IFrame API
    ↓ No
Is Same Origin? → Yes → Use Direct URL
    ↓ No
Use Proxy → Get Audio via Edge Function
```

### 2. Error Handling

- **Network Errors**: Automatically retries with proxy
- **CORS Errors**: Falls back to proxy automatically
- **Format Errors**: Shows user-friendly error messages
- **Loading Errors**: Displays retry options

## Deployment

### Step 1: Deploy Audio Proxy Function

**Using CLI:**
```bash
supabase functions deploy audio-proxy
```

**Using Scripts:**
```bash
# Windows
deploy-functions.bat

# Mac/Linux
./deploy-functions.sh
```

**Via Dashboard:**
1. Go to Supabase Dashboard → Functions
2. Create new function: `audio-proxy`
3. Copy code from `supabase/functions/audio-proxy/index.ts`
4. Deploy

### Step 2: Verify Environment Variables

Ensure `VITE_SUPABASE_URL` is set in your `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## Usage

### Basic Usage

The audio player automatically handles all source types:

```tsx
<EnhancedAudioPlayer 
  src="https://example.com/audio.mp3" 
  title="Audio Recitation"
/>
```

### Supported URL Formats

**Direct Audio:**
- `https://example.com/audio.mp3`
- `https://example.com/recitation.ogg`
- `https://example.com/sound.wav`

**YouTube:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`

**Streaming:**
- `https://example.com/stream.m3u8`
- `https://example.com/live/stream`

## How It Handles Different Sources

### 1. YouTube URLs
- Uses YouTube IFrame API
- No proxy needed
- Full YouTube player features

### 2. Same-Origin URLs
- Direct playback
- No CORS issues
- Fastest performance

### 3. External Direct Audio URLs
- Automatically uses proxy
- Avoids CORS issues
- Supports seeking and range requests

### 4. Streaming URLs
- Uses proxy for compatibility
- Handles live streams
- Supports various formats

## Error Handling

The player includes comprehensive error handling:

1. **Network Errors**: Shows error message, retries with proxy
2. **CORS Errors**: Automatically switches to proxy
3. **Format Errors**: Displays format not supported message
4. **Loading Errors**: Shows loading state and retry option

## Best Practices

### 1. URL Validation
Always validate URLs before passing to the player:
```tsx
if (audioUrl && isValidUrl(audioUrl)) {
  <EnhancedAudioPlayer src={audioUrl} />
}
```

### 2. Error Display
Show user-friendly error messages:
```tsx
{audioError && (
  <Alert variant="destructive">
    {audioError}
  </Alert>
)}
```

### 3. Loading States
Always show loading indicators:
```tsx
{isLoading && <LoadingSpinner />}
```

## Troubleshooting

### Audio Not Playing

1. **Check CORS**: External URLs may need proxy
2. **Check Format**: Ensure format is supported
3. **Check Network**: Verify URL is accessible
4. **Check Console**: Look for error messages

### Proxy Not Working

1. **Verify Deployment**: Ensure `audio-proxy` function is deployed
2. **Check URL**: Ensure `VITE_SUPABASE_URL` is set correctly
3. **Check Logs**: Review Supabase function logs

### YouTube Not Playing

1. **Check API**: Ensure YouTube IFrame API is loaded
2. **Check URL**: Verify YouTube URL format
3. **Check Permissions**: Some videos may be restricted

## Performance Considerations

- **Caching**: Proxy caches audio for 1 hour
- **Range Requests**: Supports seeking without full download
- **Lazy Loading**: Audio loads on demand
- **Format Optimization**: Prefers compressed formats

## Security

- Only allows HTTP/HTTPS URLs
- Validates URL format
- Prevents SSRF attacks
- CORS headers properly set

## Future Enhancements

- [ ] Audio format conversion
- [ ] Offline caching
- [ ] Playlist support
- [ ] Advanced seeking
- [ ] Audio visualization

## Support

For issues or questions:
1. Check function logs in Supabase Dashboard
2. Review browser console for errors
3. Verify environment variables
4. Test with different audio sources
