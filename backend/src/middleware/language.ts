import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import type { Language } from '../types/user';
import type { AuthenticatedRequest } from './auth';

export interface LanguageRequest extends AuthenticatedRequest {
  language?: Language;
}

/**
 * Language middleware to set user's preferred language
 * This middleware should be used after authentication middleware
 */
export const setUserLanguage = async (
  req: LanguageRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Default language
    let userLanguage: Language = 'zh';

    // If user is authenticated, get their language preference
    if (req.user?.userId) {
      const user = await UserModel.findById(req.user.userId);
      if (user && user.language) {
        userLanguage = user.language;
      }
    }

    // Check for language override in headers (for manual language switching)
    const headerLanguage = req.headers['accept-language'] as string;
    if (headerLanguage && (headerLanguage === 'zh' || headerLanguage === 'ja')) {
      userLanguage = headerLanguage as Language;
    }

    // Set language in request object
    req.language = userLanguage;

    next();
  } catch (error) {
    console.error('Language middleware error:', error);
    // Don't fail the request, just use default language
    req.language = 'zh';
    next();
  }
};

/**
 * Get user's current language preference
 */
export const getUserLanguage = (req: LanguageRequest): Language => {
  return req.language || 'zh';
};

/**
 * Validate language parameter
 */
export const validateLanguage = (language: string): language is Language => {
  return language === 'zh' || language === 'ja';
};