import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, User, LearningState, AnalyticsLog, QuizSubmission
from app.routers.auth import get_current_user, require_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/admin-dashboard")
def get_admin_dashboard_metrics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Aggregation endpoint for administrative overview.
    """
    # 1. Total student count
    student_count = db.query(User).filter(User.role == "student").count()

    # 2. Daily Active Students (DAS) - unique students asking questions or starting quizzes in past 7 days
    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    
    daily_active = db.query(
        func.date(AnalyticsLog.created_at).label("day"),
        func.count(func.distinct(ChatMessage.user_id)).label("active_count")
    ).select_from(ChatMessage).filter(ChatMessage.created_at >= seven_days_ago).group_by("day").all()
    
    active_days = [{"date": str(row.day), "count": row.active_count} for row in daily_active]

    # 3. Most searched chapters/topics
    searched = db.query(
        ChatMessage.answer["topic"].astext.label("topic_name"),
        func.count(ChatMessage.id).label("query_count")
    ).group_by("topic_name").order_by(desc("query_count")).limit(5).all()
    
    popular_topics = [{"topic": row.topic_name, "count": row.query_count} for row in searched if row.topic_name]

    # 4. Weakest chapters globally (chapters with lowest average score in learning states)
    weak_chapters = db.query(
        LearningState.chapter,
        func.avg(LearningState.average_score).label("avg_score")
    ).group_by(LearningState.chapter).order_by("avg_score").limit(5).all()
    
    global_weak_chapters = [{"chapter": row.chapter, "average_score": round(row.avg_score or 0.0, 1)} for row in weak_chapters]

    # 5. Question volume (total and average per day)
    total_questions = db.query(ChatMessage).count()

    # 6. Average RAG retrieval confidence
    avg_conf = db.query(func.avg(ChatMessage.confidence_score)).scalar() or 0.0

    return {
        "total_students": student_count,
        "daily_active_history": active_days,
        "most_searched_topics": popular_topics,
        "weakest_chapters_globally": global_weak_chapters,
        "total_question_volume": total_questions,
        "average_retrieval_confidence": round(avg_conf, 3)
    }

@router.get("/student-report")
def get_student_learning_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns personalized profile, weak/strong chapters, study recommendations,
    and a custom revision schedule.
    """
    # 1. Fetch student's learning states
    states = db.query(LearningState).filter(LearningState.user_id == current_user.id).all()
    
    weak_areas = []
    strong_areas = []
    studied_chapters = []
    
    for s in states:
        studied_chapters.append(s.chapter)
        item = {
            "chapter": s.chapter,
            "topic": s.topic,
            "average_score": round(s.average_score, 1),
            "questions_answered": s.total_questions
        }
        if s.is_weak_area or s.average_score < 55.0:
            weak_areas.append(item)
        elif s.average_score >= 70.0:
            strong_areas.append(item)

    # 2. Daily Practice Plan Recommendations
    recommendations = []
    practice_plan = []
    revision_schedule = []

    if not studied_chapters:
        # Default starting point recommendation
        recommendations.append("Welcome! Start your learning journey by taking a quiz in Measurements or Mechanics.")
        practice_plan.append("Take a diagnostic 5-question MCQ quiz on Grade 12: Measurements.")
        revision_schedule.append({"day": "Today", "chapter": "Measurements", "action": "Take initial quiz"})
    else:
        # Generate recommendations based on weak areas
        for wa in weak_areas[:3]:
            recommendations.append(f"Revise formulas and explanations for {wa['chapter']}. You scored {wa['average_score']}% here.")
            practice_plan.append(f"Solve 3 essay-style questions on {wa['chapter']} to improve structural understanding.")
            
        if not weak_areas:
            recommendations.append("Excellent! You are performing well across all studied chapters. Keep practicing harder exam-level quizzes.")
            practice_plan.append("Try an Advanced Level Exam difficulty MCQ set on Mechanics.")

        # Build a weekly revision structure
        days = ["Monday", "Wednesday", "Friday"]
        for idx, wa in enumerate(weak_areas[:3]):
            if idx < len(days):
                revision_schedule.append({
                    "day": days[idx],
                    "chapter": wa["chapter"],
                    "action": f"Re-read key teacher notes and answer 5 practice MCQs."
                })
        
        # Fallback scheduled items
        if len(revision_schedule) < 3:
            revision_schedule.append({"day": "Sunday", "chapter": "Mechanics", "action": "General revision of Newton's laws"})

    # 3. Overall numbers
    total_asked = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).count()
    quiz_taken = db.query(QuizSubmission).filter(QuizSubmission.user_id == current_user.id).count()

    return {
        "student_email": current_user.email,
        "questions_asked": total_asked,
        "quizzes_taken": quiz_taken,
        "weak_chapters": weak_areas,
        "strong_chapters": strong_areas,
        "study_recommendations": recommendations,
        "daily_practice_plan": practice_plan,
        "weekly_revision_schedule": revision_schedule
    }
