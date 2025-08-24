import { Prisma } from '@prisma/client';
import { PaginationDetails } from 'custom';
import db from 'services/db';

// Define a union type of all model names available in Prisma
export type ModelNames = (typeof Prisma.ModelName)[keyof typeof Prisma.ModelName];

// Define a type for Prisma operations specific to a given model
type PrismaOperations<ModelName extends ModelNames> = Prisma.TypeMap['model'][ModelName]['operations'];

// Define a type for Prisma findMany arguments specific to a given model
type PrismaFindManyArgs<ModelName extends ModelNames> = PrismaOperations<ModelName>['findMany']['args'];

// Define a type for pagination options, including model name, query filters, and pagination parameters
type PaginationOptions<ModelName extends ModelNames> = {
  modelName: ModelName; // Name of the model to paginate
  page: number; // Page number for pagination
  limit: number; // Number of items per page for pagination
  where?: PrismaFindManyArgs<ModelName>['where']; // Filtering conditions for the query
  orderBy?: PrismaFindManyArgs<ModelName>['orderBy']; // Sorting criteria for the query
  include?: PrismaFindManyArgs<ModelName>['include']; // Related models to include in the query
  omit?: PrismaFindManyArgs<ModelName>['omit']; // Fields to exclude from the query
  select?: PrismaFindManyArgs<ModelName>['select']; // Fields to select in the query
};

export async function getPaginationResult<T extends ModelNames>(
  options: PaginationOptions<T>,
): Promise<[PrismaOperations<T>['findMany']['result'], PaginationDetails]> {
  const { modelName, where, orderBy, include, select, omit, page, limit } = options;

  // Construct the pagination query dynamically to avoid type incompatibility
  const query = {
    skip: (page - 1) * limit,
    take: limit,
    ...(where ? { where } : {}),
    ...(orderBy ? { orderBy } : {}),
    ...(include ? { include } : {}),
    ...(omit ? { omit } : {}),
    ...(select ? { select } : {}),
  };

  const [results, total] = await Promise.all([db[modelName as string].findMany(query), db[modelName as string].count({ where })]);

  const totalPages = Math.ceil(total / limit);

  const paginationDetails: PaginationDetails = {
    page: page,
    limit: limit,
    totalPages: totalPages,
    totalItems: total,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return [results, paginationDetails];
}
