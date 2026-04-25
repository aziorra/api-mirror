# api-mirror

> Tired of _"the backend is down"_ excuses? **api-mirror** is a lightweight proxy that silently records every API response and replays them the moment your backend goes offline - no config, no mocks to write.

Commit your `.api-mirror/` folder and your entire team shares the same safety net.

---

## How it works

```
Your App  →  api-mirror (localhost:3000)  →  Real API
                      ↓
              .api-mirror/
              GET_users_a1b2c3d4.json
              POST_auth_login_e5f6g7h8.json
              ...
```

1. **Proxy mode** - every `200 OK` response is automatically saved to `.api-mirror/`
2. **Auto-failover** - if the backend goes down (`ECONNREFUSED`), api-mirror silently serves the saved file
3. **Mirror mode** - flip a flag and work fully offline, no backend needed at all
4. **Dashboard** - edit any saved response at `http://localhost:3000/_mirror`

---

## Installation

### Use without installing (recommended for quick start)

```bash
npx api-mirror --target https://api.example.com
```

### Install globally

```bash
npm install -g api-mirror
api-mirror --target https://api.example.com
```

### Install in a project

```bash
npm install --save-dev api-mirror
```

Then add to your `package.json`:

```json
{
  "scripts": {
    "proxy": "api-mirror --target https://api.example.com"
  }
}
```

---

## Quick Start

**Step 1 - Point it at your API:**

```bash
api-mirror --target https://jsonplaceholder.typicode.com
```

**Step 2 - Make requests through the proxy:**

```bash
curl http://localhost:3000/users
curl http://localhost:3000/posts/1
```

Responses are automatically saved to `.api-mirror/`.

**Step 3 - Kill your backend. Keep working:**

```bash
# Backend is down? api-mirror serves from the saved files automatically.
curl http://localhost:3000/users   # still works
```

**Step 4 - Commit the recordings:**

```bash
git add .api-mirror/
git commit -m "chore: add api mirror recordings"
```

Your teammates now get the same recordings when they clone the repo.

---

## CLI Options

```
Usage: api-mirror [options]

Options:
  -t, --target <url>    Target API URL to proxy
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
api-mirror --target https://api.example.com

# Different port
api-mirror --target https://api.example.com --port 8080

# Fully offline - serve from recordings only
api-mirror --mirror

# Test slow connections (2 second delay on every response)
api-mirror --target https://api.example.com --latency 2000

# Verbose - see every request logged
api-mirror --target https://api.example.com --verbose
```

---

## Environment Variables

Copy `.env.example` to `.env` to configure via file instead of flags:

```bash
cp .env.example .env
```

```env
TARGET_URL=https://api.example.com
PORT=3000
MIRROR_MODE=false
LATENCY=0
```

CLI flags always override `.env` values.

---

## Dashboard

Open **`http://localhost:3000/_mirror`** in your browser while the proxy is running.

The dashboard lets you:

- Browse all saved recordings with method, path, status code, and timestamp
- Edit any response body (live JSON editor - saves overwrite the file on disk)
- Delete individual recordings
- Toggle **Mirror Mode** on/off without restarting
- Adjust **latency** on the fly with the number input

---

## Recordings - the `.api-mirror/` folder

Each saved response is a plain JSON file:

```
.api-mirror/
├── GET_users_a1b2c3d4.json
├── GET_posts_1_e5f6g7h8.json
└── POST_auth_login_f9g0h1i2.json
```

Filename format: `{METHOD}_{path}_{hash}.json`

The hash is derived from the method + path + query params, so the same request always maps to the same file. A sample file looks like:

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

You can edit the `body` field directly in a text editor or via the dashboard to simulate different states (empty lists, error payloads, edge cases).

### Git workflow

```gitignore
# .gitignore
node_modules/

# .api-mirror/ is intentionally NOT ignored - commit it!
```

---

## Common Use Cases

### Frontend development without a backend

```bash
# Day 1: backend is running - record everything
api-mirror --target http://localhost:4000

# Day 2: backend team is away - work offline
api-mirror --mirror
```

### Simulate slow network conditions

```bash
# Every request takes 3 seconds - great for testing loading states
api-mirror --target https://api.example.com --latency 3000
```

### Test with edited response data

1. Run the proxy and make a request to record it
2. Open `http://localhost:3000/_mirror`
3. Find the recording and click it to expand
4. Edit the JSON body (e.g., change a list to be empty)
5. Click **Save Changes**
6. Re-run your app - it now gets the edited response

### Share a reproducible API state with your team

```bash
# Record the "happy path" state
api-mirror --target https://api.example.com
# ... make the requests you want to capture ...

# Commit
git add .api-mirror/
git commit -m "recording: happy path with full user list"

# Teammates run offline with the same data
api-mirror --mirror
```

---

## Failover Behaviour

| Situation | Behaviour |
|---|---|
| Backend returns `200 OK` | Response proxied + saved to `.api-mirror/` |
| Backend returns non-200 | Response proxied, **not** saved |
| Backend is down (`ECONNREFUSED`) | Serves matching `.api-mirror/` file automatically |
| Backend is down, no recording | Returns `503` with a helpful error message |
| `--mirror` flag set | Always serves from `.api-mirror/`, never contacts backend |

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
