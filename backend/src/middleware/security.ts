import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { body, validationResult, sanitizeBody } from 'express-validator';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow for file uploads
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs to prevent XSS
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

// SQL injection prevention middleware
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/))/gi,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
    /((\%27)|(\'))((\%75)|u|(\%55))((\%6E)|n|(\%4E))((\%69)|i|(\%49))((\%6F)|o|(\%4F))((\%6E)|n|(\%4E))/gi
  ];

  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForSQLInjection);
    }
    return false;
  };

  // Check request body
  if (req.body && checkForSQLInjection(req.body)) {
    console.warn(`SQL injection attempt detected from IP: ${req.ip}`, {
      body: req.body,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '输入包含非法字符'
      }
    });
  }

  // Check query parameters
  if (req.query && checkForSQLInjection(req.query)) {
    console.warn(`SQL injection attempt detected in query from IP: ${req.ip}`, {
      query: req.query,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '查询参数包含非法字符'
      }
    });
  }

  next();
};

// File upload security middleware
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: any) => {
    // Check file size
    if (file.size > maxFileSize) {
      throw new Error('文件大小超过限制（最大10MB）');
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('不支持的文件类型');
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('不支持的文件扩展名');
    }

    // Check for executable files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.sh'];
    if (dangerousExtensions.includes(fileExtension)) {
      throw new Error('禁止上传可执行文件');
    }
  };

  try {
    if (req.file) {
      validateFile(req.file);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(validateFile);
      } else {
        Object.values(req.files).flat().forEach(validateFile);
      }
    }

    next();
  } catch (error) {
    console.warn(`File upload security violation from IP: ${req.ip}`, {
      error: error.message,
      file: req.file?.originalname,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'FILE_SECURITY_VIOLATION',
        message: error.message
      }
    });
  }
};

// Request size limiter
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxRequestSize = 50 * 1024 * 1024; // 50MB for file uploads
  const contentLength = parseInt(req.get('content-length') || '0');

  if (contentLength > maxRequestSize) {
    console.warn(`Large request detected from IP: ${req.ip}`, {
      contentLength,
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    return res.status(413).json({
      success: false,
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: '请求体过大'
      }
    });
  }

  next();
};

// Suspicious activity detector
export const suspiciousActivityDetector = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\.\.\//g, // Directory traversal
    /%2e%2e%2f/gi, // URL encoded directory traversal
    /\0/g, // Null bytes
    /<iframe/gi, // Iframe injection
    /<object/gi, // Object injection
    /<embed/gi, // Embed injection
    /eval\(/gi, // JavaScript eval
    /expression\(/gi, // CSS expression
    /vbscript:/gi, // VBScript protocol
    /data:text\/html/gi // Data URI HTML
  ];

  const checkSuspiciousActivity = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  // Check URL
  if (checkSuspiciousActivity(req.url)) {
    console.warn(`Suspicious URL detected from IP: ${req.ip}`, {
      url: req.url,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      success: false,
      error: {
        code: 'SUSPICIOUS_ACTIVITY',
        message: '检测到可疑活动'
      }
    });
  }

  // Check headers
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
  for (const header of suspiciousHeaders) {
    const headerValue = req.get(header);
    if (headerValue && checkSuspiciousActivity(headerValue)) {
      console.warn(`Suspicious header detected from IP: ${req.ip}`, {
        header,
        value: headerValue,
        userAgent: req.get('User-Agent')
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'SUSPICIOUS_ACTIVITY',
          message: '检测到可疑活动'
        }
      });
    }
  }

  next();
};

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '输入验证失败',
        details: errors.array()
      }
    });
  }
  next();
};