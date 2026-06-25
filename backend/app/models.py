import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, JSON, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student")  # "student", "admin"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="user")
    quizzes = relationship("Quiz", back_populates="creator")
    submissions = relationship("QuizSubmission", back_populates="user")
    learning_states = relationship("LearningState", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "syllabus", "past_paper", "marking_scheme", "model_paper", "notes"
    chapter = Column(String, nullable=True)      # e.g., "Mechanics", "Electricity"
    topic = Column(String, nullable=True)        # e.g., "Forces", "Coulomb's Law"
    grade = Column(Integer, nullable=True)       # 12, 13
    medium = Column(String, nullable=True)       # "english", "sinhala", "tamil"
    source = Column(String, nullable=True)       # e.g., "2024 Exam"
    year = Column(Integer, nullable=True)
    status = Column(String, default="pending")   # "pending", "processing", "processed", "failed"
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_query = Column(String, nullable=False)
    answer = Column(JSON, nullable=False)  # JSON dictionary with topic, explanation, formula, worked_example, exam_tips, common_mistakes, sources, confidence_score
    confidence_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="messages")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    chapter = Column(String, nullable=True)      # Specific chapter, or "all"
    difficulty = Column(String, nullable=False)  # "easy", "medium", "hard", "exam"
    format = Column(String, nullable=False)      # "mcq", "structured", "essay"
    questions = Column(JSON, nullable=False)     # List of questions with options/schema
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User", back_populates="quizzes")
    submissions = relationship("QuizSubmission", back_populates="quiz")


class QuizSubmission(Base):
    __tablename__ = "quiz_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    score = Column(Float, nullable=False)
    answers = Column(JSON, nullable=False)       # List of answers student provided
    feedback = Column(JSON, nullable=False)      # Marking/grading analysis from LLM
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    quiz = relationship("Quiz", back_populates="submissions")


class LearningState(Base):
    __tablename__ = "learning_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chapter = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    total_questions = Column(Integer, default=0)
    correct_questions = Column(Integer, default=0)
    average_score = Column(Float, default=0.0)
    average_confidence = Column(Float, default=0.0)
    is_weak_area = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="learning_states")


class AnalyticsLog(Base):
    __tablename__ = "analytics_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)  # e.g., "query", "quiz_start", "doc_upload"
    event_metadata = Column(JSON, nullable=True) # e.g., { "latency": 150, "chapter": "Mechanics", "user_role": "student" }
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
