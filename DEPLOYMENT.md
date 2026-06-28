# Deployment Guide — FIT HUB

## Prerequisites

- Node.js 20+
- Firebase project with Auth + Firestore enabled
- Vercel account (recommended)
- (Optional) Google AdSense account

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel Deployment

1. Push to GitHub and import to Vercel
2. Add environment variables from `.env.example`
3. Set `NEXT_PUBLIC_SITE_URL` to your production domain
4. Add domain to Firebase authorized domains
5. Deploy Firestore security rules from `.env.example`

## Post-Deploy Checklist

- [ ] Verify `/sitemap.xml` and `/robots.txt`
- [ ] Test calculator pages and SEO variant URLs
- [ ] Test Firebase auth and dashboard tracking
- [ ] Submit sitemap to Google Search Console
- [ ] Add PWA icons and `og-default.jpg`
