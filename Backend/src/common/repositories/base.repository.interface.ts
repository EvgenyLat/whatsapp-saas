/**
 * Base Repository Interface
 * Defines standard CRUD operations that all repositories should implement
 */
export interface IBaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  /**
   * Create a new entity
   * @param data - Data for creating the entity
   * @returns Created entity
   */
  create(data: CreateDTO): Promise<T>;

  /**
   * Find all entities matching the criteria
   * @param where - Filter criteria
   * @param options - Additional query options (orderBy, skip, take, include)
   * @returns Array of entities
   */
  findAll(where?: any, options?: FindOptions): Promise<T[]>;

  /**
   * Find a single entity by ID
   * @param id - Entity ID
   * @param include - Relations to include
   * @returns Entity or null if not found
   */
  findById(id: string, include?: any): Promise<T | null>;

  /**
   * Find a single entity matching criteria
   * @param where - Filter criteria
   * @param include - Relations to include
   * @returns Entity or null if not found
   */
  findOne(where: any, include?: any): Promise<T | null>;

  /**
   * Find first entity matching criteria
   * @param where - Filter criteria
   * @param options - Additional query options
   * @returns Entity or null if not found
   */
  findFirst(where: any, options?: FindOptions): Promise<T | null>;

  /**
   * Update an entity by ID
   * @param id - Entity ID
   * @param data - Update data
   * @returns Updated entity
   */
  update(id: string, data: UpdateDTO): Promise<T>;

  /**
   * Delete an entity by ID
   * @param id - Entity ID
   * @returns Deleted entity
   */
  delete(id: string): Promise<T>;

  /**
   * Count entities matching criteria
   * @param where - Filter criteria
   * @returns Count of matching entities
   */
  count(where?: any): Promise<number>;

  /**
   * Check if entity exists
   * @param where - Filter criteria
   * @returns True if exists, false otherwise
   */
  exists(where: any): Promise<boolean>;

  /**
   * Find entities with pagination
   * @param where - Filter criteria
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param orderBy - Sort order
   * @returns Paginated result
   */
  findPaginated(
    where: any,
    page: number,
    limit: number,
    orderBy?: any,
  ): Promise<PaginatedRepositoryResult<T>>;

  /**
   * Update many entities matching criteria
   * @param where - Filter criteria
   * @param data - Update data
   * @returns Count of updated entities
   */
  updateMany(where: any, data: UpdateDTO): Promise<{ count: number }>;

  /**
   * Delete many entities matching criteria
   * @param where - Filter criteria
   * @returns Count of deleted entities
   */
  deleteMany(where: any): Promise<{ count: number }>;
}

/**
 * Find options for queries
 */
export interface FindOptions {
  orderBy?: any;
  skip?: number;
  take?: number;
  include?: any;
  select?: any;
}

/**
 * Paginated result structure
 */
export interface PaginatedRepositoryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
