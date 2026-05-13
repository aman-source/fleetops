import type { FastifyReply } from 'fastify';

interface SuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200, meta?: Record<string, unknown>) {
  const response: SuccessResponse<T> = { data };
  if (meta) response.meta = meta;
  return reply.status(statusCode).send(response);
}

export function sendCreated<T>(reply: FastifyReply, data: T) {
  return sendSuccess(reply, data, 201);
}

export function sendNoContent(reply: FastifyReply) {
  return reply.status(204).send();
}

export function sendError(reply: FastifyReply, statusCode: number, error: string, code: string, details?: Record<string, unknown>) {
  const response: ErrorResponse = { error, code };
  if (details) response.details = details;
  return reply.status(statusCode).send(response);
}
