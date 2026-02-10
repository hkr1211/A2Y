const LOCALE_MAP: Record<string, string> = {
  zh: 'zh-CN',
  ja: 'ja-JP',
};

export function getDateLocale(): string {
  const lang = localStorage.getItem('language') || 'zh';
  return LOCALE_MAP[lang] || 'zh-CN';
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(getDateLocale());
}

export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const locale = getDateLocale();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleString(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
