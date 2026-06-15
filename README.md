# ECBTAX GitHub-Only AI Maximum Pilot Package

Upload all root files and the /signals/ folder into the Cloudflare Pages GitHub repo.

No Worker. No KV. No WordPress. Static GitHub-only pilot.

## Critical manual step for score
Copy into index.html <head>:
1. snippets/COPY-INTO-HOMEPAGE-HEAD-META.html
2. snippets/COPY-INTO-HOMEPAGE-HEAD-JSONLD.html

Copy into servicii.html <head>:
- snippets/COPY-INTO-SERVICII-HEAD-JSONLD.html

Copy into intrebari.html <head>:
- snippets/COPY-INTO-INTREBARI-HEAD-JSONLD.html

## Verify
Open:
https://ecbtax.com/robots.txt
https://ecbtax.com/sitemap.xml
https://ecbtax.com/llms.txt
https://ecbtax.com/ai.json
https://ecbtax.com/authority.json
https://ecbtax.com/entities.json
https://ecbtax.com/intents.json
https://ecbtax.com/adn.json
https://ecbtax.com/ai-proof.json
https://ecbtax.com/signals/homepage.jsonld

View source of homepage and search:
application/ld+json
Organization
Service
FAQPage
BreadcrumbList
AI Delivery Infrastructure
