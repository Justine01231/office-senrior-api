// src/config/environment.ts
export class Environment {
  // JWT Configuration
  static readonly JWT_SECRET = (() => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    return secret;
  })();

  static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  // Database Configuration
  static readonly DATABASE_URL = (() => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    return url;
  })();

  // Server Configuration
  static readonly PORT = parseInt(process.env.PORT || '3000');
  static readonly NODE_ENV = process.env.NODE_ENV || 'development';
  
  // Security Configuration
  static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  static readonly RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes
  static readonly RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100'); // requests per window
  
  // CORS Configuration
  static readonly ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://10.0.2.2:3000',
    'https://office-senrior-api.onrender.com'
  ];
  
  // Validation
  static validate() {
    console.log('🔒 Environment validation passed');
    console.log(`📊 Running in ${this.NODE_ENV} mode`);
    console.log(`🌐 Server will run on port ${this.PORT}`);
    console.log(`🔑 JWT expires in ${this.JWT_EXPIRES_IN}`);
  }
}

// Validate environment on import
Environment.validate();
