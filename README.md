# SteelKill

Astro website for SteelKill handmade chainmail jewellery. The homepage, collection, product detail pages, contact page and photo choices are driven by local JSON. Original Instagram photos are retained for editing; only curated, optimised photos are included in a production build.

## Run and build

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Astro. `npm run build` creates the production site in `dist/`. `npm run preview` serves that build. Image preparation runs automatically before development and production builds. Repeat the build after editing JSON for a published site; the development server reloads JSON edits. No database or CMS is required.

## Edit the products

Edit **src/data/products.json**. `currency` is `GBP`, and `price` is in **pounds**, not pence. `79` displays as `£79.00`. Every product card, category filter, enquiry selector and product page comes from this file.

```json
{
  "currency": "GBP",
  "products": [
    {
      "id": "soft-edges",
      "name": "Soft Edges Choker",
      "description": "Rounded clusters of steel rings form a softer silhouette.",
      "price": 79,
      "category": "Chokers",
      "image": "/images/instagram/2025-03-23_DHiM2sSs27-_1.jpg",
      "images": ["/images/instagram/2025-03-23_DHiM2sSs27-_2.jpg"],
      "featured": true
    }
  ]
}
```

- `id`: unique lowercase URL slug, e.g. `/products/soft-edges/`.
- `name`, `description`: displayed on cards and/or the product page.
- `price`: a positive number in GBP, or `null` for “Price on enquiry”.
- `category`: a category name; filters are generated automatically from the data.
- `image`: main image, relative to `public/` and beginning with `/images/`.
- `images`: optional alternate images of the **same piece**.
- `featured`: optional boolean. Up to six featured pieces appear on the homepage.
- `priceSource`, `editorNote`: optional editor references, never rendered to customers.

To add a product, add an object and its photos. To remove one, remove its object and rebuild. New categories and product detail pages are generated automatically. Search matches names and descriptions; categories, sorting and search can be combined. Unpriced pieces stay last when sorting by price.

The initial catalogue contains 18 pieces curated from the downloaded photos. Names/prices were transcribed from the product posts where readable; otherwise descriptive display names are marked in `editorNote`. The gold Persian bracelet is unpriced because its source photo shows both £65 and £45. Confirm the current price and replace `null` when ready. Photo listings do not establish current stock or shipping costs; enquiries confirm these before ordering.

Run `npm run validate:catalog` to check required fields, unique slugs, valid prices and image paths. The same validation runs before every build. Invalid data stops the build with a product-specific error.

## Edit homepage images

Edit **src/data/site.json** for the homepage hero, logo, editorial image, lookbook, category tiles and Instagram link. Selected originals are converted into responsive WebP files in `public/images/optimized/` using Sharp. Downloaded originals are never overwritten. Production builds exclude the uncurated Instagram download directory so personal pictures and unrelated event posts are not published as loose assets. Keep product/site image paths inside the curated JSON files.

## Enquiries

Product pages and the contact page provide a “Copy enquiry” composer and Instagram link. The site sends nothing automatically and has no payment integration. A failed clipboard write selects the enquiry text for manual copying. Add real payment/checkout links only after confirming the buying workflow.

## Instagram downloader

Sign into Instagram in Firefox and complete verification, then run:

```powershell
.\downlider.ps1 -Browser firefox
```

Alternatively, use an actual Instagram username, not an email:

```powershell
.\downlider.ps1 -LoginUser your_instagram_username
```

Keep `scripts/instaloader_compat.py` alongside the PowerShell script. It applies a process-local workaround for Instaloader's retired login query (upstream #2792 / #2795), leaving installed packages unchanged. A valid signed-in session is still required.

Chrome and Edge are supported, though cookie encryption may prevent import. Use `-CookieFile` with the correct profile database if several browser profiles exist. PATH warnings for pip command-line scripts do not affect this script.

Other options: `-FullDownload` ignores timestamps, `-UpdateInstaloader` updates dependencies, `-Anonymous` explicitly attempts anonymous access, and `-SessionFile` selects a session file with `-LoginUser`. Never put session/cookie files inside `public/`.

New downloads are not automatically products: select product photos and add them to the JSON to keep posters, duplicates and personal images out of the catalogue.

## Hosting

The default base path is `/`. The existing GitHub Pages workflow sets `BASE_PATH` from the repository name. For manual project-path hosting, build with `BASE_PATH=/steelkill/` (or the desired path). Product routes, links, responsive images and redirects respect the base path. Use `npm run build` so the image preparation and production cleanup hooks run.
