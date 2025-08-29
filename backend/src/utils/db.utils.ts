import { Prisma } from '@prisma/client';
import { PaginationDetails } from 'custom';
import db from '../services/db';

// Define a union type of all model names available in Prisma
export type ModelNames = (typeof Prisma.ModelName)[keyof typeof Prisma.ModelName];

// Define a type for Prisma operations specific to a given model
type PrismaOperations<ModelName extends ModelNames> = Prisma.TypeMap['model'][ModelName]['operations'];

// Define a type for Prisma findMany arguments specific to a given model
type PrismaFindManyArgs<ModelName extends ModelNames> = PrismaOperations<ModelName>['findMany']['args'];

// Define a type for pagination options, including model name, query filters, and pagination parameters
type PaginationBase<ModelName extends ModelNames> = {
  modelName: ModelName; // Name of the model to paginate
  page: number; // Page number for pagination
  limit: number; // Number of items per page for pagination
  where?: PrismaFindManyArgs<ModelName>['where']; // Filtering conditions for the query
  orderBy?: PrismaFindManyArgs<ModelName>['orderBy']; // Sorting criteria for the query
};

// Branch 1: select only
type PaginationWithSelect<ModelName extends ModelNames> = PaginationBase<ModelName> & {
  select: PrismaFindManyArgs<ModelName>['select'];
  include?: never;
  omit?: never;
};

// Branch 2: include (+ optional omit)
type PaginationWithInclude<ModelName extends ModelNames> = PaginationBase<ModelName> & {
  include: PrismaFindManyArgs<ModelName>['include'];
  omit?: PrismaFindManyArgs<ModelName>['omit'];
  select?: never;
};

// Branch 3: neither select nor include (but maybe omit)
type PaginationMinimal<ModelName extends ModelNames> = PaginationBase<ModelName> & {
  omit?: PrismaFindManyArgs<ModelName>['omit'];
  select?: never;
  include?: never;
};

// Final union
type PaginationOptions<ModelName extends ModelNames> =
  | PaginationWithSelect<ModelName>
  | PaginationWithInclude<ModelName>
  | PaginationMinimal<ModelName>;

export async function getPaginationResult<T extends ModelNames>(
  options: PaginationOptions<T>,
): Promise<[PrismaOperations<T>['findMany']['result'], PaginationDetails]> {
  const { modelName, where, orderBy, include, select, omit, page, limit } = options;

  // Construct the pagination query dynamically to avoid type incompatibility
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const safeLimit = Math.max(1, Math.trunc(limit) || 1);
  const query = {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
    ...(where ? { where } : {}),
    ...(orderBy ? { orderBy } : {}),
    ...(include ? { include } : {}),
    ...(omit ? { omit } : {}),
    ...(select ? { select } : {}),
  };

  const [results, total] = await Promise.all([db[modelName as string].findMany(query), db[modelName as string].count({ where })]);

  const totalPages = Math.ceil(total / safeLimit);

  const paginationDetails: PaginationDetails = {
    page: safePage,
    limit: safeLimit,
    totalPages: totalPages,
    totalItems: total,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };

  return [results, paginationDetails];
}
