/** 应用路由集中常量，避免字符串散落在各页面造成耦合。 */
export const ROUTES = {
  home: '/',
  editor: '/editor',
  batch: '/batch',
  compare: '/compare',
  hidden: '/hidden',
  imageExif: '/image-exif',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
