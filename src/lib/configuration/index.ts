import { invoke } from '@tauri-apps/api/core';

export type ConfigurationTree = Record<string, unknown>;

let cache: ConfigurationTree | null = null;
const listeners = new Set<(tree: ConfigurationTree) => void>();

/**
 * 按点分键从嵌套树中取值。
 *
 * 同时兼容扁平写法（`{"a.b": 1}`）与嵌套写法（`{"a":{"b":1}}`），
 * 与 Rust 侧 `get_deep` 行为保持一致。
 */
function getDeep(root: unknown, key: string): unknown {
  if (root === null || typeof root !== 'object') return undefined;

  const map = root as Record<string, unknown>;
  if (key in map) return map[key];

  const segments = key.split('.').filter(Boolean);
  let cursor: unknown = root;

  for (let i = 0; i < segments.length; i += 1) {
    if (cursor === null || typeof cursor !== 'object') return undefined;
    const current = cursor as Record<string, unknown>;

    const remaining = segments.slice(i).join('.');
    if (remaining in current) return current[remaining];

    if (!(segments[i] in current)) return undefined;
    cursor = current[segments[i]];
  }

  return cursor;
}

export interface ConfigurationSection {
  get<T>(key: string, fallback: T): T;
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Promise<void>;
}

/**
 * 从后端拉取配置并填充缓存。应在应用启动时调用一次。
 *
 * @throws 当 Tauri 命令不可用时抛出，调用方应降级为内置默认值。
 */
export async function loadConfiguration(): Promise<ConfigurationTree> {
  const tree = await invoke<ConfigurationTree>('get_configuration');
  cache = tree;
  listeners.forEach(listener => listener(tree));
  return tree;
}

/** 当前缓存的配置树；未加载时为空对象。 */
export function getConfigurationTree(): ConfigurationTree {
  return cache ?? {};
}

/**
 * 取某个前缀分组
 *
 * @example
 * const config = getConfiguration('ui.export');
 * const reveal = config.get('revealAfterExport', true);
 */
export function getConfiguration(prefix = ''): ConfigurationSection {
  const fullKey = (key: string) => {
    if (!prefix) return key;
    if (!key) return prefix;
    return `${prefix}.${key}`;
  };

  function get<T>(key: string, fallback?: T): T | undefined {
    const value = getDeep(cache ?? {}, fullKey(key));
    return value === undefined || value === null ? fallback : (value as T);
  }

  return {
    get: get as ConfigurationSection['get'],
    async update(key: string, value: unknown) {
      const tree = await invoke<ConfigurationTree>('update_configuration', {
        key: fullKey(key),
        value,
      });
      cache = tree;
      listeners.forEach(listener => listener(tree));
    },
  };
}

/** 订阅配置变更，返回取消订阅函数。 */
export function onConfigurationChanged(listener: (tree: ConfigurationTree) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 恢复全部默认值。 */
export async function resetConfiguration(): Promise<ConfigurationTree> {
  const tree = await invoke<ConfigurationTree>('reset_configuration');
  cache = tree;
  listeners.forEach(listener => listener(tree));
  return tree;
}

/** `settings.json` 的绝对路径，供「在文件夹中显示」使用。 */
export function getConfigurationPath(): Promise<string> {
  return invoke<string>('get_configuration_path');
}
