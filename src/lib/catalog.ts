import data from '../data/products.json';
import siteData from '../data/site.json';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: string;
  image: string;
  images?: string[];
  featured?: boolean;
}
export const products: Product[] = data.products;
export const site = siteData;
export const categories = [...new Set(products.map(product => product.category))];
export const url = (path = '') => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
export const price = (value: number | null) => value === null ? 'Price on enquiry' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: data.currency }).format(value);
export const photo = (image: string, width = 960) => url(`images/optimized/${image.split('/').pop()!.replace(/\.[^.]+$/, '')}-${width}.webp`);
