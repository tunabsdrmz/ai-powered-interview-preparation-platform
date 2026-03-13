# AI-Powered Interview Preparation Platform — API Documentation

**Base URL:** `http://localhost:3000/api`
**Swagger UI:** `http://localhost:3000/swagger`

---

## Table of Contents

- [Authentication](#authentication)
- [Interview Flow (Step-by-Step)](#interview-flow-step-by-step)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [User](#user)
  - [Interviews](#interviews)
  - [AI (Standalone)](#ai-standalone)
  - [Reports](#reports)
- [Important: Async Question Generation](#important-async-question-generation)
- [Full cURL Example (Complete Interview Session)](#full-curl-example-complete-interview-session)

---

## Authentication

All endpoints except `/api/auth/register` and `/api/auth/login` require a JWT Bearer token.

```
Authorization: Bearer <access_token>
```

Token expires in **15 minutes**. After expiration, you need to login again.

---

## Interview Flow (Step-by-Step)

```
1. Register & Login → get JWT token
2. Start Interview → creates session
3. Generate Question → returns itemId (question is NULL at this point!)
4. ⏳ POLL the interview → wait until question.status = "awaiting_answer"
5. Submit Answer → answer is saved, evaluation starts in background
6. ⏳ POLL again → wait until question.status = "completed"
7. (Repeat 3-6 for more questions)
8. End Interview → calculates overall score
9. View Reports
```

### Why are questions empty?

Question generation is **asynchronous**. When you call `POST /interviews/:id/questions`, a background job is queued to generate the question via AI. The endpoint returns immediately with `question: null` and `status: "generating"`.

**You MUST poll `GET /api/interviews/:id` to check when the question is ready.** The question will be populated and the status will change to `"awaiting_answer"` once the AI has generated it (usually 2-5 seconds).

The same applies to answer evaluation — after submitting an answer, the item goes to `"processing"` status and you need to poll until it becomes `"completed"` to see the evaluation and feedback.

---

## Endpoints

### Auth

#### `POST /api/auth/register`

Register a new user account.

**Auth:** None (public)

**Body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "role": "user"
}
```

---

#### `POST /api/auth/login`

Login and receive a JWT token.

**Auth:** None (public)

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### User

#### `GET /api/user/me`

Get current user info from the JWT token.

**Auth:** Bearer token

**Response (200):**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "sub": 1,
    "username": "john",
    "role": "user"
  }
}
```

---

### Interviews

#### `POST /api/interviews/start`

Start a new interview session.

**Auth:** Bearer token

**Body:**
```json
{
  "title": "Node.js Backend Interview",
  "topic": "Node.js",
  "difficulty": "mid"
}
```

`difficulty` must be one of: `"junior"`, `"mid"`, `"senior"`

**Response (201):**
```json
{
  "id": "a1b2c3d4-...",
  "title": "Node.js Backend Interview",
  "topic": "Node.js",
  "difficulty": "mid",
  "status": "in_progress",
  "overallScore": null,
  "userId": 1,
  "createdAt": "2026-03-13T10:00:00.000Z",
  "updatedAt": "2026-03-13T10:00:00.000Z"
}
```

---

#### `POST /api/interviews/:interviewId/questions`

Request a new question to be generated for the interview.

**Auth:** Bearer token

**⚠️ The question is generated asynchronously!** The response will have `question: null` and `status: "generating"`. You must poll `GET /api/interviews/:interviewId` to see when the question is ready.

**Response (201):**
```json
{
  "id": "item-uuid-...",
  "question": null,
  "answer": null,
  "evaluation": null,
  "feedback": null,
  "status": "generating",
  "order": 0,
  "interviewId": "a1b2c3d4-..."
}
```

After ~2-5 seconds, polling the interview will show:
```json
{
  "id": "item-uuid-...",
  "question": "Explain the event loop in Node.js and how it handles asynchronous operations.",
  "answer": null,
  "evaluation": null,
  "feedback": null,
  "status": "awaiting_answer",
  "order": 0
}
```

---

#### `POST /api/interviews/:interviewId/questions/:itemId/answer`

Submit an answer for a specific question.

**Auth:** Bearer token

**Prerequisites:**
- The question's status must be `"awaiting_answer"` (not `"generating"`)
- The question must not have been answered already

**Body:**
```json
{
  "answer": "The event loop is a mechanism in Node.js that allows it to perform non-blocking I/O operations. It uses a single thread with an event queue..."
}
```

**Response (200):**
```json
{
  "id": "item-uuid-...",
  "question": "Explain the event loop in Node.js...",
  "answer": "The event loop is a mechanism...",
  "evaluation": null,
  "feedback": null,
  "status": "processing"
}
```

**⚠️ Evaluation and feedback are generated asynchronously!** Poll `GET /api/interviews/:interviewId` until the item's status becomes `"completed"`:

```json
{
  "id": "item-uuid-...",
  "question": "Explain the event loop in Node.js...",
  "answer": "The event loop is a mechanism...",
  "evaluation": {
    "score": 7,
    "strengths": ["Good understanding of single-threaded model", "Mentioned non-blocking I/O"],
    "weaknesses": ["Didn't mention microtask queue", "No mention of libuv"],
    "correctness": "Partially correct"
  },
  "feedback": "Your answer demonstrates a good foundational understanding...",
  "status": "completed"
}
```

---

#### `POST /api/interviews/:interviewId/end`

End the interview session and calculate the overall score.

**Auth:** Bearer token

**Prerequisites:**
- All questions must be in `"awaiting_answer"` or `"completed"` status
- No questions can be in `"generating"` or `"processing"` status

**Response (200):**
```json
{
  "id": "a1b2c3d4-...",
  "title": "Node.js Backend Interview",
  "topic": "Node.js",
  "difficulty": "mid",
  "status": "completed",
  "overallScore": 7.5,
  "createdAt": "2026-03-13T10:00:00.000Z",
  "updatedAt": "2026-03-13T10:05:00.000Z"
}
```

---

#### `GET /api/interviews`

List all interviews for the current user.

**Auth:** Bearer token

**Response (200):**
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "Node.js Backend Interview",
    "topic": "Node.js",
    "difficulty": "mid",
    "status": "completed",
    "overallScore": 7.5,
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
]
```

---

#### `GET /api/interviews/:id`

Get a single interview with all its questions/items.

**Auth:** Bearer token

**This is the polling endpoint!** Use it to check the status of questions after generating them or submitting answers.

**Response (200):**
```json
{
  "id": "a1b2c3d4-...",
  "title": "Node.js Backend Interview",
  "topic": "Node.js",
  "difficulty": "mid",
  "status": "in_progress",
  "overallScore": null,
  "userId": 1,
  "createdAt": "2026-03-13T10:00:00.000Z",
  "updatedAt": "2026-03-13T10:00:00.000Z",
  "items": [
    {
      "id": "item-uuid-...",
      "question": "Explain the event loop in Node.js...",
      "answer": "The event loop is...",
      "evaluation": { "score": 7, "strengths": [], "weaknesses": [], "correctness": "..." },
      "feedback": "Your answer demonstrates...",
      "status": "completed",
      "order": 0
    },
    {
      "id": "item-uuid-2-...",
      "question": null,
      "answer": null,
      "evaluation": null,
      "feedback": null,
      "status": "generating",
      "order": 1
    }
  ]
}
```

---

### AI (Standalone)

These endpoints call the AI directly **without** creating an interview session. Useful for testing or one-off usage.

#### `POST /api/ai/generate-question`

**Auth:** Bearer token

**Body:**
```json
{
  "topic": "React",
  "difficulty": "senior"
}
```

**Response (200):**
```json
{
  "question": "Explain the reconciliation algorithm in React..."
}
```

---

#### `POST /api/ai/evaluate-answer`

**Auth:** Bearer token

**Body:**
```json
{
  "question": "Explain the reconciliation algorithm in React...",
  "answer": "React uses a virtual DOM diffing algorithm..."
}
```

**Response (200):**
```json
{
  "evaluation": {
    "score": 8,
    "strengths": ["Clear explanation of virtual DOM"],
    "weaknesses": ["Didn't mention fiber architecture"],
    "correctness": "Mostly correct"
  }
}
```

---

#### `POST /api/ai/generate-feedback`

**Auth:** Bearer token

**Body:**
```json
{
  "question": "Explain the reconciliation algorithm in React...",
  "answer": "React uses a virtual DOM diffing algorithm..."
}
```

**Response (200):**
```json
{
  "feedback": "Your answer shows a solid understanding of React's core rendering mechanism..."
}
```

---

### Reports

#### `GET /api/reports`

List all completed interviews as reports. Cached for 60 seconds.

**Auth:** Bearer token

**Response (200):**
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "Node.js Backend Interview",
    "topic": "Node.js",
    "difficulty": "mid",
    "status": "completed",
    "overallScore": 7.5,
    "createdAt": "2026-03-13T10:00:00.000Z"
  }
]
```

---

#### `GET /api/reports/:id`

Get a detailed report for a completed interview. Cached for 5 minutes.

**Auth:** Bearer token

**Response (200):**
```json
{
  "id": "a1b2c3d4-...",
  "title": "Node.js Backend Interview",
  "topic": "Node.js",
  "difficulty": "mid",
  "status": "completed",
  "overallScore": 7.5,
  "items": [
    {
      "id": "item-uuid-...",
      "question": "Explain the event loop in Node.js...",
      "answer": "The event loop is...",
      "evaluation": { "score": 7, "strengths": [], "weaknesses": [], "correctness": "..." },
      "feedback": "Your answer demonstrates...",
      "status": "completed",
      "order": 0
    }
  ],
  "createdAt": "2026-03-13T10:00:00.000Z",
  "updatedAt": "2026-03-13T10:05:00.000Z"
}
```

---

## Important: Async Question Generation

The interview system uses **BullMQ** (background job queue) for AI operations. This means:

| Operation | Endpoint | What happens in background | What to poll |
|---|---|---|---|
| Generate question | `POST /interviews/:id/questions` | AI generates the question | Poll `GET /interviews/:id` until item status = `awaiting_answer` |
| Submit answer | `POST /interviews/:id/questions/:itemId/answer` | AI evaluates + generates feedback | Poll `GET /interviews/:id` until item status = `completed` |

### Item Status Flow

```
generating → awaiting_answer → processing → completed
    ↑              ↑                ↑            ↑
  Question      Question is      Answer       Evaluation &
  requested     ready, waiting   submitted,   feedback are
  (question     for user to      AI is        ready
  is null)      answer           evaluating
```

---

## Full cURL Example (Complete Interview Session)

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"secret123"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'
# → save the access_token

TOKEN="eyJhbGciOi..."

# 3. Start an interview
curl -X POST http://localhost:3000/api/interviews/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Node.js Interview","topic":"Node.js","difficulty":"mid"}'
# → save the interview id

INTERVIEW_ID="a1b2c3d4-..."

# 4. Generate a question
curl -X POST http://localhost:3000/api/interviews/$INTERVIEW_ID/questions \
  -H "Authorization: Bearer $TOKEN"
# → response has question: null, status: "generating"
# → save the item id

ITEM_ID="item-uuid-..."

# 5. ⏳ POLL until question is ready (repeat every 2 seconds)
curl http://localhost:3000/api/interviews/$INTERVIEW_ID \
  -H "Authorization: Bearer $TOKEN"
# → check items[0].status — wait until it's "awaiting_answer"
# → now items[0].question will have the actual question text

# 6. Submit your answer
curl -X POST http://localhost:3000/api/interviews/$INTERVIEW_ID/questions/$ITEM_ID/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"answer":"The event loop is a core mechanism in Node.js that enables non-blocking I/O..."}'

# 7. ⏳ POLL until evaluation is ready (repeat every 2-3 seconds)
curl http://localhost:3000/api/interviews/$INTERVIEW_ID \
  -H "Authorization: Bearer $TOKEN"
# → check items[0].status — wait until it's "completed"
# → now items[0].evaluation and items[0].feedback will be populated

# 8. (Optional) Generate more questions — repeat steps 4-7

# 9. End the interview
curl -X POST http://localhost:3000/api/interviews/$INTERVIEW_ID/end \
  -H "Authorization: Bearer $TOKEN"
# → response has overallScore calculated from all evaluations

# 10. View reports
curl http://localhost:3000/api/reports \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/api/reports/$INTERVIEW_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Responses

| Status | Meaning |
|---|---|
| `400` | Bad request — e.g., question still generating, already answered, items still processing |
| `401` | Unauthorized — missing or expired JWT token |
| `404` | Not found — interview or question doesn't exist or doesn't belong to you |

Common error response format:
```json
{
  "statusCode": 400,
  "message": "Question is still being generated",
  "error": "Bad Request"
}
```
