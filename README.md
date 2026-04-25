# api-mirror

> Tired of _"the backend is down"_ excuses? **api-mirror** is a lightweight proxy that silently records every API response and replays them the moment your backend goes offline — no config, no mocks to write.

Commit your `.api-mirror/` folder and your entire team shares the same safety net.

---

## How it works

```
Frontend (e.g. localhost:5173)
        ↓  all API calls go here
api-mirror proxy (e.g. localhost:5000)   ← records every 200 OK response
        ↓  forwards to real backend
Backend API (e.g. localhost:3000)
        ↓  backend goes down?
api-mirror auto-serves from .api-mirror/ folder (no change needed in frontend)
```

1. **Proxy mode** — every `200 OK` response is automatically saved to `.api-mirror/`
2. **Auto-failover** — if the backend goes down (`ECONNREFUSED`), api-mirror silently serves the saved file
3. **Mirror mode** — flip a flag and work fully offline, no backend needed at all
4. **Dashboard** — browse, edit, and delete any saved response at `http://localhost:5000/_mirror`

---

## Setup

### Step 1 — Install in your frontend project

Go into your **frontend** project folder and install as a dev dependency:

```bash
cd my-frontend-app
npm install --save-dev api-mirror
```

> **Why frontend?** api-mirror sits between your frontend and backend. Your frontend calls the proxy, the proxy calls the backend and records responses.

---

### Step 2 — Add a proxy script to package.json

Open your frontend project's `package.json` and add a `proxy` script:

```json
{
  "scripts": {
    "dev": "vite",
    "proxy": "api-mirror --target http://localhost:3000 --port 5000 --verbose"
  }
}
```

Replace:

- `http://localhost:3000` with your actual backend URL
- `5000` with any free port you want the proxy to listen on

---

### Step 3 — Update your frontend API base URL

Change your frontend's API base URL from the backend directly to the proxy port.

**Example — using a `.env` file in your frontend:**

```env
# Before
VITE_API_BASE_URL=http://localhost:3000

# After
VITE_API_BASE_URL=http://localhost:5000
```

**Example — hardcoded in code:**

```js
// Before
const API_BASE = "http://localhost:3000";

// After
const API_BASE = "http://localhost:5000";
```

---

### Step 4 — (Optional) Configure via .env file

Instead of passing flags every time, create a `.env` file in your frontend project root:

```bash
cp node_modules/api-mirror/.env.example .env
```

Then edit `.env`:

```env
TARGET_URL=http://localhost:3000    # your backend URL
PORT=5000                           # port for the proxy to listen on
MIRROR_MODE=false                   # true = offline mode, no backend needed
LATENCY=0                           # simulate slow network (milliseconds)
```

CLI flags always override `.env` values.

---

## Running the Project

### Normal development (backend is running)

Open **two terminals**:

**Terminal 1 — Start the proxy:**

```bash
npm run proxy
```

**Terminal 2 — Start your frontend:**

```bash
npm run dev
```

Now every API call your frontend makes goes through the proxy at port 5000, gets forwarded to your backend at port 3000, and the response is automatically saved to `.api-mirror/`.

---

### Offline development (backend is down or not available)

Run the proxy in mirror mode — it serves all responses from the saved `.api-mirror/` files:

```bash
npx api-mirror --mirror --port 5000
```

Or add it to `package.json`:

```json
{
  "scripts": {
    "proxy:offline": "api-mirror --mirror --port 5000"
  }
}
```

Then run your frontend as normal — it will never know the backend is gone.

---

### First time setup — record your endpoints

1. Start your backend
2. Run `npm run proxy`
3. Open your frontend and use every feature (login, list pages, detail pages, etc.)
4. Each endpoint you hit gets recorded to `.api-mirror/`
5. Commit the recordings:

```bash
git add .api-mirror/
git commit -m "chore: add api mirror recordings"
```

Your teammates now get all the same recordings when they clone the repo.

---

## CLI Options

```
Usage: api-mirror [options]

Options:
  -t, --target <url>    Target API URL to proxy (e.g. http://localhost:3000)
  -p, --port <number>   Port to listen on (default: 3000)
  -m, --mirror          Mirror mode - serve from .api-mirror/ only, no live backend
  -l, --latency <ms>    Simulated response latency in milliseconds (default: 0)
  -v, --verbose         Log every proxied and mirrored request
  -V, --version         Output version number
  -h, --help            Display help
```

### Examples

```bash
# Basic proxy + recorder
api-mirror --target http://localhost:3000 --port 5000

# Fully offline — serve from recordings only
api-mirror --mirror --port 5000

# Simulate slow network (2 second delay on every response)
api-mirror --target http://localhost:3000 --port 5000 --latency 2000

# See every request logged to the console
api-mirror --target http://localhost:3000 --port 5000 --verbose
```

---

## Dashboard

Open **`http://localhost:5000/_mirror`** in your browser while the proxy is running.

The dashboard lets you:

- Browse all saved recordings with method, path, status code, and timestamp
- Edit any response body (live JSON editor — saves overwrite the file on disk)
- Delete individual recordings
- Toggle **Mirror Mode** on/off without restarting
- Adjust **latency** on the fly without restarting

---

## Recordings — the `.api-mirror/` folder

Each saved response is a plain JSON file:

```
.api-mirror/
├── GET_users_a1b2c3d4.json
├── GET_posts_1_e5f6g7h8.json
└── POST_auth_login_f9g0h1i2.json
```

Filename format: `{METHOD}_{path}_{hash}.json`

The hash is derived from the method + path + query params, so the same request always maps to the same file. A sample file:

```json
{
  "method": "GET",
  "url": "/users?role=admin",
  "path": "/users",
  "query": { "role": "admin" },
  "statusCode": 200,
  "headers": { "content-type": "application/json" },
  "body": "[{\"id\": 1, \"name\": \"Alice\"}]",
  "recordedAt": "2026-04-25T10:30:00.000Z"
}
```

You can edit the `body` field directly in a text editor or via the dashboard to simulate different API states.

### Git workflow

```gitignore
# .gitignore — keep it like this
node_modules/
.env

# DO NOT add .api-mirror/ here
# Commit your recordings so teammates never hit a dead backend
```

---

## Common Use Cases

### Frontend dev without a backend

```bash
# Day 1: backend is running — record everything
npm run proxy

# Day 2: backend team is away — work offline
npx api-mirror --mirror --port 5000
```

### Simulate slow network conditions

```bash
# Every request takes 3 seconds — great for testing loading states
api-mirror --target http://localhost:3000 --port 5000 --latency 3000
```

### Edit a response to test edge cases

1. Run the proxy and use the app to record a request
2. Open `http://localhost:5000/_mirror`
3. Find the recording and click it to expand
4. Edit the JSON body (e.g., make a list empty, change a status field)
5. Click **Save Changes**
6. Reload your app — it now gets the edited response

### Share a reproducible API state with your team

```bash
# Record the "happy path" data
npm run proxy
# ... click through the app to hit every endpoint ...

# Commit recordings
git add .api-mirror/
git commit -m "recording: happy path with full product list"

# Teammates run offline with exactly the same data
npx api-mirror --mirror --port 5000
```

---

## Failover Behaviour

| Situation                        | Behaviour                                                 |
| -------------------------------- | --------------------------------------------------------- |
| Backend returns `200 OK`         | Response proxied + saved to `.api-mirror/`                |
| Backend returns non-200          | Response proxied, **not** saved                           |
| Backend is down (`ECONNREFUSED`) | Serves matching `.api-mirror/` file automatically         |
| Backend is down, no recording    | Returns `503` with a helpful error message                |
| `--mirror` flag set              | Always serves from `.api-mirror/`, never contacts backend |

---

## Use without installing (npx)

No install needed — use npx for a quick start:

```bash
npx api-mirror --target http://localhost:3000 --port 5000
```

### Install globally

```bash
npm install -g api-mirror
api-mirror --target http://localhost:3000 --port 5000
```

---

## Project Structure

```
api-mirror/
├── bin/
│   └── api-mirror.js        CLI entry point
├── src/
│   ├── config.js            Runtime config (live-editable from dashboard)
│   ├── recorder.js          Hash-based file save / load / list / update
│   ├── server.js            Express server with proxy + failover logic
│   └── dashboard/
│       ├── router.js        REST API powering the dashboard
│       └── index.html       Dashboard UI (no build step)
├── .api-mirror/             Saved recordings (commit this!)
├── .env.example
└── package.json
```

---

## License

MIT
