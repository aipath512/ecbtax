#!/usr/bin/env python3
"""
Generează sitemap.xml pentru ecbtax.com.

lastmod = data ultimului commit git care a atins fișierul sursă al paginii.
- Paginile statice: lista STATIC de mai jos (adresă -> fișier sursă).
- Blogul: fiecare folder blog/<slug>/ care conține index.html se adaugă singur.
  Un articol nou apare în sitemap fără nicio altă acțiune.

Reguli de excludere (ca să nu intre în sitemap pagini care nu trebuie indexate):
- pagina conține meta robots "noindex";
- (doar blog) canonical-ul paginii nu este chiar adresa ei.

Rulează în GitHub Actions cu istoria completă (fetch-depth: 0).
Doar biblioteca standard Python.
"""
import datetime
import re
import subprocess
import sys
from pathlib import Path

BASE = "https://ecbtax.com"
ROOT = Path(__file__).resolve().parents[2]

# (adresă, fișier sursă, changefreq, priority)
STATIC = [
    ("/", "index.html", "monthly", "1.0"),
    ("/trust-center", "trust-center.html", "monthly", "0.9"),
    ("/startup-pack.html", "startup-pack.html", "monthly", "0.9"),
    ("/rapoarte.html", "rapoarte.html", "weekly", "0.9"),
    ("/intrebari", "intrebari.html", "monthly", "0.8"),
    ("/contact", "contact.html", "yearly", "0.7"),
    ("/a2a-proof.html", "a2a-proof.html", "monthly", "0.9"),
    ("/servicii/", "servicii/index.html", "monthly", "0.9"),
    ("/blog/", "blog/index.html", "weekly", "0.8"),
]

BLOG_DIR = "blog"
BLOG_CHANGEFREQ = "monthly"
BLOG_PRIORITY = "0.7"


def last_commit_date(rel_path: str) -> str:
    out = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--", rel_path],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout.strip()
    return out or datetime.date.today().isoformat()


def read_text(rel_path: str) -> str:
    return (ROOT / rel_path).read_text(encoding="utf-8", errors="replace")


def has_noindex(html: str) -> bool:
    for tag in re.findall(r"<meta\b[^>]*>", html, flags=re.I):
        if re.search(r"name=[\"']robots[\"']", tag, flags=re.I) and re.search(
            r"noindex", tag, flags=re.I
        ):
            return True
    return False


def canonical_of(html: str):
    for tag in re.findall(r"<link\b[^>]*>", html, flags=re.I):
        if re.search(r"rel=[\"']canonical[\"']", tag, flags=re.I):
            m = re.search(r"href=[\"']([^\"']+)[\"']", tag, flags=re.I)
            if m:
                return m.group(1).strip()
    return None


def norm(url: str) -> str:
    return url.rstrip("/")


def entry(path: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        "  <url>\n"
        f"    <loc>{BASE}{path}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>\n"
    )


def main() -> int:
    entries = []
    skipped = []

    for path, src, cf, pr in STATIC:
        if not (ROOT / src).is_file():
            skipped.append(f"{path}: lipsește fișierul {src}")
            continue
        if has_noindex(read_text(src)):
            skipped.append(f"{path}: noindex")
            continue
        entries.append(entry(path, last_commit_date(src), cf, pr))

    blog = ROOT / BLOG_DIR
    if blog.is_dir():
        for d in sorted(p for p in blog.iterdir() if p.is_dir()):
            rel = f"{BLOG_DIR}/{d.name}/index.html"
            if not (ROOT / rel).is_file():
                continue
            html = read_text(rel)
            url = f"/{BLOG_DIR}/{d.name}/"
            if has_noindex(html):
                skipped.append(f"{url}: noindex")
                continue
            canon = canonical_of(html)
            if canon and norm(canon) != norm(BASE + url):
                skipped.append(f"{url}: canonical diferit ({canon})")
                continue
            entries.append(
                entry(url, last_commit_date(rel), BLOG_CHANGEFREQ, BLOG_PRIORITY)
            )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")

    print(f"sitemap.xml: {len(entries)} adrese")
    for s in skipped:
        print(f"  omis -> {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
