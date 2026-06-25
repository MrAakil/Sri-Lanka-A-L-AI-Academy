import os
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document, User, AnalyticsLog
from app.routers.auth import require_admin
from app.services.document_pipeline import document_pipeline
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

class DocumentResponseSchema(BaseModel):
    id: int
    filename: str
    file_type: str
    chapter: Optional[str]
    topic: Optional[str]
    grade: Optional[int]
    medium: Optional[str]
    year: Optional[int]
    status: str
    error_message: Optional[str]
    created_at: str

def run_ingest_pipeline(doc_id: int, db_session_maker):
    db = db_session_maker()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            logger.error(f"Document {doc_id} not found for background ingestion.")
            return
            
        doc.status = "processing"
        db.commit()
        
        success = document_pipeline.process_and_index_document(doc)
        
        if success:
            doc.status = "processed"
        else:
            doc.status = "failed"
            doc.error_message = "Vector embedding ingestion failed. Check service logs."
        db.commit()
    except Exception as e:
        logger.error(f"Error in background ingestion for doc {doc_id}: {e}")
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    file_type: str = Form(...),  # "syllabus", "past_paper", "marking_scheme", "model_paper", "notes"
    chapter: Optional[str] = Form(None),
    topic: Optional[str] = Form(None),
    grade: Optional[int] = Form(None),
    medium: Optional[str] = Form(None),  # "english", "sinhala", "tamil"
    source: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Upload a document, save it locally, create DB record, and trigger background parsing/embeddings.
    """
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
        )

    # 2. Save file
    filename = f"{uuid_name()}_{file.filename}"
    file_dir = settings.UPLOAD_DIR
    os.makedirs(file_dir, exist_ok=True)
    filepath = os.path.join(file_dir, filename)
    
    try:
        with open(filepath, "wb") as f:
            contents = await file.read()
            f.write(contents)
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Could not store uploaded file locally.")

    # 3. Create db record
    doc = Document(
        filename=file.filename,
        filepath=filepath,
        file_type=file_type,
        chapter=chapter,
        topic=topic,
        grade=grade,
        medium=medium,
        source=source,
        year=year,
        status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 4. Trigger background task
    from app.database import SessionLocal
    background_tasks.add_task(run_ingest_pipeline, doc.id, SessionLocal)

    # 5. Log analytics
    analytics_log = AnalyticsLog(
        event_type="doc_upload",
        event_metadata={
            "filename": file.filename,
            "file_type": file_type,
            "chapter": chapter
        }
    )
    db.add(analytics_log)
    db.commit()

    return {"message": "Document uploaded successfully. Processing started in background.", "document_id": doc.id}

@router.get("/documents")
def list_documents(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Retrieve status of all uploaded files.
    """
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    results = []
    for d in docs:
        results.append({
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "chapter": d.chapter,
            "topic": d.topic,
            "grade": d.grade,
            "medium": d.medium,
            "year": d.year,
            "status": d.status,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat()
        })
    return results

@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Removes a document metadata record from SQL.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete local file if it exists
    if os.path.exists(doc.filepath):
        try:
            os.remove(doc.filepath)
        except Exception as e:
            logger.warning(f"Could not remove local file {doc.filepath}: {e}")
            
    db.delete(doc)
    db.commit()
    return {"message": f"Document {doc_id} successfully deleted from backend."}

# Helper to generate unique string prefix
def uuid_name() -> str:
    import uuid
    return uuid.uuid4().hex[:8]
