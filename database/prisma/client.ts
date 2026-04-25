import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import databaseConfig from "@/config/database";

const { postgres } = databaseConfig;

const adapter = new PrismaPg({
	connectionString: `postgresql://${postgres.username}:${postgres.password}@${postgres.host}:${postgres.port}/${postgres.database}`,
});

export const prisma = new PrismaClient({ adapter });

export default prisma;
