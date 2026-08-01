# Frappe LMS Backend Integration & Setup Guide

This guide explains how to start your local headless **Frappe LMS** backend container and link it directly with your Next.js web application.

---

## 1. How to Start the Frappe LMS Backend

Your workspace already includes a Dockerized Frappe environment configured in the `frappe-learning` directory.

### Prerequisites
- Install **Docker Desktop** on Windows.
- Ensure Docker is running.

### Launch Instructions
1. Open PowerShell, Git Bash, or Command Prompt on your computer.
2. Navigate to the `frappe-learning` folder:
   ```bash
   cd C:\Users\seshu\frappe-learning
   ```
3. Boot up the MariaDB, Redis, and Frappe containers in detached mode:
   ```bash
   docker-compose up -d
   ```
4. **First-time Setup:**
   The `init.sh` script will automatically run inside the `frappe` service container. It will:
   - Initialize the `frappe-bench` workspace.
   - Fetch the `payments` and `lms` Frappe applications.
   - Provision a site named `lms.localhost`.
   - Install the payments and LMS apps on the site.
   - Spin up the Frappe web server on port **8000** and Socket.io server on port **9000**.
   
   *Note: The first run might take 5-10 minutes as it downloads dependencies and sets up the site database.*

---

## 2. Linking the Frontend with the Backend

Once your Frappe backend is active on `http://localhost:8000`:

1. Open your Next.js web app directory:
   ```bash
   cd C:\Users\seshu\demo-lms
   ```
2. Create or edit your `.env` file in the root of the project:
   ```bash
   FRAPPE_URL="http://localhost:8000"
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. **Verify Live Calls:**
   When `FRAPPE_URL` is set, `lib/frappe.js` will automatically switch from `localStorage` mock caching to sending real REST requests to the Frappe API (CORS configured).

---

## 3. Supported Management Features (Next.js UI)

You can now perform full LMS syllabus outlines on your Next.js frontend:

- **Create/Publish Courses:** Navigate to `/admin/courses` (Admin Workspace) and use the action row buttons.
- **Syllabus Outline Editor:** Click the **Book Icon** ("Manage Course Syllabus") next to any course in the admin list to open `/admin/courses/[id]`.
  - **Chapters (Modules):** Create chapters, edit names, or delete entire modules.
  - **Lessons:** Add lessons to specific chapters, including Titles, YouTube video IDs, durations, overviews, and study bullet points.
  - **MCQ Quizzes:** Add practice questions directly under specific lessons (specify question body, options A/B/C/D, and correct option index).
- **Student View Sync:** All modifications are immediately visible on the Student Dashboard (`/`) and Courses directory (`/courses`). Dynamic lessons can be launched, played, and practice quizzes can be taken with automatic progress tracking.
