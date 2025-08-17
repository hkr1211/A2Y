import axios from 'axios';
import crypto from 'crypto';

export interface TranslationRequest {
  text: string;
  from: 'zh' | 'ja' | 'auto';
  to: 'zh' | 'ja';
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  provider: string;
}

export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResponse>;
  isConfigured(): boolean;
}

// Baidu Translation API Provider
export class BaiduTranslationProvider implements TranslationProvider {
  private appId: string;
  private secretKey: string;
  private apiUrl = 'https://fanyi-api.baidu.com/api/trans/vip/translate';

  constructor(appId?: string, secretKey?: string) {
    this.appId = appId || process.env.BAIDU_TRANSLATE_APP_ID || '';
    this.secretKey = secretKey || process.env.BAIDU_TRANSLATE_SECRET_KEY || '';
  }

  isConfigured(): boolean {
    return !!(this.appId && this.secretKey);
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.isConfigured()) {
      throw new Error('Baidu Translation API not configured');
    }

    const salt = Date.now().toString();
    const sign = this.generateSign(request.text, salt);

    const params = {
      q: request.text,
      from: this.mapLanguageCode(request.from),
      to: this.mapLanguageCode(request.to),
      appid: this.appId,
      salt,
      sign
    };

    try {
      const response = await axios.get(this.apiUrl, { params });
      
      if (response.data.error_code) {
        throw new Error(`Baidu Translation API error: ${response.data.error_msg}`);
      }

      const result = response.data.trans_result[0];
      
      return {
        originalText: request.text,
        translatedText: result.dst,
        fromLanguage: request.from,
        toLanguage: request.to,
        provider: 'baidu'
      };
    } catch (error) {
      console.error('Baidu translation error:', error);
      throw new Error('Translation failed');
    }
  }

  private generateSign(text: string, salt: string): string {
    const str = this.appId + text + salt + this.secretKey;
    return crypto.createHash('md5').update(str).digest('hex');
  }

  private mapLanguageCode(lang: string): string {
    const mapping: { [key: string]: string } = {
      'zh': 'zh',
      'ja': 'jp',
      'auto': 'auto'
    };
    return mapping[lang] || lang;
  }
}

// Google Translation API Provider (placeholder implementation)
export class GoogleTranslationProvider implements TranslationProvider {
  private apiKey: string;
  private apiUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_TRANSLATE_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    if (!this.isConfigured()) {
      throw new Error('Google Translation API not configured');
    }

    const params = {
      q: request.text,
      source: request.from === 'auto' ? undefined : request.from,
      target: request.to,
      key: this.apiKey
    };

    try {
      const response = await axios.post(this.apiUrl, params);
      const result = response.data.data.translations[0];
      
      return {
        originalText: request.text,
        translatedText: result.translatedText,
        fromLanguage: result.detectedSourceLanguage || request.from,
        toLanguage: request.to,
        provider: 'google'
      };
    } catch (error) {
      console.error('Google translation error:', error);
      throw new Error('Translation failed');
    }
  }
}

// Mock Translation Provider for testing
export class MockTranslationProvider implements TranslationProvider {
  isConfigured(): boolean {
    return true;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    // Simple mock translation - just add prefix to indicate translation
    const translatedText = request.to === 'zh' 
      ? `[中文翻译] ${request.text}`
      : `[日本語翻訳] ${request.text}`;

    return {
      originalText: request.text,
      translatedText,
      fromLanguage: request.from,
      toLanguage: request.to,
      provider: 'mock'
    };
  }
}

// Main Translation Service
export class TranslationService {
  private providers: TranslationProvider[];
  private defaultProvider: TranslationProvider;

  constructor() {
    this.providers = [
      new BaiduTranslationProvider(),
      new GoogleTranslationProvider(),
      new MockTranslationProvider()
    ];

    // Use the first configured provider as default
    this.defaultProvider = this.providers.find(p => p.isConfigured()) || new MockTranslationProvider();
  }

  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    // Validate input
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Text to translate cannot be empty');
    }

    if (request.from === request.to) {
      // No translation needed
      return {
        originalText: request.text,
        translatedText: request.text,
        fromLanguage: request.from,
        toLanguage: request.to,
        provider: 'none'
      };
    }

    // Try to translate with the default provider
    try {
      return await this.defaultProvider.translate(request);
    } catch (error) {
      console.error('Translation failed with default provider:', error);
      
      // Try with other configured providers
      for (const provider of this.providers) {
        if (provider !== this.defaultProvider && provider.isConfigured()) {
          try {
            return await provider.translate(request);
          } catch (providerError) {
            console.error('Translation failed with provider:', providerError);
            continue;
          }
        }
      }
      
      throw new Error('All translation providers failed');
    }
  }

  async translateChatMessage(messageId: string, targetLanguage: 'zh' | 'ja'): Promise<TranslationResponse> {
    // This method would typically fetch the message from database
    // For now, we'll throw an error indicating it needs to be implemented with database access
    throw new Error('translateChatMessage requires database access - should be called from controller');
  }

  // Utility method to detect language (basic implementation)
  detectLanguage(text: string): 'zh' | 'ja' | 'auto' {
    // Simple detection based on character sets
    const chineseRegex = /[\u4e00-\u9fff]/;
    const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;

    if (japaneseRegex.test(text)) {
      return 'ja';
    } else if (chineseRegex.test(text)) {
      return 'zh';
    }
    
    return 'auto';
  }

  // Get available providers
  getAvailableProviders(): string[] {
    return this.providers
      .filter(p => p.isConfigured())
      .map(p => p.constructor.name.replace('TranslationProvider', '').toLowerCase());
  }

  // Check if translation service is available
  isAvailable(): boolean {
    return this.providers.some(p => p.isConfigured());
  }
}