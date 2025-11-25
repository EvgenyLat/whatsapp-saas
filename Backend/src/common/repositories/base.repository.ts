import { PrismaService } from '@database/prisma.service';
import {
  IBaseRepository,
  FindOptions,
  PaginatedRepositoryResult,
} from './base.repository.interface';

/**
 * Abstract Base Repository
 * Provides generic CRUD operations for all repositories
 * Implements common database operations with Prisma
 */
export abstract class BaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>
  implements IBaseRepository<T, CreateDTO, UpdateDTO>
{
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Get the Prisma delegate for the model
   */
  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Create a new entity
   */
  async create(data: CreateDTO): Promise<T> {
    return this.model.create({ data });
  }

  /**
   * Find all entities matching criteria
   */
  async findAll(where?: any, options?: FindOptions): Promise<T[]> {
    return this.model.findMany({
      where,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
      include: options?.include,
      select: options?.select,
    });
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, include?: any): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Find single entity matching criteria
   */
  async findOne(where: any, include?: any): Promise<T | null> {
    return this.model.findUnique({
      where,
      include,
    });
  }

  /**
   * Find first entity matching criteria
   */
  async findFirst(where: any, options?: FindOptions): Promise<T | null> {
    return this.model.findFirst({
      where,
      orderBy: options?.orderBy,
      include: options?.include,
      select: options?.select,
    });
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: UpdateDTO): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete entity by ID
   */
  async delete(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
    });
  }

  /**
   * Count entities matching criteria
   */
  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Check if entity exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(
    where: any,
    page: number = 1,
    limit: number = 10,
    orderBy?: any,
  ): Promise<PaginatedRepositoryResult<T>> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update many entities
   */
  async updateMany(where: any, data: UpdateDTO): Promise<{ count: number }> {
    return this.model.updateMany({
      where,
      data,
    });
  }

  /**
   * Delete many entities
   */
  async deleteMany(where: any): Promise<{ count: number }> {
    return this.model.deleteMany({
      where,
    });
  }

  /**
   * Execute operations within a transaction
   * @param fn - Transaction function
   * @returns Result of the transaction
   */
  async transaction<R>(fn: (prisma: PrismaService) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (prisma) => {
      return fn(prisma as PrismaService);
    });
  }

  /**
   * Execute raw query
   * @param query - Raw SQL query
   * @param params - Query parameters
   */
  protected async executeRaw(query: string, ...params: any[]): Promise<any> {
    return this.prisma.$executeRawUnsafe(query, ...params);
  }

  /**
   * Execute raw query and return results
   * @param query - Raw SQL query
   * @param params - Query parameters
   */
  protected async queryRaw<T = any>(query: string, ...params: any[]): Promise<T> {
    return this.prisma.$queryRawUnsafe(query, ...params);
  }
}
