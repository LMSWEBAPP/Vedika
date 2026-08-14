import os
import re
import sqlite3
import datetime
from typing import List, Dict, Optional

DB_DIR = "data"
DB_PATH = os.path.join(DB_DIR, "memory.db")

# Basic PII regex filter to ensure sensitive personal details are never saved
PII_PATTERNS = [
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),  # Email
    re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),  # Phone numbers
    re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),  # Credit/Debit card numbers
]

def scrub_pii(text: str) -> str:
    """Replaces any detected emails, phone numbers, or card numbers with [REDACTED]."""
    cleaned = text
    for pattern in PII_PATTERNS:
        cleaned = pattern.sub("[REDACTED]", cleaned)
    return cleaned


class MemoryManager:
    """
    Lightweight, thread-safe student memory engine powered by SQLite in WAL mode.
    Manages persistent student profiles and learned academic concept states (Graph-like state tracking)
    with strict per-category retention caps and PII scrubbing.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path) if os.path.dirname(self.db_path) else ".", exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Opens a short-lived SQLite connection with WAL mode enabled for concurrent thread safety."""
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes database schema with constraints for clean upserts."""
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS student_profile (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS student_memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,       -- 'struggling', 'mastered', 'preference', 'project', 'recent_discussion'
                    subject TEXT NOT NULL,        -- 'math', 'science', 'coding', 'languages', 'general'
                    topic TEXT NOT NULL,          -- e.g. 'Quadratic Equations', 'Newton Laws'
                    note TEXT NOT NULL,           -- e.g. 'Had trouble factoring trinomials'
                    occurrence_count INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(category, subject, topic)
                );

                CREATE TABLE IF NOT EXISTS voice_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT DEFAULT '',
                    role TEXT NOT NULL,           -- 'student' or 'tutor'
                    text TEXT NOT NULL,
                    sentiment_label TEXT DEFAULT '',
                    sentiment_score REAL DEFAULT 0.0,
                    subject TEXT DEFAULT 'general',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Seed default profile if empty
            cursor = conn.execute("SELECT COUNT(*) FROM student_profile")
            if cursor.fetchone()[0] == 0:
                defaults = {
                    "name": "Alex",
                    "stage": "College",
                    "field_of_study": "Computer Science & Artificial Intelligence",
                    "hobbies": "Coding, Robotics, Tech Blogs",
                    "personality_template": "Encouraging Socratic Mentor & Study Companion"
                }
                for k, v in defaults.items():
                    conn.execute(
                        "INSERT OR REPLACE INTO student_profile (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                        (k, v)
                    )

            # Seed initial conversation memories if empty
            cursor = conn.execute("SELECT COUNT(*) FROM student_memories")
            if cursor.fetchone()[0] == 0:
                seed_mems = [
                    ("preference", "general", "Learning Preference", "Prefers interactive Socratic questions and step-by-step guidance"),
                    ("preference", "general", "Study Pace", "Enjoys friendly conceptual explanations before diving into problems"),
                ]
                for cat, subj, top, note in seed_mems:
                    conn.execute(
                        "INSERT OR REPLACE INTO student_memories (category, subject, topic, note, occurrence_count, updated_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
                        (cat, subj, top, note)
                    )

    def log_voice_turn(self, role: str, text: str, sentiment: Optional[dict] = None, subject: str = "general", session_id: str = "") -> bool:
        """
        Logs a single turn of voice conversation (student or tutor) with PII scrubbing and automatic pruning.
        """
        clean_text = scrub_pii(text.strip())
        if not clean_text:
            return False

        clean_role = "student" if role.lower().startswith("student") or role.lower().startswith("user") else "tutor"
        clean_subj = subject.strip().lower() if subject else "general"
        sent_label = sentiment.get("label", "") if sentiment else ""
        sent_score = float(sentiment.get("score", 0.0)) if sentiment else 0.0

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO voice_conversations (session_id, role, text, sentiment_label, sentiment_score, subject, created_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
            """, (session_id, clean_role, clean_text, sent_label, sent_score, clean_subj))

            # Prune conversation history to keep the 200 most recent turns
            conn.execute("""
                DELETE FROM voice_conversations
                WHERE id NOT IN (
                    SELECT id FROM voice_conversations
                    ORDER BY id DESC
                    LIMIT 200
                );
            """)

        print(f"[MemoryManager] Logged voice turn [{clean_role.upper()}]: '{clean_text[:60]}...'")
        return True

    def get_recent_conversations(self, limit: int = 10, subject: Optional[str] = None) -> List[Dict]:
        """
        Returns recent conversation turns chronologically.
        """
        with self._get_connection() as conn:
            if subject and subject.lower() != "all":
                cursor = conn.execute("""
                    SELECT id, session_id, role, text, sentiment_label, sentiment_score, subject, created_at
                    FROM voice_conversations
                    WHERE subject = ?
                    ORDER BY id DESC
                    LIMIT ?;
                """, (subject.lower(), limit))
            else:
                cursor = conn.execute("""
                    SELECT id, session_id, role, text, sentiment_label, sentiment_score, subject, created_at
                    FROM voice_conversations
                    ORDER BY id DESC
                    LIMIT ?;
                """, (limit,))
            rows = cursor.fetchall()

        # Return in ascending chronological order
        return [dict(r) for r in reversed(rows)]

    def get_previous_student_questions(self, limit: int = 5) -> List[Dict]:
        """
        Returns the exact previous questions asked by the student in descending order of recency.
        """
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, session_id, text, subject, created_at
                FROM voice_conversations
                WHERE role = 'student'
                ORDER BY id DESC
                LIMIT ?;
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    def search_conversation_history(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Searches past voice chat turns for keyword matches.
        """
        clean_q = scrub_pii(query.strip())
        if not clean_q:
            return []

        pattern = f"%{clean_q}%"
        with self._get_connection() as conn:
            cursor = conn.execute("""
                SELECT id, session_id, role, text, subject, created_at
                FROM voice_conversations
                WHERE text LIKE ?
                ORDER BY id DESC
                LIMIT ?;
            """, (pattern, limit))
            return [dict(r) for r in cursor.fetchall()]

    def search_memories(self, query: str = "", category: str = "all") -> List[Dict]:
        """
        Searches learned student memories by keyword and/or category.
        """
        clean_q = scrub_pii(query.strip()) if query else ""
        pattern = f"%{clean_q}%" if clean_q else "%"
        
        with self._get_connection() as conn:
            if category and category.lower() != "all":
                cursor = conn.execute("""
                    SELECT category, subject, topic, note, occurrence_count, updated_at
                    FROM student_memories
                    WHERE category = ? AND (topic LIKE ? OR note LIKE ?)
                    ORDER BY updated_at DESC, occurrence_count DESC
                    LIMIT 15;
                """, (category.lower(), pattern, pattern))
            else:
                cursor = conn.execute("""
                    SELECT category, subject, topic, note, occurrence_count, updated_at
                    FROM student_memories
                    WHERE topic LIKE ? OR note LIKE ?
                    ORDER BY updated_at DESC, occurrence_count DESC
                    LIMIT 15;
                """, (pattern, pattern))
            return [dict(r) for r in cursor.fetchall()]

    def get_conversation_context_for_prompt(self, limit: int = 6) -> str:
        """
        Formats recent conversation turns cleanly for system instruction injection.
        """
        turns = self.get_recent_conversations(limit=limit)
        if not turns:
            return ""

        lines = [
            "\n[RECENT VOICE CONVERSATION HISTORY (LAST TURNS)]",
            "This is the verbatim record of recent voice dialogue. Use this exact context when the student asks what was said or asked:"
        ]
        for t in turns:
            role_label = "Student" if t["role"] == "student" else "Vedika (Tutor)"
            lines.append(f"- {role_label}: \"{t['text']}\"")

        return "\n" + "\n".join(lines) + "\n"

    def save_memory(self, category: str, subject: str, topic: str, note: str) -> bool:
        """
        Upserts a learned memory item.
        Increments occurrence_count if existing; otherwise creates a new record.
        Auto-prunes category to a hard cap of 25 entries.
        """
        clean_cat = category.strip().lower()
        clean_subj = subject.strip().lower() if subject else "general"
        clean_top = scrub_pii(topic.strip())
        clean_note = scrub_pii(note.strip())

        if not clean_top or not clean_note:
            return False

        # If a topic is now 'mastered', remove any prior 'struggling' record for that topic
        with self._get_connection() as conn:
            if clean_cat == "mastered":
                conn.execute(
                    "DELETE FROM student_memories WHERE category = 'struggling' AND subject = ? AND topic = ?",
                    (clean_subj, clean_top)
                )

            # Upsert into student_memories
            conn.execute("""
                INSERT INTO student_memories (category, subject, topic, note, occurrence_count, updated_at)
                VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(category, subject, topic) DO UPDATE SET
                    note = excluded.note,
                    occurrence_count = student_memories.occurrence_count + 1,
                    updated_at = CURRENT_TIMESTAMP;
            """, (clean_cat, clean_subj, clean_top, clean_note))

            # Prune category to keep only the 25 most recent / highest occurrence records
            conn.execute("""
                DELETE FROM student_memories
                WHERE category = ? AND id NOT IN (
                    SELECT id FROM student_memories
                    WHERE category = ?
                    ORDER BY updated_at DESC, occurrence_count DESC
                    LIMIT 25
                );
            """, (clean_cat, clean_cat))

        print(f"[MemoryManager] Saved memory: [{clean_cat.upper()} | {clean_subj}] {clean_top} - '{clean_note}'")
        return True

    def get_relevant_memories(self, current_subject: str = "all", limit: int = 10) -> str:
        """
        Retrieves top relevant memories prioritized by current subject and recency.
        Formats context cleanly for Gemini prompt injection.
        """
        with self._get_connection() as conn:
            if current_subject and current_subject.lower() != "all":
                cursor = conn.execute("""
                    SELECT category, subject, topic, note, occurrence_count, updated_at
                    FROM student_memories
                    WHERE subject = ? OR category IN ('preference', 'recent_discussion')
                    ORDER BY updated_at DESC, occurrence_count DESC
                    LIMIT ?;
                """, (current_subject.lower(), limit))
            else:
                cursor = conn.execute("""
                    SELECT category, subject, topic, note, occurrence_count, updated_at
                    FROM student_memories
                    ORDER BY updated_at DESC, occurrence_count DESC
                    LIMIT ?;
                """, (limit,))

            rows = cursor.fetchall()

        if not rows:
            return ""

        lines = [
            "\n[ACTIVE CONTINUOUS STUDENT MEMORY (FROM LOCAL DATABASE)]",
            "Use these real memories to maintain continuous conversation context and ask follow-up questions:"
        ]
        for r in rows:
            cat = r["category"].upper()
            subj = r["subject"].capitalize()
            top = r["topic"]
            note = r["note"]
            count = r["occurrence_count"]
            repeat_info = f" (x{count})" if count > 1 else ""
            lines.append(f"- [{cat} | {subj}] {top}: {note}{repeat_info}")

        return "\n" + "\n".join(lines) + "\n"

    def get_profile(self) -> Dict[str, str]:
        """Returns the full key-value student profile."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT key, value FROM student_profile")
            return {row["key"]: row["value"] for row in cursor.fetchall()}

    def update_profile(self, key: str, value: str):
        """Updates a specific student profile key."""
        clean_val = scrub_pii(str(value).strip())
        with self._get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO student_profile (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                (key, clean_val)
            )

    def clear_all_memories(self) -> bool:
        """Wipes all student conversation memories and voice chat logs on user privacy request."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM student_memories;")
            conn.execute("DELETE FROM voice_conversations;")
        
        # VACUUM must run outside an active transaction
        conn = self._get_connection()
        conn.isolation_level = None
        try:
            conn.execute("VACUUM;")
        finally:
            conn.close()
            
        print("[MemoryManager] All student conversation memories and voice chat history cleared successfully.")
        return True
