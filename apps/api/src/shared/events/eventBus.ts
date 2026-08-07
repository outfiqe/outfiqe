import { EventEmitter } from "node:events";

// In-process event bus for cross-module communication inside the monolith.
//
// WHY THIS MATTERS FOR YOUR MICROSERVICES QUESTION:
// Modules should not import each other's services/repositories directly
// (e.g. "users" module should never import from "billing" module's internals).
// Instead a module emits a domain event, and any other module that cares
// subscribes to it here.
//
// When you eventually split a module out into its own service, you swap
// this file's implementation for a real message broker (RabbitMQ, Kafka,
// SNS/SQS, etc.) and keep the exact same emit()/on() call sites in every
// module. The modules themselves don't need to change.
export const eventBus = new EventEmitter();

export const DomainEvents = {
  USER_CREATED: "user.created",
  USER_DELETED: "user.deleted",
} as const;
