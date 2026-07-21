export const ROUTES = {
  home: "/",
  archive: "/archive",
  post: (slug: string): string => `/posts/${slug}`,
} as const;

export const HOME_ENTRY_COUNT = 5;
export const ARCHIVE_PAGE_SIZE = 10;

export const readingTime = (minutes: number): string => `${minutes} min read`;
