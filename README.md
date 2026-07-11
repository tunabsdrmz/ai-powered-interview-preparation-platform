<div align="center">

# AI-Powered Interview Preparation Platform

**A scalable backend for generating technical interview questions, asynchronously evaluating answers, and delivering structured AI coaching feedback.**

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Queue-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Async%20Jobs-EA580C)](https://docs.bullmq.io/)
[![Groq](https://img.shields.io/badge/Groq-AI%20Inference-F55036)](https://groq.com/)

</div>

## Overview

AI-Powered Interview Preparation Platform is a REST API that simulates role-specific technical interview sessions. Users can create an account, start an interview by topic and difficulty, receive AI-generated questions, submit answers, and review structured evaluations and coaching feedback.

Long-running AI operations are processed asynchronously with **BullMQ and Redis**, keeping HTTP requests responsive while question generation and answer evaluation continue in background workers. Interview data and reports are persisted in **PostgreSQL**, while report responses are cached in **Redis**.

## Key Features

- JWT-based registration, login, and protected user routes
- Technical question generation by topic and difficulty
- Junior, mid-level, and senior interview modes
- Asynchronous AI processing with BullMQ workers
- Parallel answer evaluation and feedback generation
- Structured scoring, strengths, weaknesses, and correctness results
- Persistent interview sessions and question history
- User-scoped interview access and report retrieval
- Redis-backed report caching and cache invalidation
- Input validation with `class-validator`
- Interactive Swagger API documentation

## Architecture

```mermaid
flowchart LR
    Client[Client / Swagger UI] --> API[NestJS REST API]
    API --> Auth[JWT Authentication]
    API --> Interview[Interview Service]
    API --> Report[Report Service]

    Interview --> DB[(PostgreSQL)]
    Report --> DB
    Report --> Cache[(Redis Cache)]

    Interview --> Queue[BullMQ Queue]
    Queue --> Worker[Interview Worker]
    Worker --> AI[AI Service]
    AI --> Groq[Groq API / Llama 3.1]
    Worker --> DB
```

## Interview Workflow

```mermaid
sequenceDiagram
    actor User
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Queue as BullMQ
    participant Worker as Interview Worker
    participant AI as Groq API

    User->>API: Start interview
    API->>DB: Create interview session
    API-->>User: Interview ID

    User->>API: Request next question
    API->>DB: Create item (generating)
    API->>Queue: Enqueue generate-question job
    API-->>User: Item with generating status

    Queue->>Worker: Process job
    Worker->>AI: Generate technical question
    AI-->>Worker: Question text
    Worker->>DB: Update item (awaiting_answer)

    User->>API: Submit answer
    API->>DB: Update item (processing)
    API->>Queue: Enqueue process-answer job

    Queue->>Worker: Process job
    par Parallel AI operations
        Worker->>AI: Evaluate answer
        Worker->>AI: Generate coaching feedback
    end
    AI-->>Worker: Evaluation and feedback
    Worker->>DB: Update item (completed)

    User->>API: End interview
    API->>DB: Calculate and save overall score
    API-->>User: Completed interview
```

## Technology Stack

| Area                | Technologies                                |
| ------------------- | ------------------------------------------- |
| Runtime & framework | Node.js, NestJS 11, TypeScript              |
| Database            | PostgreSQL, TypeORM                         |
| Queue processing    | BullMQ, Redis                               |
| Caching             | NestJS Cache Manager, Redis                 |
| AI integration      | Groq SDK, Llama 3.1 8B Instant              |
| Authentication      | Passport, JWT, bcrypt                       |
| Validation & docs   | class-validator, class-transformer, Swagger |

## Project Structure

```text
src/
├── ai/          # Prompt orchestration and AI use cases
├── auth/        # JWT authentication, guards, decorators, strategies
├── groq/        # Groq SDK integration
├── interview/   # Interview sessions, entities, queue producer and worker
├── report/      # Completed interview reports and Redis caching
├── user/        # User persistence and profile endpoints
├── app.module.ts
└── main.ts
```

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 15+
- Redis 7+
- A Groq API key

Docker is optional but recommended for local PostgreSQL and Redis services.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/tunabsdrmz/ai-powered-interview-preparation-platform.git
cd ai-powered-interview-preparation-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Update `.env` with your own credentials:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interview_platform
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=replace-with-a-long-random-secret
GROQ_API_KEY=your-groq-api-key
```

### 4. Start PostgreSQL and Redis

Using Docker Compose:

```bash
docker compose up -d
```

Or use locally installed PostgreSQL and Redis instances matching your `.env` configuration.

### 5. Run the application

```bash
npm run start:dev
```

The API will be available at:

```text
http://localhost:3000/api
```

Swagger documentation:

```text
http://localhost:3000/swagger
```

## API Overview

| Method | Endpoint                                                | Description                                   | Authentication |
| ------ | ------------------------------------------------------- | --------------------------------------------- | -------------- |
| `POST` | `/api/auth/register`                                    | Create a user account                         | Public         |
| `POST` | `/api/auth/login`                                       | Log in and receive a JWT                      | Public         |
| `GET`  | `/api/user/me`                                          | Get the authenticated user                    | Required       |
| `POST` | `/api/interviews/start`                                 | Start an interview session                    | Required       |
| `POST` | `/api/interviews/:interviewId/questions`                | Queue the next AI-generated question          | Required       |
| `POST` | `/api/interviews/:interviewId/questions/:itemId/answer` | Submit an answer for processing               | Required       |
| `POST` | `/api/interviews/:interviewId/end`                      | Complete an interview and calculate its score | Required       |
| `GET`  | `/api/interviews`                                       | List the user's interviews                    | Required       |
| `GET`  | `/api/interviews/:id`                                   | Get an interview and its items                | Required       |
| `GET`  | `/api/reports`                                          | List completed interview reports              | Required       |
| `GET`  | `/api/reports/:id`                                      | Get a completed report                        | Required       |

Detailed request and response examples are available in [API_DOCS.md](./API_DOCS.md).

## Asynchronous Status Model

Question generation and answer processing are asynchronous. Clients should poll the interview detail endpoint until the item reaches the expected state.

```text
generating → awaiting_answer → processing → completed
```

| Status            | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| `generating`      | The question generation job is running         |
| `awaiting_answer` | The generated question is ready                |
| `processing`      | The submitted answer is being evaluated        |
| `completed`       | Evaluation and coaching feedback are available |

## Example Interview Session

### Start an interview

```bash
curl -X POST http://localhost:3000/api/interviews/start \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Backend Developer Practice",
    "topic": "NestJS",
    "difficulty": "mid"
  }'
```

### Generate the next question

```bash
curl -X POST http://localhost:3000/api/interviews/<interview_id>/questions \
  -H "Authorization: Bearer <access_token>"
```

### Submit an answer

```bash
curl -X POST \
  http://localhost:3000/api/interviews/<interview_id>/questions/<item_id>/answer \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "NestJS guards run before route handlers and are commonly used for authorization..."
  }'
```

## Available Scripts

```bash
npm run start:dev   # Start in watch mode
npm run build       # Compile the application
npm run start:prod  # Run the compiled application
npm run lint        # Run ESLint and apply safe fixes
npm run format      # Format TypeScript files with Prettier
npm run test        # Run unit tests
npm run test:cov    # Generate test coverage
```

> The repository currently does not include an automated test suite. Adding unit and integration tests is part of the planned improvements.

## Roadmap

- [ ] Unit and integration test coverage
- [ ] Docker image for the API service
- [ ] TypeORM migrations and production-safe database configuration
- [ ] BullMQ retry, backoff, and failed-job handling
- [ ] Runtime validation for structured AI evaluation output
- [ ] Rate limiting for AI-backed endpoints
- [ ] Frontend dashboard for interview sessions and reports
- [ ] CI pipeline for linting, testing, and builds

## Security Notes

- Never commit `.env` or expose `GROQ_API_KEY` and `JWT_SECRET`.
- Use a strong, unique JWT secret in deployed environments.
- Disable TypeORM schema synchronization and use migrations in production.
- Protect or rate-limit standalone AI endpoints before public deployment.

## Author

**Tuna Boşdurmaz**

- GitHub: [@tunabsdrmz](https://github.com/tunabsdrmz)

## License

No open-source license is currently specified for this repository.
