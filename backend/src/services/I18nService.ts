import type { Language } from '../types/user';

/**
 * Translation keys for the system
 */
export interface TranslationKeys {
  // Common messages
  'common.success': string;
  'common.error': string;
  'common.validation_error': string;
  'common.unauthorized': string;
  'common.forbidden': string;
  'common.not_found': string;
  'common.internal_error': string;

  // User messages
  'user.created': string;
  'user.updated': string;
  'user.deleted': string;
  'user.not_found': string;
  'user.username_exists': string;
  'user.language_updated': string;

  // Auth messages
  'auth.login_success': string;
  'auth.logout_success': string;
  'auth.invalid_credentials': string;
  'auth.token_expired': string;

  // Inquiry messages
  'inquiry.created': string;
  'inquiry.updated': string;
  'inquiry.cancelled': string;
  'inquiry.not_found': string;

  // Quotation messages
  'quotation.created': string;
  'quotation.updated': string;
  'quotation.cancelled': string;

  // Order messages
  'order.created': string;
  'order.updated': string;
  'order.confirmed': string;
  'order.cancelled': string;
  'order.status_updated': string;

  // Notification messages
  'notification.new_quotation': string;
  'notification.order_confirmed': string;
  'notification.status_updated': string;
  'notification.new_message': string;
}

/**
 * Chinese translations
 */
const zhTranslations: TranslationKeys = {
  // Common messages
  'common.success': '操作成功',
  'common.error': '操作失败',
  'common.validation_error': '验证错误',
  'common.unauthorized': '未授权访问',
  'common.forbidden': '权限不足',
  'common.not_found': '资源未找到',
  'common.internal_error': '系统内部错误',

  // User messages
  'user.created': '用户创建成功',
  'user.updated': '用户信息更新成功',
  'user.deleted': '用户删除成功',
  'user.not_found': '用户不存在',
  'user.username_exists': '用户名已存在',
  'user.language_updated': '语言设置更新成功',

  // Auth messages
  'auth.login_success': '登录成功',
  'auth.logout_success': '退出登录成功',
  'auth.invalid_credentials': '用户名或密码错误',
  'auth.token_expired': '登录已过期，请重新登录',

  // Inquiry messages
  'inquiry.created': '询单创建成功',
  'inquiry.updated': '询单更新成功',
  'inquiry.cancelled': '询单已作废',
  'inquiry.not_found': '询单不存在',

  // Quotation messages
  'quotation.created': '报价提交成功',
  'quotation.updated': '报价更新成功',
  'quotation.cancelled': '报价已作废',

  // Order messages
  'order.created': '订单创建成功',
  'order.updated': '订单更新成功',
  'order.confirmed': '订单确认成功',
  'order.cancelled': '订单已作废',
  'order.status_updated': '订单状态更新成功',

  // Notification messages
  'notification.new_quotation': '收到新报价',
  'notification.order_confirmed': '订单已确认',
  'notification.status_updated': '状态已更新',
  'notification.new_message': '收到新消息',
};

/**
 * Japanese translations
 */
const jaTranslations: TranslationKeys = {
  // Common messages
  'common.success': '操作が成功しました',
  'common.error': '操作が失敗しました',
  'common.validation_error': '検証エラー',
  'common.unauthorized': '認証が必要です',
  'common.forbidden': '権限が不足しています',
  'common.not_found': 'リソースが見つかりません',
  'common.internal_error': 'システム内部エラー',

  // User messages
  'user.created': 'ユーザーが作成されました',
  'user.updated': 'ユーザー情報が更新されました',
  'user.deleted': 'ユーザーが削除されました',
  'user.not_found': 'ユーザーが存在しません',
  'user.username_exists': 'ユーザー名が既に存在します',
  'user.language_updated': '言語設定が更新されました',

  // Auth messages
  'auth.login_success': 'ログインしました',
  'auth.logout_success': 'ログアウトしました',
  'auth.invalid_credentials': 'ユーザー名またはパスワードが間違っています',
  'auth.token_expired': 'ログインの有効期限が切れました。再度ログインしてください',

  // Inquiry messages
  'inquiry.created': '問い合わせが作成されました',
  'inquiry.updated': '問い合わせが更新されました',
  'inquiry.cancelled': '問い合わせがキャンセルされました',
  'inquiry.not_found': '問い合わせが存在しません',

  // Quotation messages
  'quotation.created': '見積もりが提出されました',
  'quotation.updated': '見積もりが更新されました',
  'quotation.cancelled': '見積もりがキャンセルされました',

  // Order messages
  'order.created': '注文が作成されました',
  'order.updated': '注文が更新されました',
  'order.confirmed': '注文が確認されました',
  'order.cancelled': '注文がキャンセルされました',
  'order.status_updated': '注文ステータスが更新されました',

  // Notification messages
  'notification.new_quotation': '新しい見積もりを受信しました',
  'notification.order_confirmed': '注文が確認されました',
  'notification.status_updated': 'ステータスが更新されました',
  'notification.new_message': '新しいメッセージを受信しました',
};

/**
 * I18n Service for handling internationalization
 */
export class I18nService {
  private static translations = {
    zh: zhTranslations,
    ja: jaTranslations,
  };

  /**
   * Get translation for a key in specified language
   */
  static translate(key: keyof TranslationKeys, language: Language = 'zh'): string {
    const translations = this.translations[language] || this.translations.zh;
    return translations[key] || this.translations.zh[key] || key;
  }

  /**
   * Get all translations for a language
   */
  static getTranslations(language: Language = 'zh'): TranslationKeys {
    return this.translations[language] || this.translations.zh;
  }

  /**
   * Check if a language is supported
   */
  static isSupportedLanguage(language: string): language is Language {
    return language === 'zh' || language === 'ja';
  }

  /**
   * Get default language
   */
  static getDefaultLanguage(): Language {
    return 'zh';
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): Language[] {
    return ['zh', 'ja'];
  }
}