
import { Product, User } from '../types';
import { MOCK_PRODUCTS } from '../constants';

const DB_KEYS = {
  PRODUCTS: 'mamo_db_products',
  USERS: 'mamo_db_users',
  ORDERS: 'mamo_db_orders'
};

class LocalDatabase {
  private read(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  private write(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) { }
  }

  get products(): Product[] {
    const stored = this.read(DB_KEYS.PRODUCTS);
    if (!stored) {
      this.write(DB_KEYS.PRODUCTS, MOCK_PRODUCTS);
      return MOCK_PRODUCTS;
    }
    return stored;
  }

  set products(data: Product[]) {
    this.write(DB_KEYS.PRODUCTS, data);
  }
}

const localDb = new LocalDatabase();

export class BackendAPI {
  // استخدام مسارات نسبية كخيار أول، ثم محاولة الاتصال بالسيرفر المحلي
  public static get API_URL() {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('mamo_server_url');
      if (savedUrl) return `${savedUrl.replace(/\/$/, '')}/api`;
      
      // في بيئات التطوير السحابي، السيرفر غالباً ما يكون غير متاح على منفذ مختلف
      // لذا سنعتمد على نظام الـ Fallback (المحاكاة) بشكل أساسي لتجنب أخطاء Fetch
      return '/api'; 
    }
    return 'http://localhost:3001/api';
  }

  public static async getProducts(): Promise<Product[]> {
    try {
      // محاولة سريعة للاتصال بالسيرفر مع timeout قصير جداً
      const res = await this.request('/products', { method: 'GET' }, 2000);
      return res;
    } catch {
      return localDb.products;
    }
  }

  public static async addProduct(product: Product) {
    const products = localDb.products;
    products.unshift(product);
    localDb.products = products;
    return this.post('/products', product).catch(() => ({ success: true }));
  }

  public static async updateProduct(product: Product) {
    const products = localDb.products;
    const idx = products.findIndex(p => p.id === product.id);
    if (idx !== -1) products[idx] = product;
    localDb.products = products;
    return this.request(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) }).catch(() => ({ success: true }));
  }

  public static async deleteProduct(id: string) {
    localDb.products = localDb.products.filter(p => p.id !== id);
    return this.request(`/products/${id}`, { method: 'DELETE' }).catch(() => ({ success: true }));
  }

  public static async login(name: string, phone: string) {
    const user = { id: phone, name, phone, joinDate: new Date().toISOString() };
    localStorage.setItem('mamo_current_user', JSON.stringify(user));
    return { user };
  }

  public static async post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  private static async request(endpoint: string, options: RequestInit = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.API_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers }
      });
      clearTimeout(id);
      if (!response.ok) throw new Error();
      return await response.json();
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  public static setServerUrl(url: string) {
    localStorage.setItem('mamo_server_url', url);
    window.location.reload();
  }

  public static getServerUrl() {
    return localStorage.getItem('mamo_server_url') || '';
  }
}
