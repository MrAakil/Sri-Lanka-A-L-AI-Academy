import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Quiz, QuizSubmission, User, LearningState, AnalyticsLog
from app.routers.auth import get_current_user
from app.services.gemini import gemini_service

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = logging.getLogger(__name__)

class QuizGenerateRequest(BaseModel):
    chapter: str
    difficulty: str  # "easy", "medium", "hard", "exam"
    format: str      # "mcq", "structured", "essay"
    count: Optional[int] = 5
    medium: Optional[str] = "english"

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[Any]  # List of answers corresponding to question list index/id
    medium: Optional[str] = "english"

# Response Schemas
class QuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

class QuizResponse(BaseModel):
    id: int
    title: str
    chapter: str
    difficulty: str
    format: str
    questions: List[QuestionResponse]

class QuizSubmitResponse(BaseModel):
    submission_id: int
    score: float
    feedback: Dict[str, Any]

@router.post("/generate", response_model=QuizResponse)
def generate_quiz(
    payload: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a quiz dynamically using Gemini and save it in PostgreSQL.
    """
    # 1. Call Gemini to create quiz questions in selected medium
    raw_quiz = gemini_service.generate_quiz(
        chapter=payload.chapter,
        difficulty=payload.difficulty,
        question_format=payload.format,
        count=payload.count,
        medium=payload.medium or "english"
    )

    # 2. Save Quiz in DB
    db_quiz = Quiz(
        creator_id=current_user.id,
        title=raw_quiz.get("title", f"Practice Quiz: {payload.chapter}"),
        chapter=payload.chapter,
        difficulty=payload.difficulty,
        format=payload.format,
        questions=raw_quiz.get("questions", [])
    )
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)

    return db_quiz

@router.post("/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Grades quiz answers, logs submission, and updates student learning state.
    """
    # 1. Retrieve the quiz from DB
    db_quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()
    if not db_quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # 2. Grade quiz via Gemini service in selected medium
    grading_result = gemini_service.grade_quiz(
        quiz_questions=db_quiz.questions,
        student_answers=payload.answers,
        medium=payload.medium or "english"
    )

    score = grading_result.get("score", 0.0)

    # 3. Save Submission to DB
    submission = QuizSubmission(
        user_id=current_user.id,
        quiz_id=db_quiz.id,
        score=score,
        answers=payload.answers,
        feedback=grading_result
    )
    db.add(submission)

    # 4. Update Student Learning State (Weak / Strong areas tracking)
    chapter_name = db_quiz.chapter or "General Physics"
    
    state = db.query(LearningState).filter(
        LearningState.user_id == current_user.id,
        LearningState.chapter == chapter_name
    ).first()

    if not state:
        state = LearningState(
            user_id=current_user.id,
            chapter=chapter_name,
            topic=db_quiz.title,
            total_questions=0,
            correct_questions=0,
            average_score=0.0
        )
        db.add(state)

    # Update cumulative statistics
    num_questions = len(db_quiz.questions)
    state.total_questions += num_questions
    estimated_correct = int((score / 100.0) * num_questions)
    state.correct_questions += estimated_correct
    
    # Update average score
    state.average_score = ((state.average_score * (state.total_questions - num_questions)) + (score * num_questions)) / state.total_questions
    
    # Mark as weak area if average score is below 55%
    state.is_weak_area = state.average_score < 55.0

    # 5. Log analytics
    analytics_log = AnalyticsLog(
        event_type="quiz_submission",
        event_metadata={
            "quiz_id": db_quiz.id,
            "score": score,
            "chapter": chapter_name,
            "difficulty": db_quiz.difficulty,
            "medium": payload.medium
        }
    )
    db.add(analytics_log)

    db.commit()
    db.refresh(submission)

    return {
        "submission_id": submission.id,
        "score": score,
        "feedback": grading_result
    }
