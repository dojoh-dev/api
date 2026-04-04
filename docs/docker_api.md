## Example

```typescript
docker
	.run("docker.io/dojoh-dev/node:latest")
	.addFlag("--rm")
	.addFlag("-d")
	.addArgument("--entrypoint", "/usr/bin/node")
	.addArgument("--name", "XXXXX-XXXX")
	.addArgument("--user", "test-runner");
```
