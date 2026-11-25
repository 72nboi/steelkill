import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const catalog = JSON.parse(readFileSync(resolve(root, 'src/data/products.json'), 'utf8'));
export const site = JSON.parse(readFileSync(resolve(root, 'src/data/site.json'), 'utf8'));

export function validateCatalog(data = catalog) {
  if (data.currency !== 'GBP') throw new Error('products.json: currency must be GBP. Prices are in pounds, not pence.');
  if (!Array.isArray(data.products)) throw new Error('products.json: products must be an array.');
  const ids = new Set();
  for (const product of data.products) {
    const label = `products.json (${product.id || 'unnamed product'})`;
    if (typeof product.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id) || ids.has(product.id)) throw new Error(`${label}: use a unique slug for id.`);
    ids.add(product.id);
    for (const field of ['name', 'description', 'category', 'image']) {
      if (typeof product[field] !== 'string' || !product[field].trim()) throw new Error(`${label}: ${field} is required.`);
    }
    if (product.price !== null && (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0)) throw new Error(`${label}: price must be a positive number or null for price on enquiry.`);
    if (product.images !== undefined && (!Array.isArray(product.images) || product.images.some(image => typeof image !== 'string'))) throw new Error(`${label}: images must be a list of image paths.`);
    if (product.featured !== undefined && typeof product.featured !== 'boolean') throw new Error(`${label}: featured must be true or false.`);
    for (const image of [product.image, ...(product.images || []), ...(product.priceSource ? [product.priceSource] : [])]) validateImage(image, label);
  }
  return data;
}

export function validateImage(image, label = 'site.json') {
  const publicRoot = resolve(root, 'public');
  if (typeof image !== 'string' || !image.startsWith('/images/')) throw new Error(`${label}: use an image path beginning with /images/.`);
  const path = resolve(publicRoot, image.slice(1));
  if (!path.startsWith(publicRoot + sep) || !/\.(jpe?g|png|webp)$/i.test(path) || !existsSync(path)) throw new Error(`${label}: missing or invalid image ${image}`);
  return path;
}

validateCatalog();
for (const image of [site.logo, site.hero, site.editorial, site.detail, ...site.lookbook, ...site.edits.map(edit => edit.image)]) validateImage(image);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(`Catalogue valid: ${catalog.products.length} products, GBP.`);
