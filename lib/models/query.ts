/**
 * @file    lib/models/query.ts
 * @brief   Resolve database results without leaking raw errors or accepting unlisted fields
 * @author  Rayazka
 * @created 2026-10-12
 * @todo    none
 */
import "server-only";

type QueryResponse<T> = { data: T | null; error: { code: string } | null };

export class ModelError extends Error {
  constructor(operation: string, public readonly code: string) {
    super(`${operation} failed.`);
    this.name = "ModelError";
  }
}

export async function optionalQuery<T>(query: PromiseLike<QueryResponse<T>>, operation: string): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw new ModelError(operation, error.code || "DATABASE_ERROR");
  return data;
}

export async function requiredQuery<T>(query: PromiseLike<QueryResponse<T>>, operation: string): Promise<T> {
  const data = await optionalQuery(query, operation);
  if (data === null) throw new ModelError(operation, "NOT_FOUND");
  return data;
}

export async function removedQuery(query: PromiseLike<QueryResponse<unknown>>, operation: string): Promise<boolean> {
  return (await optionalQuery(query, operation)) !== null;
}

export function pickFields<Input extends object, Key extends keyof Input>(input: Input, fields: readonly Key[]): Pick<Input, Key> {
  return Object.fromEntries(fields.filter((field) => input[field] !== undefined)
    .map((field) => [field, input[field]])) as Pick<Input, Key>;
}
