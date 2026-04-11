/**
 * Playwright configuration types and constants
 */

export interface PlaywrightConfig {
  mode: 'persistent' | 'isolated';
  headless: boolean;
  browser: string;
  device: string;
  customDevice: string;
  userDataDir: string;
  extraArgs: string[];
}

export interface StorageStateInfo {
  exists: boolean;
  cookieCount: number;
  domains: string[];
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
  }>;
}

export const DEFAULT_CONFIG: PlaywrightConfig = {
  mode: 'persistent',
  headless: false,
  browser: '',
  device: '',
  customDevice: '',
  userDataDir: '',
  extraArgs: [],
};

export const KNOWN_BROWSERS = [
  { id: '', label: '默认 (Chromium)' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'webkit', label: 'WebKit' },
  { id: 'msedge', label: 'Edge' },
];

export const DEVICE_PRESETS = [
  'iPhone 12',
  'iPhone 12 Pro',
  'iPhone 12 Pro Max',
  'iPhone 13',
  'iPhone 13 Pro',
  'iPhone 13 Pro Max',
  'iPhone 14',
  'iPhone 14 Pro',
  'iPhone 14 Pro Max',
  'iPad Pro',
  'iPad Mini',
  'iPad',
  'Galaxy S21',
  'Galaxy Tab S4',
  'Pixel 5',
];
