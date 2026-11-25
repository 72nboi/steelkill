import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { root } from './validate-catalog.mjs';

// Keep the complete Instagram download for editing, but publish only curated assets.
const buildRoot = resolve(root, 'dist');
const originalDownloads = resolve(buildRoot, 'images', 'instagram');
if (!originalDownloads.startsWith(buildRoot + sep)) throw new Error('Refusing to remove a directory outside dist.');
await rm(originalDownloads, { recursive: true, force: true });
console.log('Build ready: curated web images included; uncurated Instagram originals excluded.');
