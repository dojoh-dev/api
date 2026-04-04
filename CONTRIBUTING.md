# Contributing Guide

Thank you for considering contributing to this project. This document outlines the conventions, workflows, and expectations for contributors.

---

## 🧱 Tech Stack

* **Runtime:** Bun
* **Language:** TypeScript
* **Framework:** Fastify
* **Database:** PostgreSQL
* **ORM:** Prisma

---

## 🚀 Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/api.git
cd api
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Variables

Create a `.env` file based on `.env.example` (if available):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/db"
PORT=3000
```

---

## 🗄️ Database Setup (Prisma)

Run migrations and generate the client:

```bash
bunx prisma migrate dev
bunx prisma generate
```

(Optional) Seed the database:

```bash
bunx prisma db seed
```

---

## ▶️ Running the Project

```bash
bun run dev
```

For production-like execution:

```bash
bun run start
```

---

## 🧭 Project Structure (Suggested)

```
src/
  modules/
    <domain>/
      controller.ts
      service.ts
      repository.ts
      schema.ts
  plugins/
  utils/
  server.ts
```

* **controller:** handles HTTP layer (Fastify routes)
* **service:** business logic
* **repository:** database access via Prisma
* **schema:** validation (Zod / DTOs)

---

## 🧪 Testing

If tests are present:

```bash
bun test
```

Guidelines:

* Write unit tests for services
* Prefer integration tests for routes
* Avoid hitting real external services (mock instead)

---

## 🧑‍💻 Coding Standards

* Use **TypeScript strict mode**
* Prefer **explicit types** over `any`
* Keep functions small and single-purpose
* Follow existing naming conventions
* Use async/await (avoid raw promises where possible)

---

## 🔀 Git Workflow

### Branch Naming

```
feature/<name>
fix/<name>
chore/<name>
```

### Commit Messages (Conventional)

```
feat: add user authentication
fix: resolve prisma connection issue
refactor: simplify service layer
```

---

## 📥 Pull Requests

Before opening a PR:

* Ensure code builds and runs
* Run migrations if schema changed
* Update or add tests where applicable
* Avoid committing secrets or `.env` files

PRs should:

* Be small and focused
* Include clear description
* Reference related issues

---

## ⚠️ Database Changes

When modifying Prisma schema:

1. Update `schema.prisma`
2. Run:

   ```bash
   bunx prisma migrate dev --name <change-name>
   ```
3. Commit both:

   * Migration files
   * Updated Prisma client

---

## 🧩 API Design Guidelines

* Follow RESTful conventions
* Validate input at the boundary (schemas)
* Keep controllers thin
* Return consistent response shapes

Example:

```ts
{
  data: ...,
  error: null
}
```

---

## 🔐 Security

* Never commit secrets
* Validate all external input
* Use environment variables for configuration
* Be mindful of SQL injection (Prisma helps, but stay cautious)

---

## 📌 Issues & Discussions

* Use issues for bugs and feature requests
* Be precise and reproducible
* Include logs or request/response samples when relevant

---

## 🏁 Final Notes

Consistency outweighs cleverness. When in doubt, follow existing patterns in the codebase.

Contributions that align with the project's structure and philosophy will be reviewed and merged more efficiently.
