# Icon Setup Instructions

To replace the app icon with your "Followers of 14" logo, follow these steps:

## Step 1: Prepare Your Logo Images

You need to create two PNG versions of your logo:

1. **icon-192x192.png** - 192x192 pixels (for standard PWA icons)
2. **icon-512x512.png** - 512x512 pixels (for high-resolution displays and sharing)

### Recommended Specifications:
- **Format**: PNG with transparency (if your logo has transparent background)
- **Shape**: Square (the logo will be displayed in a circular/square frame)
- **Background**: White or transparent (recommended)
- **Quality**: High resolution, sharp edges

## Step 2: Convert Your Logo

If you have your logo in a different format or size, you can:

1. **Use an online tool**: 
   - Visit https://www.iloveimg.com/resize-image or similar
   - Upload your logo
   - Resize to 192x192 and 512x512
   - Download as PNG

2. **Use image editing software**:
   - Photoshop, GIMP, or any image editor
   - Create square canvas (192x192 or 512x512)
   - Center your logo
   - Export as PNG

## Step 3: Place Files in Public Folder

Place both icon files in the `public` folder:

```
public/
  ├── icon-192x192.png
  ├── icon-512x512.png
  └── favicon.ico (optional - you can also replace this)
```

## Step 4: Update Favicon (Optional)

If you want to replace the favicon.ico as well:

1. Convert your logo to ICO format
2. Use an online converter like https://convertio.co/png-ico/
3. Replace `public/favicon.ico` with your new file

## Step 5: Test

After adding the files:

1. **Clear browser cache** (important!)
2. **Restart your dev server** if running
3. **Check the manifest**: Visit `/manifest.json` in your browser
4. **Test PWA install**: Try installing the app on mobile
5. **Test sharing**: Share a link and check the preview

## Notes

- The icons are already configured in `manifest.json` and `index.html`
- Social media platforms (Facebook, Twitter) will use the 512x512 icon for link previews
- Mobile devices will use the appropriate size based on screen resolution
- Apple devices will use the apple-touch-icon for home screen icons

## Troubleshooting

If icons don't appear:
1. Clear browser cache completely
2. Check file names match exactly: `icon-192x192.png` and `icon-512x512.png`
3. Verify files are in the `public` folder (not `src` or `assets`)
4. Check browser console for 404 errors
5. Try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

