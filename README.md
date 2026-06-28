# The Underground Archive

A premium, culture-first web platform dedicated to global underground electronic music and alternative culture.

> *The home of global underground culture.*

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS 4 |
| Backend | Django 5, Django REST Framework |
| Database | PostgreSQL |
| Search | Meilisearch |
| Auth | Email + OAuth (django-allauth) |

## Sections

- **Home** — Cinematic immersion, trending artists, editor's picks, city spotlights
- **Artist Encyclopedia** — Deep profiles with ratings, aesthetics, timelines
- **Underground Fashion** — Techwear, industrial goth, darkwear, ravewear, EBM culture guides
- **City Culture Guides** — Berlin, Tbilisi, Amsterdam, Tokyo, and more
- **Editorial Magazine** — Premium cultural journalism
- **Community** — Profiles, collections, discussions (backend ready)
- **Discovery Engine** — Filter by genre, BPM, energy, darkness, aesthetics

## Quick Start

### Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend services

```bash
docker compose up -d
```

### Django API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API available at [http://localhost:8000/api/](http://localhost:8000/api/)

## Design

Dark industrial aesthetic — black backgrounds, acid accent (`#c8ff00`), grain overlays, brutalist mono typography paired with editorial serif. No corporate startup vibes.

## SEO

- Structured data (MusicGroup, Article, Place, BreadcrumbList)
- Open Graph + Twitter cards
- Canonical URLs
- Dynamic sitemap generation
