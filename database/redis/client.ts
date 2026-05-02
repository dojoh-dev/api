import { RedisClient } from "bun";

import databaseConfig from "@/config/database";

const { redis: redisConfig } = databaseConfig;
const { host, port, username, password } = redisConfig;

const redis = new RedisClient(
	`redis://${username}:${password}@${host}:${port}`,
);

export default redis;
