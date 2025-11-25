/**
 * API Versioning Strategy
 * WhatsApp SaaS Platform
 *
 * Version management for API requests:
 * - URL-based versioning
 * - Backward compatibility checks
 * - Version negotiation
 * - Migration helpers
 *
 * @see https://restfulapi.net/versioning/
 */

import type { InternalAxiosRequestConfig } from 'axios';
import { logger } from '../monitoring/logger';

/**
 * Supported API versions
 */
export type ApiVersion = 'v1' | 'v2';

/**
 * Current API version (primary version to use)
 */
export const CURRENT_API_VERSION: ApiVersion = 'v1';

/**
 * Supported API versions list
 */
export const SUPPORTED_API_VERSIONS: ApiVersion[] = ['v1', 'v2'];

/**
 * Deprecated API versions
 */
export const DEPRECATED_API_VERSIONS: ApiVersion[] = [];

/**
 * Version compatibility matrix
 * Defines which client versions are compatible with which server versions
 */
export const VERSION_COMPATIBILITY: Record<ApiVersion, ApiVersion[]> = {
  v1: ['v1', 'v2'], // v1 client can talk to v1 and v2 servers
  v2: ['v2'], // v2 client requires v2 server
};

/**
 * Version migration paths
 * Defines how to migrate from one version to another
 */
export interface VersionMigration {
  from: ApiVersion;
  to: ApiVersion;
  migrate: (data: any) => any;
}

/**
 * API version metadata
 */
export interface VersionMetadata {
  version: ApiVersion;
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  features: string[];
  breaking: boolean;
}

/**
 * Version metadata registry
 */
export const VERSION_METADATA: Record<ApiVersion, VersionMetadata> = {
  v1: {
    version: 'v1',
    releaseDate: '2024-01-01',
    features: [
      'Authentication',
      'Messages',
      'Contacts',
      'Templates',
      'Analytics',
      'Settings',
    ],
    breaking: false,
  },
  v2: {
    version: 'v2',
    releaseDate: '2024-06-01',
    features: [
      'Enhanced Analytics',
      'Bulk Operations',
      'Advanced Filtering',
      'Webhooks',
      'Rate Limiting Info',
    ],
    breaking: true,
  },
};

/**
 * Extended request config with version support
 */
export interface VersionedRequestConfig extends InternalAxiosRequestConfig {
  apiVersion?: ApiVersion;
  skipVersioning?: boolean;
}

/**
 * Add API version to request URL
 * Modifies the URL to include version prefix
 *
 * @param config - Request configuration
 * @param version - API version to use (defaults to CURRENT_API_VERSION)
 * @returns Modified configuration
 */
export function addApiVersion(
  config: InternalAxiosRequestConfig,
  version: ApiVersion = CURRENT_API_VERSION
): InternalAxiosRequestConfig {
  const versionedConfig = config as VersionedRequestConfig;

  // Skip versioning if explicitly disabled
  if (versionedConfig.skipVersioning) {
    return config;
  }

  // Use specified version or default
  const targetVersion = versionedConfig.apiVersion || version;

  // Skip if already has version in the URL
  if (config.url?.match(/\/v[0-9]+\//)) {
    return config;
  }

  // Check if baseURL already contains /api/v1 or similar version path
  const baseURL = config.baseURL || '';
  const hasVersionInBaseURL = baseURL.match(/\/api\/v[0-9]+\/?$/);

  // Only add version to URL if baseURL doesn't already contain it
  if (!hasVersionInBaseURL) {
    // Add version to URL
    if (config.url?.startsWith('/api/')) {
      config.url = config.url.replace('/api/', `/api/${targetVersion}/`);
    } else if (config.url?.startsWith('/')) {
      config.url = `/api/${targetVersion}${config.url}`;
    }
  }
  // If baseURL already has version, URL stays as-is (e.g., '/auth/login')

  // Add version header for tracking
  if (!config.headers) {
    config.headers = {} as any;
  }
  config.headers['X-API-Version'] = targetVersion;

  // Log version usage in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('API version applied', {
      version: targetVersion,
      url: config.url,
      baseURL: config.baseURL,
      hasVersionInBaseURL: !!hasVersionInBaseURL,
      method: config.method,
    });
  }

  return config;
}

/**
 * Extract version from URL
 *
 * @param url - URL to parse
 * @returns Extracted version or null
 */
export function extractVersion(url: string): ApiVersion | null {
  const match = url.match(/\/api\/(v[0-9]+)\//);
  if (match && match[1]) {
    return match[1] as ApiVersion;
  }
  return null;
}

/**
 * Check if version is supported
 *
 * @param version - Version to check
 * @returns True if version is supported
 */
export function isSupportedVersion(version: ApiVersion): boolean {
  return SUPPORTED_API_VERSIONS.includes(version);
}

/**
 * Check if version is deprecated
 *
 * @param version - Version to check
 * @returns True if version is deprecated
 */
export function isDeprecatedVersion(version: ApiVersion): boolean {
  return DEPRECATED_API_VERSIONS.includes(version);
}

/**
 * Check API version compatibility
 *
 * @param clientVersion - Client API version
 * @param serverVersion - Server API version
 * @returns True if versions are compatible
 */
export function checkVersionCompatibility(
  clientVersion: ApiVersion,
  serverVersion: ApiVersion
): boolean {
  const compatibleVersions = VERSION_COMPATIBILITY[clientVersion];
  return compatibleVersions?.includes(serverVersion) ?? false;
}

/**
 * Parse version from string
 *
 * @param versionString - Version string (e.g., "v1", "1", "1.0")
 * @returns Parsed version or null
 */
export function parseVersion(versionString: string): ApiVersion | null {
  // Normalize version string
  const normalized = versionString.toLowerCase().replace(/^v/, '').split('.')[0];

  switch (normalized) {
    case '1':
      return 'v1';
    case '2':
      return 'v2';
    default:
      return null;
  }
}

/**
 * Get version metadata
 *
 * @param version - API version
 * @returns Version metadata or undefined
 */
export function getVersionMetadata(version: ApiVersion): VersionMetadata | undefined {
  return VERSION_METADATA[version];
}

/**
 * Get recommended version
 * Returns the latest non-deprecated version
 *
 * @returns Recommended API version
 */
export function getRecommendedVersion(): ApiVersion {
  const nonDeprecated = SUPPORTED_API_VERSIONS.filter(
    (v) => !DEPRECATED_API_VERSIONS.includes(v)
  );

  // Return latest non-deprecated version
  return nonDeprecated[nonDeprecated.length - 1] || CURRENT_API_VERSION;
}

/**
 * Warn if using deprecated version
 *
 * @param version - Version to check
 */
export function warnIfDeprecated(version: ApiVersion): void {
  if (isDeprecatedVersion(version)) {
    const metadata = getVersionMetadata(version);
    const recommended = getRecommendedVersion();

    logger.warn(`API version ${version} is deprecated`, {
      version,
      deprecationDate: metadata?.deprecationDate,
      sunsetDate: metadata?.sunsetDate,
      recommended,
    });

    // Show warning in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `⚠️  API version ${version} is deprecated. Please migrate to ${recommended}.`
      );
    }
  }
}

/**
 * Version negotiation
 * Selects best version based on client and server support
 *
 * @param requestedVersion - Requested version
 * @param supportedVersions - Server supported versions
 * @returns Best matching version
 */
export function negotiateVersion(
  requestedVersion: ApiVersion,
  supportedVersions: ApiVersion[]
): ApiVersion {
  // If requested version is supported, use it
  if (supportedVersions.includes(requestedVersion)) {
    return requestedVersion;
  }

  // Find highest compatible version
  const compatibleVersions = VERSION_COMPATIBILITY[requestedVersion]?.filter((v) =>
    supportedVersions.includes(v)
  );

  if (compatibleVersions && compatibleVersions.length > 0) {
    return compatibleVersions[compatibleVersions.length - 1] as ApiVersion;
  }

  // Fallback to current version
  logger.warn('Version negotiation failed, falling back to current version', {
    requested: requestedVersion,
    supported: supportedVersions,
    fallback: CURRENT_API_VERSION,
  });

  return CURRENT_API_VERSION;
}

/**
 * Create versioned endpoint
 * Helper to create version-aware endpoint URLs
 *
 * @param path - Endpoint path
 * @param version - API version
 * @returns Versioned endpoint URL
 */
export function createVersionedEndpoint(
  path: string,
  version: ApiVersion = CURRENT_API_VERSION
): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Remove /api/ prefix if present
  const pathWithoutApi = cleanPath.replace(/^api\//, '');

  // Remove version if already present
  const pathWithoutVersion = pathWithoutApi.replace(/^v[0-9]+\//, '');

  return `/api/${version}/${pathWithoutVersion}`;
}

/**
 * Version migration utilities
 */
export class VersionMigrator {
  private migrations: VersionMigration[] = [];

  /**
   * Register a migration
   */
  register(migration: VersionMigration): void {
    this.migrations.push(migration);
  }

  /**
   * Migrate data from one version to another
   */
  migrate(data: any, from: ApiVersion, to: ApiVersion): any {
    // Find migration path
    const migration = this.migrations.find(
      (m) => m.from === from && m.to === to
    );

    if (!migration) {
      logger.warn('No migration found', { from, to });
      return data;
    }

    try {
      const migrated = migration.migrate(data);
      logger.debug('Data migrated', { from, to });
      return migrated;
    } catch (error) {
      logger.error('Migration failed', error, { from, to });
      return data; // Return original on error
    }
  }

  /**
   * Check if migration exists
   */
  hasMigration(from: ApiVersion, to: ApiVersion): boolean {
    return this.migrations.some((m) => m.from === from && m.to === to);
  }
}

/**
 * Global version migrator instance
 */
export const versionMigrator = new VersionMigrator();

/**
 * Example migrations (can be extended)
 */
// versionMigrator.register({
//   from: 'v1',
//   to: 'v2',
//   migrate: (data) => {
//     // Transform v1 data structure to v2
//     return {
//       ...data,
//       // Add v2 specific fields
//     };
//   },
// });
