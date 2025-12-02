import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import type { RedisClientOptions } from 'redis';
import cacheConfig from '@config/cache.config';
import { CacheService } from './cache.service';
import { RedisConnectionService, RedisHealthService, AiCacheService } from './services';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(cacheConfig),
    NestCacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const cacheConf = configService.get('cache');

        return {
          store: redisStore as any,
          socket: {
            host: cacheConf.host,
            port: cacheConf.port,
          },
          password: cacheConf.password,
          database: cacheConf.db,
          ttl: cacheConf.ttl.default,
          max: 100, // Maximum number of items in cache
          maxRetriesPerRequest: cacheConf.maxRetriesPerRequest,
          enableReadyCheck: cacheConf.enableReadyCheck,
          enableOfflineQueue: cacheConf.enableOfflineQueue,
        };
      },
    }),
  ],
  providers: [CacheService, RedisConnectionService, RedisHealthService, AiCacheService],
  exports: [
    CacheService,
    NestCacheModule,
    RedisConnectionService,
    RedisHealthService,
    AiCacheService,
  ],
})
export class CacheModule {}
