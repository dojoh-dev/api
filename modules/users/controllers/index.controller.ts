import type { FastifyReply, FastifyRequest } from "fastify";

import prisma from "@/database/prisma/client";

// export default {
// 	async uploadAvatar(req: FastifyRequest, reply: FastifyReply) {
// 		const userId = req.user.id;

// 		if (!req.file) {
// 			return reply.status(400).send({ error: req.t("No file uploaded") });
// 		}

// 		const avatarUrl = `/uploads/${req.file.filename}`;

// 		try {
// 			await prisma.image.create({

// 			});
// 	}
// } as const;
