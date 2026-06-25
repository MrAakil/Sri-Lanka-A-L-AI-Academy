import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChatMessage, User, AnalyticsLog
from app.routers.auth import get_current_user
from app.services.gemini import gemini_service
from app.services.vector_db import vector_db_service

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

class ChatQuery(BaseModel):
    query: str
    chapter: Optional[str] = None
    topic: Optional[str] = None
    paper_type: Optional[str] = None
    year: Optional[int] = None
    medium: Optional[str] = "english"

class ChatResponse(BaseModel):
    id: int
    topic: str
    explanation: str
    formula: str
    worked_example: str
    exam_tips: str
    common_mistakes: str
    confidence_score: float
    citations: List[str]

@router.post("/query", response_model=ChatResponse)
def query_physics_tutor(
    payload: ChatQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import time
    start_time = time.time()
    
    # 1. Generate query embedding
    query_vector = gemini_service.generate_embedding(payload.query, is_query=True)
    
    # 2. Setup metadata filters
    filters = {}
    if payload.chapter:
        filters["chapter"] = payload.chapter
    if payload.topic:
        filters["topic"] = payload.topic
    if payload.paper_type:
        filters["file_type"] = payload.paper_type
    if payload.year:
        filters["year"] = payload.year
    if payload.medium:
        filters["medium"] = payload.medium
        
    # 3. Retrieve relevant chunks from Qdrant
    hits = vector_db_service.search_similar(
        query_vector=query_vector,
        limit=5,
        filters=filters
    )
    
    # Fallback to English medium if localized search yields 0 hits
    if not hits and payload.medium and payload.medium != "english":
        logger.info(f"No chunks found for medium '{payload.medium}'. Falling back to english.")
        filters_fallback = {**filters}
        filters_fallback["medium"] = "english"
        hits = vector_db_service.search_similar(
            query_vector=query_vector,
            limit=5,
            filters=filters_fallback
        )
        # If still no hits, drop medium filter entirely
        if not hits:
            filters_fallback.pop("medium", None)
            hits = vector_db_service.search_similar(
                query_vector=query_vector,
                limit=5,
                filters=filters_fallback
            )
    
    # 4. Assemble Context
    retrieved_texts = []
    citations = []
    for hit in hits:
        text = hit["payload"].get("text", "")
        filename = hit["payload"].get("filename", "Unknown Source")
        retrieved_texts.append(text)
        if filename not in citations:
            citations.append(filename)
            
    context = "\n---\n".join(retrieved_texts)
    
    # 5. Prompt Gemini for RAG answer in selected medium
    answer_data = gemini_service.generate_answer(
        question=payload.query, 
        retrieved_context=context, 
        medium=payload.medium or "english"
    )
    
    # Override/add citations if empty
    if not answer_data.get("citations") and citations:
        answer_data["citations"] = citations
    elif not answer_data.get("citations"):
        answer_data["citations"] = []
        
    # Guardrail check
    confidence = answer_data.get("confidence_score", 0.0)
    if confidence < 0.35:
        # Override to guardrail answer if confidence is low, translating guardrails
        fallback_msg = {
            "english": "I cannot find sufficient information in the knowledge base.",
            "sinhala": "දැනුම් පදනමෙහි ප්‍රමාණවත් තොරතුරු සොයාගත නොහැක.",
            "tamil": "அறிவுத் தளத்தில் போதுமான தகவல்களைக் கண்டறிய முடியவில்லை."
        }
        answer_data["topic"] = "N/A"
        answer_data["explanation"] = fallback_msg.get(payload.medium or "english", fallback_msg["english"])
        answer_data["formula"] = "N/A"
        answer_data["worked_example"] = "N/A"
        answer_data["exam_tips"] = "N/A"
        answer_data["common_mistakes"] = "N/A"
        answer_data["confidence_score"] = confidence
        answer_data["citations"] = []
        
    # 6. Save history to Database
    db_message = ChatMessage(
        user_id=current_user.id,
        message_query=payload.query,
        answer=answer_data,
        confidence_score=confidence
    )
    db.add(db_message)
    
    # 7. Log analytics
    latency_ms = int((time.time() - start_time) * 1000)
    analytics_log = AnalyticsLog(
        event_type="query",
        event_metadata={
            "query": payload.query,
            "chapter": payload.chapter or answer_data.get("topic"),
            "confidence": confidence,
            "latency_ms": latency_ms,
            "chunks_retrieved": len(hits),
            "medium": payload.medium
        }
    )
    db.add(analytics_log)
    
    db.commit()
    db.refresh(db_message)
    
    return {
        "id": db_message.id,
        "topic": answer_data.get("topic", "Physics Topic"),
        "explanation": answer_data.get("explanation", ""),
        "formula": answer_data.get("formula", ""),
        "worked_example": answer_data.get("worked_example", ""),
        "exam_tips": answer_data.get("exam_tips", ""),
        "common_mistakes": answer_data.get("common_mistakes", ""),
        "confidence_score": confidence,
        "citations": answer_data.get("citations", [])
    }
