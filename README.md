# 🗄️ Notes App — Backend API

REST API server for the Notes Web App, built with **Node.js**, **Express**, and **MongoDB**.

- **Live URL:** `https://notesappback-ubm1.onrender.com`
- **Deployed on:** [Render](https://render.com) (free tier)
- **Database:** MongoDB Atlas

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose ODM |
| Auth | JSON Web Tokens (JWT) |
| Security | Helmet, CORS, express-rate-limit |
| Dev Server | Nodemon |

---

## 📁 Project Structure

```
backend/
├── models/
│   ├── Folder.js        # Folder schema (name, color, description, customDates)
│   ├── Note.js          # Note schema (title, content, images, tags, isPinned)
│   └── User.js          # User/session schema
├── routes/
│   ├── auth.js          # POST /login, POST /logout, GET /verify
│   ├── folders.js       # CRUD for folders
│   └── notes.js         # CRUD for notes, search, pin
├── middleware/
│   └── auth.js          # JWT verification middleware
├── .env                 # Environment variables (not committed)
├── server.js            # Express app entry point
└── package.json
```

---

## ⚙️ Environment Variables

Create a `.env` file in this directory:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/noteapp
JWT_SECRET=your-super-secret-jwt-key
SPECIAL_PASSWORD=your-login-password
FRONTEND_URL=http://localhost:3000
```

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Port the server listens on | No (default `5000`) |
| `NODE_ENV` | `development` or `production` | No |
| `MONGODB_URI` | MongoDB connection string | ✅ Yes |
| `JWT_SECRET` | Secret key for signing JWTs | ✅ Yes |
| `SPECIAL_PASSWORD` | Single password used to log in | ✅ Yes |
| `FRONTEND_URL` | Allowed CORS origin | ✅ Yes |

---

## 🚀 Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (see above)

# 3. Start development server (auto-restarts on file changes)
npm run dev

# 4. Start production server
npm start
```

Server will be available at `http://localhost:5000`.

---

## 📡 API Reference

All routes under `/api/folders` and `/api/notes` require a `Bearer` token in the `Authorization` header.

### 🔐 Auth — `/api/auth`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login with `SPECIAL_PASSWORD`, returns JWT |
| `POST` | `/api/auth/logout` | ❌ | Clears server-side session |
| `GET` | `/api/auth/verify` | ❌ | Verify JWT validity (no DB hit) |
| `GET` | `/api/health` | ❌ | Health check — returns `{ status: "OK" }` |

**Login request body:**
```json
{ "password": "your-password" }
```
**Login response:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "lastLogin": "..." }
}
```

---

### 📁 Folders — `/api/folders`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/folders` | Get all folders (with live notesCount via aggregation) |
| `GET` | `/api/folders/:id` | Get a single folder by ID |
| `POST` | `/api/folders` | Create a new folder |
| `PUT` | `/api/folders/:id` | Update a folder |
| `DELETE` | `/api/folders/:id` | Delete a folder (only if it has no notes) |
| `GET` | `/api/folders/:id/stats` | Get folder statistics (total, pinned, recent notes) |

**Create/Update folder body:**
```json
{
  "name": "Work Notes",
  "description": "Everything work-related",
  "color": "#007bff",
  "customCreatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

### 📋 Notes — `/api/notes`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/notes/folder/:folderId` | Get paginated notes in a folder |
| `GET` | `/api/notes/:id` | Get a single note by ID |
| `POST` | `/api/notes` | Create a new note |
| `PUT` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Delete a note |
| `PATCH` | `/api/notes/:id/pin` | Toggle pin status |
| `GET` | `/api/notes/search/global` | Global full-text search across all notes |

**GET notes query parameters:**
```
?search=keyword   (optional) full-text search
&sortBy=createdAt (optional) createdAt | lastModified | title
&sortOrder=desc   (optional) asc | desc
&page=1           (optional) page number
&limit=12         (optional) results per page
```

**Create note body:**
```json
{
  "title": "My Note",
  "content": "Note content here...",
  "folderId": "<folder_id>",
  "tags": ["work", "ideas"],
  "isPinned": false,
  "images": [
    {
      "data": "data:image/png;base64,...",
      "originalName": "screenshot.png",
      "mimetype": "image/png",
      "size": 204800
    }
  ]
}
```

---

## 🛡️ Security

- **Rate limiting:** 1000 requests per IP per 15 minutes
- **CORS:** Only allows requests from `FRONTEND_URL` (and localhost in dev)
- **Helmet:** Sets secure HTTP headers automatically
- **JWT expiry:** Tokens expire after 24 hours
- **Input limits:** Request body capped at 10 MB (for Base64 images)

---

## 🗃️ Data Models

### Folder
```
_id          ObjectId
name         String  (max 100 chars, required, unique)
description  String  (max 500 chars)
color        String  (hex color, default #007bff)
notesCount   Number  (maintained by aggregation)
customCreatedDates  [{date, modifiedAt}]
createdAt    Date    (auto)
updatedAt    Date    (auto)
```

### Note
```
_id          ObjectId
title        String  (max 200 chars, required)
content      String  (max 10,000 chars, required)
folderId     ObjectId (ref Folder, required)
images       [{filename, originalName, mimetype, size, data (base64)}]
tags         [String]
isPinned     Boolean (default false)
lastModified Date
customCreatedDates      [{date, modifiedAt}]
customLastModifiedDates [{date, modifiedAt}]
createdAt    Date    (auto)
updatedAt    Date    (auto)
```

---

## 🚀 Deployment (Render)

1. Push code to GitHub
2. Connect repo on [render.com](https://render.com) → New Web Service
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add all environment variables in the Render dashboard
6. Set up a **UptimeRobot** monitor on `/api/health` every 5 minutes to prevent cold starts (free tier spins down after 15 min inactivity)

---

## 📜 npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node server.js` | Start production server |
| `npm run dev` | `nodemon server.js` | Start dev server with hot-reload |
