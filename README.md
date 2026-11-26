# TaskFlow

TaskFlow is a small task management web application. It has a REST API built with **Node.js + Express** and a dashboard written in plain **HTML, CSS and JavaScript** (no frameworks). Tasks are stored in a JSON file.

## Features

- View, create, edit and delete tasks
- Change a task's status (Pending, In Progress, Completed)
- Filter tasks by status and search by title
- Summary counts, loading and error messages, responsive layout (light and dark mode)
- Request validation, consistent JSON error responses, and request logging
- JSON file storage that survives restarts and repairs itself if the file is missing or corrupt

## Requirements

- Node.js 18 or newer (tested with Node 22)
- npm

## Running the application

```bash
cd backend
npm install
npm start
```

Then open:

- Dashboard: <http://localhost:3000>
- API: <http://localhost:3000/api>

For development, `npm run dev` restarts the server automatically when files change (`node --watch`).

### Configuration (environment variables)

| Variable    | Default                     | Description                          |
|-------------|-----------------------------|--------------------------------------|
| `PORT`      | `3000`                      | HTTP port                            |
| `HOST`      | `0.0.0.0`                   | Network interface to bind            |
| `DATA_FILE` | `backend/src/data/tasks.json` | Path to the JSON data file         |
| `LOG_LEVEL` | `info`                      | `debug`, `info`, `warn` or `error`   |

Example: `PORT=8080 DATA_FILE=/tmp/tasks.json npm start`

## Project structure

```
TaskFlow/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── tasks.js          # /api/tasks endpoints
│   │   │   └── health.js         # /api/health endpoint
│   │   ├── services/
│   │   │   ├── taskService.js    # task business logic
│   │   │   └── storage.js        # JSON file persistence
│   │   ├── middleware/
│   │   │   ├── requestLogger.js  # one log line per request
│   │   │   └── errorHandler.js   # 404 + JSON error responses
│   │   ├── utils/
│   │   │   ├── validation.js     # request validation
│   │   │   ├── errors.js         # HttpError class
│   │   │   └── logger.js         # timestamped leveled logger
│   │   ├── data/
│   │   │   └── tasks.json        # task data (created automatically)
│   │   ├── app.js                # Express app setup
│   │   └── server.js             # entry point
│   ├── package.json
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── README.md
```

## Data model

```json
{
  "id": "2c59d6c9-3e43-4f9b-acdb-7f32d3173686",
  "title": "Write report",
  "description": "Q4 summary",
  "status": "pending",
  "createdAt": "2026-11-26T13:12:54.988Z",
  "updatedAt": "2026-11-26T13:12:54.988Z"
}
```

| Field         | Rules                                                     |
|---------------|-----------------------------------------------------------|
| `title`       | Required, non-empty string, max 100 characters            |
| `description` | Optional string, max 1000 characters (defaults to `""`)   |
| `status`      | `pending`, `in-progress` or `completed` (default `pending`) |

`id`, `createdAt` and `updatedAt` are set by the server.

## API endpoints

All requests and responses use JSON. Errors have the form `{ "error": "message", "details": [...] }` (`details` appears only on validation errors).

| Method | Endpoint                 | Description                         | Success | Errors        |
|--------|--------------------------|-------------------------------------|---------|---------------|
| GET    | `/api/health`            | Health check                        | 200     |               |
| GET    | `/api/tasks`             | List tasks (newest first)           | 200     | 400           |
| GET    | `/api/tasks/:id`         | Get one task                        | 200     | 404           |
| POST   | `/api/tasks`             | Create a task                       | 201     | 400           |
| PUT    | `/api/tasks/:id`         | Update a task's title, description and status | 200 | 400, 404 |
| PATCH  | `/api/tasks/:id/status`  | Change only the status              | 200     | 400, 404      |
| DELETE | `/api/tasks/:id`         | Delete a task                       | 204     | 404           |

`GET /api/tasks` accepts optional query parameters:

- `status`: `pending`, `in-progress` or `completed`
- `search`: case-insensitive match on the title

`PUT` replaces the title and description. If `status` is left out, the current status is kept.

### Examples

```bash
# Health
curl http://localhost:3000/api/health

# Create
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write report","description":"Q4 summary"}'

# List, filter and search
curl http://localhost:3000/api/tasks
curl "http://localhost:3000/api/tasks?status=pending&search=report"

# Get / update / change status / delete
curl http://localhost:3000/api/tasks/<id>
curl -X PUT http://localhost:3000/api/tasks/<id> \
  -H "Content-Type: application/json" \
  -d '{"title":"Write final report","description":"Q4","status":"in-progress"}'
curl -X PATCH http://localhost:3000/api/tasks/<id>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
curl -X DELETE http://localhost:3000/api/tasks/<id>
```

## Storage behavior

- If the data file or its folder is missing, it is created with an empty list at startup.
- If the file contains invalid JSON or is not a JSON array, it is copied to `tasks.json.corrupt-<timestamp>` and replaced with an empty list. A warning is logged.
- Records without an `id` and `title` are skipped, and a warning is logged.
- Writes go to a temporary file that is then renamed into place, and they run one at a time, so concurrent requests can't corrupt the file.

## Logging

Every request is logged with its method, URL, status code and duration:

```
[2026-11-26T13:15:26.615Z] INFO  TaskFlow running at http://localhost:3000
[2026-11-26T13:15:27.002Z] INFO  POST /api/tasks 201 4.1ms
[2026-11-26T13:15:27.010Z] WARN  GET /api/tasks/abc 404 0.9ms
```
