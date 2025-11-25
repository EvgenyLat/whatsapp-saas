import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  // SECURITY: Enforce JWT secrets are set - no defaults allowed
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT_SECRET environment variable must be set and at least 32 characters long. ' +
      'Generate a secure secret using: openssl rand -base64 32'
    );
  }

  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error(
      'SECURITY ERROR: JWT_REFRESH_SECRET environment variable must be set and at least 32 characters long. ' +
      'Generate a secure secret using: openssl rand -base64 32'
    );
  }

  // Prevent using default/example secrets
  const insecurePatterns = [
    'change-this',
    'secret-key',
    'your-secret',
    'example',
    'test-secret',
    'development',
  ];

  const secretLower = jwtSecret.toLowerCase();
  const refreshSecretLower = jwtRefreshSecret.toLowerCase();

  for (const pattern of insecurePatterns) {
    if (secretLower.includes(pattern) || refreshSecretLower.includes(pattern)) {
      throw new Error(
        'SECURITY ERROR: JWT secrets appear to be using insecure default values. ' +
        'Please set strong, randomly generated secrets.'
      );
    }
  }

  return {
    secret: jwtSecret,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshSecret: jwtRefreshSecret,
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
  };
});
