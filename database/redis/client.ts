import { RedisClient } from "bun";

import databaseConfig from "@/config/database";

const { redis } = databaseConfig;

const client = new RedisClient(
	`redis://${redis.username}:${redis.password}@${redis.host}:${redis.port}`,
);

export default client;
