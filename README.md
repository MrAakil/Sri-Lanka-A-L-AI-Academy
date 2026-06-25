# Sri Lankan A/L Physics AI Tutor Platform

A production-ready, AI-powered educational platform designed for Sri Lankan Advanced Level (A/L) Physics students. The system uses a **Retrieval-Augmented Generation (RAG)** architecture to deliver verified answers directly from curriculum documents, notes, past papers, and marking schemes, with zero fine-tuning.

The platform is fully localized, supporting layout and AI tutoring responses in three languages: **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.

---

## Key Features

1. **AI Physics RAG Chat (Multilingual)**: Chat with an AI tutor in English, Sinhala, or Tamil. The AI extracts theories directly from uploaded curriculum files. Answers are structured into clear learning cards: *Topic Classification*, *Teacher Explanation*, *Formula Box*, *Worked Examples*, *Exam Tips*, and *Common Mistakes*.
2. **OCR Past Paper Solver (Multilingual)**: Upload photos or PDFs of past paper questions. Get step-by-step mathematical solutions and official marking scheme breakdowns in your selected language.
3. **Diagram & Visual Solver**: Leverages visual models to solve diagram-based physics questions (circuits, force vectors, lens systems, etc.).
4. **Interactive Quiz Arena (Multilingual)**: Generates customized practice exams (MCQ, Structured, Essay) based on target syllabus chapters, grades answers against marking rules, and returns comprehensive grading reviews in the chosen language.
5. **Personalized Learning**: Automatically logs study history, tracks weak areas (scores below 55%), and creates daily practice recommendations.
6. **Administrative Dashboard**: Allows administrators to upload, manage, and vectorize educational materials (PDF, DOCX, TXT) into Qdrant.

---

## Technology Stack

* **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Canvas Confetti.
* **Backend**: FastAPI (Python), SQLAlchemy ORM, Uvicorn, Bcrypt, Pytest, PDFPlumber.
* **Databases**: PostgreSQL (Relational metadata) & Qdrant (Vector DB).
* **AI Engine**: Flexible routing supporting:
  * **Google Gemini API**: `gemini-1.5-flash` for text, vision, and quizzes, with fallback to `text-embedding-004`.
  * **Groq API**: `llama-3.3-70b-versatile` (completions) and `llama-3.2-11b-vision-preview` (multimodal).
* **Offline Embedding Fallback**: Incorporates a 100% key-free, network-free local term-hashing vectorizer (768 dimensions) to guarantee high-speed, local RAG searching even if Hugging Face or Gemini APIs are offline.

---

## Project Structure

```
AL physics Tutor/
├── docker-compose.yml          # Starts Postgres and Qdrant database services
├── README.md                   # This instruction file
├── backend/
│   ├── requirements.txt        # Backend python packages list
│   ├── test_backend.py         # Integration test suite (verifies PostgreSQL, Qdrant & Translations)
│   └── app/
│       ├── main.py             # FastAPI entrypoint
│       ├── config.py           # Configuration loader
│       ├── database.py         # DB session manager
│       ├── models.py           # Database entities
│       ├── routers/            # Auth, Chat, Solver, Quiz, Admin, Analytics routes
│       └── services/           # Vector DB helper, Gemini HTTP client, Chunking pipelines
└── frontend/
    ├── package.json            # Node.js dependencies list
    ├── tsconfig.json           # TypeScript rules
    └── src/
        ├── lib/
        │   ├── api.ts          # Central client fetch client
        │   └── translations.ts # English, Sinhala, and Tamil UI dictionary translations
        └── app/                # Layout, Global CSS, login, chat, solver, dashboard pages
```

---

## Setup & Launch Instructions

### Prerequisites
* **Docker Desktop**: Required to run PostgreSQL and Qdrant.
* **Node.js (v20+)**: Required for the frontend.
* **Python (v3.12+)**: Required for the backend.
* **API Key**: A valid Google Gemini API Key (`AIzaSy...`) or a Groq API Key (`gsk_...`).

---

### Step 1: Start Databases (Docker)
Ensure Docker Desktop is running, then start PostgreSQL and Qdrant from the project's root folder:
```bash
docker compose up -d
```
* PostgreSQL runs on port `5432`
* Qdrant API runs on port `6333` / Dashboard runs on `http://localhost:6333/dashboard`

---

### Step 2: Configure & Start FastAPI Backend

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install Python packages:
   ```bash
   pip3 install -r requirements.txt
   ```
3. Create a `.env` configuration file in the `backend/` directory:
   ```env
   PROJECT_NAME="Sri Lankan A/L Physics AI Tutor"
   DATABASE_URL="postgresql://postgres:postgres_secure_pass_123@localhost:5432/al_physics_tutor"
   QDRANT_URL="http://localhost:6333"
   GEMINI_API_KEY="YOUR_GEMINI_OR_GROQ_API_KEY_HERE"
   JWT_SECRET="YOUR_SECURE_JWT_SECRET_KEY"
   ```
4. Run the integration test suite to verify connectivity, vector search, and translation mappings:
   ```bash
   python3 test_backend.py
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   * Backend APIs documentation will be available at: `http://localhost:8000/api/docs`

---

### Step 3: Start Next.js Frontend

1. Navigate to the `frontend/` directory in a new terminal window:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open the application in your browser:
   * **URL**: `http://localhost:3000`

---

## Default Roles & Logins
* **Student Mode**: Sign up on the `/login` portal with the "Student" role. Allows taking quizzes, chatting, and uploading single diagrams.
* **Admin Mode**: Sign up on the `/login` portal with the "Administrator" role. This will unlock the Document portal (`/admin`) to upload syllabus files, notes, and past paper PDFs.
