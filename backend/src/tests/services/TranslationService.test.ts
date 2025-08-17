import { TranslationService, BaiduTranslationProvider, GoogleTranslationProvider, MockTranslationProvider } from '../../services/TranslationService';

describe('TranslationService', () => {
  let translationService: TranslationService;

  beforeEach(() => {
    translationService = new TranslationService();
  });

  describe('translateText', () => {
    it('should translate text successfully', async () => {
      const request = {
        text: 'Hello world',
        from: 'auto' as const,
        to: 'zh' as const
      };

      const result = await translationService.translateText(request);

      expect(result).toBeDefined();
      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toContain('Hello world');
      expect(result.toLanguage).toBe('zh');
      expect(result.provider).toBeDefined();
    });

    it('should return original text when source and target languages are the same', async () => {
      const request = {
        text: 'Hello world',
        from: 'zh' as const,
        to: 'zh' as const
      };

      const result = await translationService.translateText(request);

      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toBe('Hello world');
      expect(result.provider).toBe('none');
    });

    it('should throw error for empty text', async () => {
      const request = {
        text: '',
        from: 'auto' as const,
        to: 'zh' as const
      };

      await expect(translationService.translateText(request)).rejects.toThrow('Text to translate cannot be empty');
    });

    it('should throw error for whitespace-only text', async () => {
      const request = {
        text: '   ',
        from: 'auto' as const,
        to: 'zh' as const
      };

      await expect(translationService.translateText(request)).rejects.toThrow('Text to translate cannot be empty');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Chinese text', () => {
      const result = translationService.detectLanguage('你好世界');
      expect(result).toBe('zh');
    });

    it('should detect Japanese text', () => {
      const result = translationService.detectLanguage('こんにちは世界');
      expect(result).toBe('ja');
    });

    it('should return auto for English text', () => {
      const result = translationService.detectLanguage('Hello world');
      expect(result).toBe('auto');
    });

    it('should detect Japanese when mixed with Chinese characters', () => {
      const result = translationService.detectLanguage('こんにちは世界');
      expect(result).toBe('ja');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return available providers', () => {
      const providers = translationService.getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('mock');
    });
  });

  describe('isAvailable', () => {
    it('should return true when providers are available', () => {
      expect(translationService.isAvailable()).toBe(true);
    });
  });
});

describe('BaiduTranslationProvider', () => {
  let provider: BaiduTranslationProvider;

  beforeEach(() => {
    provider = new BaiduTranslationProvider();
  });

  describe('isConfigured', () => {
    it('should return false when not configured', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return true when configured', () => {
      const configuredProvider = new BaiduTranslationProvider('test-app-id', 'test-secret');
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('translate', () => {
    it('should throw error when not configured', async () => {
      const request = {
        text: 'Hello world',
        from: 'auto' as const,
        to: 'zh' as const
      };

      await expect(provider.translate(request)).rejects.toThrow('Baidu Translation API not configured');
    });
  });
});

describe('GoogleTranslationProvider', () => {
  let provider: GoogleTranslationProvider;

  beforeEach(() => {
    provider = new GoogleTranslationProvider();
  });

  describe('isConfigured', () => {
    it('should return false when not configured', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should return true when configured', () => {
      const configuredProvider = new GoogleTranslationProvider('test-api-key');
      expect(configuredProvider.isConfigured()).toBe(true);
    });
  });

  describe('translate', () => {
    it('should throw error when not configured', async () => {
      const request = {
        text: 'Hello world',
        from: 'auto' as const,
        to: 'zh' as const
      };

      await expect(provider.translate(request)).rejects.toThrow('Google Translation API not configured');
    });
  });
});

describe('MockTranslationProvider', () => {
  let provider: MockTranslationProvider;

  beforeEach(() => {
    provider = new MockTranslationProvider();
  });

  describe('isConfigured', () => {
    it('should always return true', () => {
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('translate', () => {
    it('should translate to Chinese', async () => {
      const request = {
        text: 'Hello world',
        from: 'auto' as const,
        to: 'zh' as const
      };

      const result = await provider.translate(request);

      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toBe('[中文翻译] Hello world');
      expect(result.fromLanguage).toBe('auto');
      expect(result.toLanguage).toBe('zh');
      expect(result.provider).toBe('mock');
    });

    it('should translate to Japanese', async () => {
      const request = {
        text: 'Hello world',
        from: 'auto' as const,
        to: 'ja' as const
      };

      const result = await provider.translate(request);

      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toBe('[日本語翻訳] Hello world');
      expect(result.fromLanguage).toBe('auto');
      expect(result.toLanguage).toBe('ja');
      expect(result.provider).toBe('mock');
    });
  });
});