import { I18nService } from '../../services/I18nService';
import type { Language } from '../../types/user';

describe('I18nService', () => {
  describe('translate', () => {
    it('should return Chinese translation by default', () => {
      const result = I18nService.translate('common.success');
      expect(result).toBe('操作成功');
    });

    it('should return Chinese translation when language is zh', () => {
      const result = I18nService.translate('common.success', 'zh');
      expect(result).toBe('操作成功');
    });

    it('should return Japanese translation when language is ja', () => {
      const result = I18nService.translate('common.success', 'ja');
      expect(result).toBe('操作が成功しました');
    });

    it('should return Chinese translation for unsupported language', () => {
      const result = I18nService.translate('common.success', 'en' as Language);
      expect(result).toBe('操作成功');
    });

    it('should return key when translation not found', () => {
      const result = I18nService.translate('nonexistent.key' as any);
      expect(result).toBe('nonexistent.key');
    });

    it('should translate user messages correctly', () => {
      expect(I18nService.translate('user.created', 'zh')).toBe('用户创建成功');
      expect(I18nService.translate('user.created', 'ja')).toBe('ユーザーが作成されました');
    });

    it('should translate auth messages correctly', () => {
      expect(I18nService.translate('auth.login_success', 'zh')).toBe('登录成功');
      expect(I18nService.translate('auth.login_success', 'ja')).toBe('ログインしました');
    });

    it('should translate inquiry messages correctly', () => {
      expect(I18nService.translate('inquiry.created', 'zh')).toBe('询单创建成功');
      expect(I18nService.translate('inquiry.created', 'ja')).toBe('問い合わせが作成されました');
    });

    it('should translate order messages correctly', () => {
      expect(I18nService.translate('order.confirmed', 'zh')).toBe('订单确认成功');
      expect(I18nService.translate('order.confirmed', 'ja')).toBe('注文が確認されました');
    });
  });

  describe('getTranslations', () => {
    it('should return Chinese translations by default', () => {
      const translations = I18nService.getTranslations();
      expect(translations['common.success']).toBe('操作成功');
      expect(translations['user.created']).toBe('用户创建成功');
    });

    it('should return Chinese translations for zh', () => {
      const translations = I18nService.getTranslations('zh');
      expect(translations['common.success']).toBe('操作成功');
      expect(translations['user.created']).toBe('用户创建成功');
    });

    it('should return Japanese translations for ja', () => {
      const translations = I18nService.getTranslations('ja');
      expect(translations['common.success']).toBe('操作が成功しました');
      expect(translations['user.created']).toBe('ユーザーが作成されました');
    });

    it('should return Chinese translations for unsupported language', () => {
      const translations = I18nService.getTranslations('en' as Language);
      expect(translations['common.success']).toBe('操作成功');
    });
  });

  describe('isSupportedLanguage', () => {
    it('should return true for Chinese', () => {
      expect(I18nService.isSupportedLanguage('zh')).toBe(true);
    });

    it('should return true for Japanese', () => {
      expect(I18nService.isSupportedLanguage('ja')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(I18nService.isSupportedLanguage('en')).toBe(false);
      expect(I18nService.isSupportedLanguage('fr')).toBe(false);
      expect(I18nService.isSupportedLanguage('')).toBe(false);
      expect(I18nService.isSupportedLanguage('invalid')).toBe(false);
    });
  });

  describe('getDefaultLanguage', () => {
    it('should return zh as default language', () => {
      expect(I18nService.getDefaultLanguage()).toBe('zh');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = I18nService.getSupportedLanguages();
      expect(languages).toEqual(['zh', 'ja']);
      expect(languages).toHaveLength(2);
    });
  });
});