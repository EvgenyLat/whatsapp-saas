import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    const databaseUrl = configService.get<string>('database.url');
    const environment = configService.get<string>('app.environment', 'development');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    // PERFORMANCE: Optimize connection pool based on environment
    const connectionLimit = environment === 'production' ? 10 : 5;
    const connectionTimeout = 20; // seconds
    const poolTimeout = 10; // seconds

    // Build optimized database URL with connection pool parameters
    const urlWithParams = new URL(databaseUrl);
    urlWithParams.searchParams.set('connection_limit', connectionLimit.toString());
    urlWithParams.searchParams.set('connect_timeout', connectionTimeout.toString());
    urlWithParams.searchParams.set('pool_timeout', poolTimeout.toString());

    super({
      datasources: {
        db: {
          url: urlWithParams.toString(),
        },
      },
      log: configService.get<boolean>('database.enableLogging')
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Helper method to clean database (useful for testing)
  async cleanDatabase() {
    if (this.configService.get('app.environment') === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Get all table names
    const tables = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    // Truncate all tables
    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        } catch (error) {
          this.logger.error(`Failed to truncate table ${tablename}`, error);
        }
      }
    }
  }

  // Helper method to execute transactions
  async executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this.$transaction(fn);
  }
}
