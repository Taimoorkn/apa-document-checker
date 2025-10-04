# Favicon Setup Instructions

## Why "Vercel" Shows in Google

Google is showing Vercel's default favicon because you don't have proper favicon files. Here's how to fix it:

## Quick Fix (Do This NOW)

### Option 1: Use an Online Converter (Easiest - 2 minutes)

1. Go to https://favicon.io/favicon-converter/
2. Upload your `public/LiloLogo.svg` file
3. Click "Download"
4. Extract the ZIP file
5. Copy these files to your `public/` folder:
   - `favicon.ico`
   - `apple-touch-icon.png`
   - `favicon-16x16.png`
   - `favicon-32x32.png`

### Option 2: Use Figma/Photoshop

1. Open `LiloLogo.svg` in Figma or Photoshop
2. Export as PNG at these sizes:
   - 180x180 → save as `apple-touch-icon.png`
   - 32x32 → save as `favicon-32x32.png`
   - 16x16 → save as `favicon-16x16.png`
3. Use https://www.icoconverter.com/ to convert 32x32 PNG to `favicon.ico`
4. Place all files in `public/` folder

## Files You Need in `public/` folder:

```
public/
  ├── LiloLogo.svg (already exists ✓)
  ├── favicon.ico (NEED TO ADD)
  ├── apple-touch-icon.png (NEED TO ADD)
  ├── favicon-16x16.png (optional but recommended)
  └── favicon-32x32.png (optional but recommended)
```

## After Adding Files

1. **Commit and push**:
   ```bash
   git add public/
   git commit -m "Add favicon files"
   git push
   ```

2. **Clear cache**: Visit your site and do a hard refresh (Ctrl+Shift+R)

3. **Test**: Check these URLs work:
   - `https://apa-document-checker.vercel.app/favicon.ico`
   - `https://apa-document-checker.vercel.app/apple-touch-icon.png`

## Why This Matters for SEO

1. **Branding**: Shows your Lilo logo instead of "Vercel" in:
   - Browser tabs
   - Bookmarks
   - Google search results (eventually)

2. **Professionalism**: Makes your site look legit

3. **Recognition**: Users will recognize your brand

## Google Search Result Update Timeline

Even after fixing favicon:
- **Browser tabs**: Immediate after deployment
- **Bookmarks**: Immediate
- **Google search results**: 1-4 weeks (Google caches favicons)

To speed up Google update:
1. Request re-indexing in Google Search Console
2. Update your social media OG images too
