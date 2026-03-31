import http from "node:http";
import { getServerEnv } from "@friendly-mail/config";
import { WorkflowStatus } from "@friendly-mail/contracts";
import {
  AppError,
  createCorrelationId,
  createLogger,
  toErrorResponse
} from "@friendly-mail/observability";

const env = getServerEnv();
const logger = createLogger({
  service: "friendly-mail-api"
});

const server = http.createServer((request, response) => {
  const correlationId = createCorrelationId();
  const requestLogger = logger.child({
    correlationId,
    method: request.method ?? "GET",
    path: request.url ?? "/"
  });

  try {
    if (request.url !== "/" && request.url !== "/health") {
      throw new AppError("ROUTE_NOT_FOUND", "Route not found", {
        statusCode: 404
      });
    }

    const payload = {
      service: "friendly-mail-api",
      status: WorkflowStatus.Healthy,
      environment: env.NODE_ENV,
      correlationId
    };

    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
    requestLogger.info("Request completed", {
      statusCode: 200
    });
  } catch (error) {
    const errorResponse = toErrorResponse(error, correlationId);
    response.writeHead(errorResponse.statusCode, {
      "content-type": "application/json"
    });
    response.end(JSON.stringify(errorResponse.body));
    requestLogger.error("Request failed", {
      statusCode: errorResponse.statusCode,
      error
    });
  }
});

server.listen(env.API_PORT, () => {
  logger.info("Friendly Mail API listening", {
    port: env.API_PORT,
    environment: env.NODE_ENV
  });
});
