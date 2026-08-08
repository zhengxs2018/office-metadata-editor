import packageJson from '../../package.json';
import tauriConfig from '../../src-tauri/tauri.conf.json';

const tauriWindowTitle = tauriConfig.app?.windows?.[0]?.title;

export const APP_PACKAGE_NAME = packageJson.name;
export const APP_NAME = tauriConfig.productName || tauriWindowTitle || packageJson.name;
export const APP_VERSION = packageJson.version || tauriConfig.version;
export const APP_TAURI_VERSION = tauriConfig.version;
export const APP_WINDOW_TITLE = tauriWindowTitle || APP_NAME;

export const appConfig = {
  packageName: APP_PACKAGE_NAME,
  productName: APP_NAME,
  version: APP_VERSION,
  tauriVersion: APP_TAURI_VERSION,
  windowTitle: APP_WINDOW_TITLE,
} as const;
