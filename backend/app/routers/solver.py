import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AnalyticsLog
from app.routers.auth import get_current_user
from app.services.gemini import gemini_service
from app.services.vector_db import vector_db_service

router = APIRouter(prefix="/solver", tags=["solver"])
logger = logging.getLogger(__name__)

class SolverResponse(BaseModel):
    extracted_text: str
    detected_chapter: str
    question_type: str
    solution_steps: List[str]
    final_answer: str
    marks_allocation: str
    confidence_score: float

@router.post("/past-paper", response_model=SolverResponse)
async def solve_past_paper(
    file: UploadFile = File(...),
    medium: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a past paper question (image or PDF).
    It extracts the text, finds similar past papers/marking schemes in the vector DB,
    and returns a step-by-step explanation with marks allocation.
    """
    contents = await file.read()
    mime_type = file.content_type or "image/png"
    
    # 1. OCR and visual question extraction via Gemini
    try:
        # Initial call to extract text from the file
        initial_extracted = gemini_service.solve_image_question(contents, mime_type, medium=medium)
        extracted_text = initial_extracted.get("extracted_text", "")
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        raise HTTPException(status_code=400, detail="Failed to parse the file visual content.")

    # 2. Search Qdrant for similar past papers using the extracted text
    context = ""
    if extracted_text:
        query_vector = gemini_service.generate_embedding(extracted_text, is_query=True)
        # Filter for similar past papers or marking schemes
        filters = {"file_type": "marking_scheme"}
        hits = vector_db_service.search_similar(query_vector, limit=3, filters=filters)
        
        retrieved = [h["payload"].get("text", "") for h in hits]
        context = "\n---\n".join(retrieved)

    # 3. Solve the question using the retrieved marking schemes as guidance
    solution = gemini_service.solve_image_question(
        image_bytes=contents,
        mime_type=mime_type,
        similar_context=context,
        medium=medium
    )

    # Log analytics
    analytics_log = AnalyticsLog(
        event_type="solve_past_paper",
        event_metadata={
            "filename": file.filename,
            "chapter": solution.get("detected_chapter"),
            "question_type": solution.get("question_type"),
            "confidence": solution.get("confidence_score"),
            "medium": medium
        }
    )
    db.add(analytics_log)
    db.commit()

    return solution

@router.post("/image-question", response_model=SolverResponse)
async def solve_image_question(
    file: UploadFile = File(...),
    medium: str = Form("english"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Solves a physics question from a photo of a diagram.
    Explains every step and outlines the diagram concepts.
    """
    contents = await file.read()
    mime_type = file.content_type or "image/png"

    # Solve the question directly via Gemini Vision
    solution = gemini_service.solve_image_question(
        image_bytes=contents,
        mime_type=mime_type,
        medium=medium
    )

    # Log analytics
    analytics_log = AnalyticsLog(
        event_type="solve_image",
        event_metadata={
            "filename": file.filename,
            "chapter": solution.get("detected_chapter"),
            "confidence": solution.get("confidence_score"),
            "medium": medium
        }
    )
    db.add(analytics_log)
    db.commit()

    return solution
