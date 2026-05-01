import fp from "fastify-plugin";

export default fp(async (f) => {
	f.addHook("preHandler", async (req) => {
		const lng = req.query;
	});
});
