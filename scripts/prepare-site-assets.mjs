import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { catalog, site, root, validateImage } from './validate-catalog.mjs';

const output = resolve(root, 'public/images/optimized');
await mkdir(output, { recursive: true });
const images = new Set([site.hero, site.editorial, site.detail, ...site.lookbook, ...site.edits.map(edit => edit.image)]);
for (const product of catalog.products) for (const image of [product.image, ...(product.images || [])]) images.add(image);
let generated = 0;
for (const image of images) {
  const input = validateImage(image);
  const source = await stat(input);
  for (const width of [480, 960, 1600]) {
    const target = resolve(output, `${basename(image, extname(image))}-${width}.webp`);
    const existing = await stat(target).catch(() => null);
    if (existing && existing.mtimeMs >= source.mtimeMs) continue;
    await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 83 }).toFile(target);
    generated++;
  }
}
const logo = resolve(output, 'steelkill-logo.webp');
const logoSource = validateImage(site.logo);
if (!(await stat(logo).catch(() => null)) || (await stat(logoSource)).mtimeMs > (await stat(logo)).mtimeMs) {
  // Remove only the black margins from the supplied logo for header/footer use.
  await sharp(logoSource).trim({ background: '#000000', threshold: 35 }).resize({ width: 700, withoutEnlargement: true }).webp({ quality: 90 }).toFile(logo);
  generated++;
}
console.log(`Catalogue validated. ${generated} web images prepared from original photos.`);
