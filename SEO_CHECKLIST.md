# SEO Checklist — FIT HUB

## Technical SEO (Implemented)

- [x] Dynamic metadata per page (`buildMetadata` utility)
- [x] Open Graph tags on all public pages
- [x] Twitter Card tags
- [x] Canonical URLs via `alternates.canonical`
- [x] JSON-LD: Organization, WebSite, BreadcrumbList
- [x] JSON-LD: FAQPage on calculators, articles, calisthenics
- [x] JSON-LD: Article schema on blog posts
- [x] JSON-LD: WebApplication schema on calculators
- [x] `sitemap.xml` auto-generated from content
- [x] `robots.txt` with dashboard/api disallowed
- [x] Semantic HTML (h1, nav, article, section)
- [x] Clean URL structure (no query params for content)
- [x] Mobile-first responsive design
- [x] PWA manifest for installability
- [x] `lang="en"` on html element
- [x] No `poweredByHeader`

## On-Page SEO (Per Page Template)

- [x] Unique SEO title
- [x] Unique meta description (150–160 chars)
- [x] Single H1 per page
- [x] Internal links (related calculators, articles, exercises)
- [x] FAQ section with schema
- [x] Breadcrumb navigation with schema
- [x] Table of contents on blog articles

## Content SEO Strategy

### Programmatic Pages (High Volume Potential)
- 10 calculator pages targeting "[tool] calculator" keywords
- 6 calisthenics exercise pages
- 3 calisthenics level pages
- 2 workout plan pages
- 6 blog categories
- 6+ seed articles (expand to 100+)

### Internal Linking
- Homepage → calculators, blog, calisthenics
- Calculators cross-link via `relatedSlugs`
- Blog articles link to relevant calculators
- Calisthenics pages link to workout plans
- Footer provides sitewide link equity

### URL Patterns
```
/bmi-calculator
/calorie-calculator
/calisthenics/push-up
/workout-plans/beginner
/blog/how-many-calories-to-eat
/blog/category/nutrition
```

## Pre-Launch Tasks

- [ ] Set production `NEXT_PUBLIC_SITE_URL`
- [ ] Create `og-default.jpg` (1200×630)
- [ ] Create `logo.png` for schema
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Set up Google Analytics 4 (optional)
- [ ] Verify Core Web Vitals in PageSpeed Insights
- [ ] Review all meta descriptions for uniqueness

## Ongoing SEO

- [ ] Publish 2–4 blog articles per week
- [ ] Add new calculator variants (e.g. "/calorie-calculator/weight-loss")
- [ ] Build backlinks via guest posts and tool embeds
- [ ] Monitor Search Console for crawl errors
- [ ] Update articles with `updatedAt` when refreshing content
- [ ] A/B test titles and descriptions based on CTR data
- [ ] Expand calisthenics library (20+ exercises)
- [ ] Add programmatic location pages if relevant

## Performance (SEO Factor)

- [x] Server Components for static content
- [x] Lazy-loaded AdSense script
- [x] Intersection Observer for ad loading (CLS)
- [x] Font display swap
- [x] Image optimization via next/image (when images added)
- [x] Minimal client JS on content pages
- [ ] Add Vercel Speed Insights monitoring

## Structured Data Testing

Validate at [Google Rich Results Test](https://search.google.com/test/rich-results):
- Calculator pages (FAQ + WebApplication)
- Blog articles (Article + FAQ)
- Homepage (Organization + WebSite)
