# Jethro Kimathi — Site Handover & Spec

**Date:** June 2026  
**Built by:** AccelerateIQ / Alex Campomanes  
**Repo:** https://github.com/AccelerateIQ/jethro-kimathi  

---

## Live URLs

| | URL |
|---|---|
| **Public site** | https://jethrokimathi.z13.web.core.windows.net |
| **Admin panel** | https://jethrokimathi.z13.web.core.windows.net/admin/ |
| **Blog listing** | https://jethrokimathi.z13.web.core.windows.net/blog/ |
| **Post reader** | https://jethrokimathi.z13.web.core.windows.net/blog/post.html?slug=SLUG |

Custom domain not yet connected. When ready, point DNS A/CNAME to the static website endpoint and configure it in the Azure portal under the storage account → Static Website.

---

## Architecture

**Pure static site. No server. No Node.js at runtime.**

All files are hosted on Azure Blob Storage (static website feature). The admin writes data back to blob storage via the Azure Blob REST API using a pre-configured SAS token baked into the admin HTML.

```
Browser
  ├── Public site     → reads posts.json, settings.json, gallery.json (static GETs, no auth)
  └── Admin panel     → reads same files (static GETs) + writes via PUT to blob REST API (SAS auth)
```

---

## Azure Infrastructure

| Resource | Value |
|---|---|
| **Resource group** | `AccelerateIQ` |
| **Storage account** | `jethrokimathi` |
| **Region** | East US (or nearest available at creation) |
| **Static website container** | `$web` |
| **Static site endpoint** | `https://jethrokimathi.z13.web.core.windows.net` |
| **Blob REST endpoint** | `https://jethrokimathi.blob.core.windows.net` |

### SAS Token (expires 2028-06-05)

```
se=2028-06-05T14%3A00Z&sp=rwdlac&spr=https&sv=2022-11-02&ss=b&srt=sco&sig=Wj6bx5ZbPER6ur2lTifJ4qAERKI4y2ro6a3R0udLM54%3D
```

Permissions: read, write, delete, list, add, create — on service+container+object level.

**To regenerate the SAS token** (do this before 2028-06-05):
```bash
source ~/.azure-cli-venv/bin/activate
KEY=$(az storage account keys list -g AccelerateIQ -n jethrokimathi --query '[0].value' -o tsv)
az storage account generate-sas \
  --account-name jethrokimathi --account-key "$KEY" \
  --services b --resource-types sco --permissions rwdlac \
  --expiry 2030-01-01T00:00Z --https-only -o tsv
```
Then update `SAS_TOKEN` and `SAS_TOKEN_BLOG` in `public/admin/index.html` and redeploy.

### CORS

CORS is configured on the blob service to allow the admin (same-origin static site) to make PUT/DELETE requests:
- Origin: `https://jethrokimathi.z13.web.core.windows.net`
- Methods: GET, PUT, DELETE, HEAD, OPTIONS

To re-apply CORS after a storage account reset:
```bash
KEY=$(az storage account keys list -g AccelerateIQ -n jethrokimathi --query '[0].value' -o tsv)
az storage cors add --account-name jethrokimathi --account-key "$KEY" \
  --services b --methods GET PUT DELETE HEAD OPTIONS \
  --origins "https://jethrokimathi.z13.web.core.windows.net" \
  --allowed-headers "*" --exposed-headers "ETag,x-ms-request-id,x-ms-version,Content-Length,Date" \
  --max-age 3600
```

---

## File Structure in `$web`

```
$web/
  index.html              ← Homepage
  posts.json              ← Blog posts array (written by admin)
  settings.json           ← Site settings: email, WhatsApp, social links, photo URLs (written by admin)
  gallery.json            ← Gallery manifest: array of public photo URLs (written by admin on upload/delete)
  gallery-config.json     ← Admin PIN hash (written by admin Change PIN tab)
  gallery/                ← Uploaded photos (via admin Gallery tab)
    *.jpg / *.png / *.webp
  admin/
    index.html            ← Admin panel (generated from UltraFlow admin template)
  blog/
    index.html            ← Blog listing page
    post.html             ← Dynamic post reader (?slug=...)
  assets/
    photos/
      jethro-2-web.jpg          ← Hero background (compressed, 421KB)
      jethro-portrait-web.jpg   ← About section portrait (compressed, 191KB)
```

---

## Admin Panel

**URL:** `/admin/`  
**Default PIN:** `2026` (Jethro should change via Change PIN tab immediately)  
**Template source:** `server/admin-template.html` in the `accelerateiq-ultraflow` repo

The admin is generated from the shared UltraFlow admin template. Variables set for Jethro:

| Variable | Value |
|---|---|
| `SA` | `jethrokimathi` |
| `CONTAINER` | `$web` |
| `GALLERY_PREFIX` | `gallery/` |
| `HAS_BA` | `false` |
| `HAS_ANALYTICS` | `false` |
| `HAS_BLOG` | `true` |
| `BLOG_CATEGORIES` | `Ministry,Agribusiness,Entrepreneurship,Personal` |
| `BLOG_READ_BASE` | `https://jethrokimathi.z13.web.core.windows.net` |
| `BLOG_WRITE_URL` | `https://jethrokimathi.blob.core.windows.net/$web` |

### Admin tabs

- **Gallery** — upload photos (JPEG/PNG/WebP/MP4), browse & delete. Uploads go to `gallery/` prefix in `$web`. After upload/delete, `gallery.json` should be synced (see TODO below).
- **Change PIN** — 4-digit PIN. Hash stored in `gallery-config.json`. Master PIN (`2026`) always works as fallback.
- **Before & After** — disabled (`HAS_BA = false`)
- **Stats** — disabled (`HAS_ANALYTICS = false`)
- **Blog** — full CRUD for blog posts. Reads/writes `posts.json` via blob REST API.

---

## Blog System

**Data file:** `posts.json` (array of post objects, publicly readable at static URL)  
**Post reader:** `/blog/post.html?slug=SLUG`  
**Listing page:** `/blog/`

### Post object schema
```json
{
  "id": "post-1234567890",
  "slug": "my-post-title",
  "title": "Post Title",
  "category": "Ministry",
  "date": "2026-06-05",
  "summary": "One or two sentences shown on the listing page.",
  "body": "<p>Full HTML content of the post.</p>",
  "featuredImage": "https://images.pexels.com/...",
  "status": "published"
}
```

Status can be `"published"` or `"draft"`. Only `published` posts appear on the public blog listing.

---

## Homepage Sections

1. **Hero** — full-bleed background (`jethro-2-web.jpg`), name, tagline "Faith · Land · Leadership", CTAs
2. **About** — portrait photo (`jethro-portrait-web.jpg`), bio text
3. **Ministry** — Pexels stock photo, ministry description
4. **Agribusiness** — 3 cards with Pexels photos (chickens, farm field, aerial)
5. **Blog preview** — reads `posts.json`, shows latest 3 published posts
6. **Contact / Book** — speaking inquiry form (mailto, no server)
7. **Footer** — social links (dynamically loaded from `settings.json`)

### Photo overrides via settings.json

`settings.json` can override section photos and social links:
```json
{
  "email": "jethro@example.com",
  "whatsapp": "+254700000000",
  "instagram": "https://instagram.com/...",
  "facebook": "https://facebook.com/...",
  "youtube": "",
  "linkedin": "",
  "photos": {
    "hero": "",
    "about": "",
    "ministry": "",
    "agri1": "",
    "agri2": "",
    "agri3": ""
  }
}
```
Empty strings = use the hardcoded defaults in the HTML.

---

## Deployment

```bash
cd /Users/alexcampomanes/Repositories/jethro-kimathi
source ~/.azure-cli-venv/bin/activate
bash scripts/deploy.sh
```

`scripts/deploy.sh`:
```bash
KEY=$(az storage account keys list -g AccelerateIQ -n jethrokimathi --query '[0].value' -o tsv)
az storage blob upload-batch -s ./public -d '$web' \
  --account-name jethrokimathi --account-key "$KEY" \
  --overwrite --auth-mode key \
  --content-cache-control "no-cache, must-revalidate"
```

To deploy a single file:
```bash
az storage blob upload --account-name jethrokimathi --account-key "$KEY" --auth-mode key \
  --container-name '$web' --file public/admin/index.html --name admin/index.html \
  --content-cache-control "no-cache, must-revalidate" --overwrite
```

---

## Regenerating the Admin from Template

The admin is generated by a Python script that strips DEV blocks and fills placeholders. To regenerate after template changes:

```bash
cd /Users/alexcampomanes/Repositories/jethro-kimathi
python3 - <<'PYEOF'
import re, os

with open('/Users/alexcampomanes/Repositories/ultraflow/server/admin-template.html', 'r') as f:
    html = f.read()

html = re.sub(r'/\* DEV:START \*/.*?/\* DEV:END \*/', '', html, flags=re.DOTALL)
html = re.sub(r'<!-- DEV:START -->.*?<!-- DEV:END -->', '', html, flags=re.DOTALL)
html = re.sub(r'// DEV:START.*?// DEV:END', '', html, flags=re.DOTALL)

SAS = 'se=2028-06-05T14%3A00Z&sp=rwdlac&spr=https&sv=2022-11-02&ss=b&srt=sco&sig=Wj6bx5ZbPER6ur2lTifJ4qAERKI4y2ro6a3R0udLM54%3D'

replacements = {
    '{{BUSINESS_NAME}}': 'Jethro Kimathi',
    '{{SA}}': 'jethrokimathi',
    '{{GALLERY_CONTAINER}}': '$web',
    '{{SAS_TOKEN}}': SAS,
    '{{SAS_TOKEN_BA}}': '',
    '{{GALLERY_PREFIX}}': 'gallery/',
    '{{PIN}}': '2026',
    '{{SESSION_KEY}}': 'jk-admin-session',
    '{{SITE_ID}}': 'jethrokimathi',
    '{{ANALYTICS_TOKEN}}': '',
    '{{HAS_BA}}': 'false',
    '{{HAS_ANALYTICS}}': 'false',
    '{{HAS_BLOG}}': 'true',
    '{{BLOG_READ_BASE}}': 'https://jethrokimathi.z13.web.core.windows.net',
    '{{BLOG_WRITE_URL}}': 'https://jethrokimathi.blob.core.windows.net/$web',
    '{{SAS_TOKEN_BLOG}}': SAS,
    '{{BLOG_CATEGORIES}}': 'Ministry,Agribusiness,Entrepreneurship,Personal',
}

for key, val in replacements.items():
    html = html.replace(key, val)

html = re.sub(r'\n{3,}', '\n\n', html)
html = html.replace('body{padding-top:34px}', '')

with open('public/admin/index.html', 'w') as f:
    f.write(html)
print('Done')
PYEOF
```

---

## Known TODOs / Pending Work

- [ ] **Gallery section on homepage** — gallery tab in admin uploads photos, but no gallery section yet on `index.html` to display them. Need to: (1) add `syncGalleryJson()` to admin so upload/delete updates `gallery.json`, (2) add gallery grid section to homepage that reads `gallery.json`.
- [ ] **Custom domain** — connect `jethrokimathi.com` (or `.co.ke`) via Azure Static Website custom domain + SSL
- [ ] **Contact form backend** — currently uses `mailto:`. Wire to `/api/leads` or Formspree for real lead capture.
- [ ] **QR code section** — planned but not yet built (user requested)
- [ ] **Social links** — populate `settings.json` with Jethro's real WhatsApp, Instagram, Facebook, YouTube

---

## Colour Scheme & Typography

| Token | Value |
|---|---|
| `--ink` | `#060a07` (near-black) |
| `--em` | `#1d7a50` (emerald green) |
| `--gold` | `#c9a227` (gold) |
| Font | Inter (Google Fonts) |

---

## GitHub

- **Repo:** `AccelerateIQ/jethro-kimathi` (public)
- **Branch:** `main`
- No CI/CD — deploy manually via `scripts/deploy.sh`
