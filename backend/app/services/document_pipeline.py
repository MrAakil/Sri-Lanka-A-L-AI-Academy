import os
import uuid
import logging
from typing import List, Dict, Any, Tuple
import pdfplumber
from docx import Document as DocxDocument

from app.services.gemini import gemini_service
from app.services.vector_db import vector_db_service

logger = logging.getLogger(__name__)

# Complete Sri Lankan A/L Physics Syllabus Chapter Mapping
SYLLABUS_MAP = {
    "Measurements": ["measurement", "unit", "dimension", "error", "vernier", "micrometer"],
    "Mechanics": ["force", "motion", "velocity", "acceleration", "projectile", "momentum", "torque", "equilibrium", "friction", "circular motion", "gravitational field"],
    "Waves": ["wave", "frequency", "sound", "light", "refraction", "reflection", "diffraction", "interference", "doppler effect", "optics", "lens", "prism"],
    "Thermal Physics": ["temperature", "heat", "thermodynamics", "conduction", "convection", "radiation", "gas laws", "specific heat"],
    "Electricity": ["charge", "current", "voltage", "resistance", "capacitor", "ohm's law", "kirchhoff", "potentiometer", "electric field", "resistor"],
    "Magnetism": ["magnetic field", "magnet", "lorentz force", "solenoid", "ampere's law", "biot-savart"],
    "Electromagnetic Induction": ["faraday", "lenz", "transformer", "alternating current", "induction", "generator"],
    "Electronics": ["diode", "transistor", "logic gate", "op-amp", "semiconductor", "rectifier"],
    "Modern Physics": ["quantum", "photoelectric", "x-ray", "matter waves", "blackbody", "photon"],
    "Nuclear Physics": ["radioactivity", "nuclear fission", "fusion", "alpha", "beta", "gamma", "half-life", "isotope"]
}

class DocumentPipeline:
    def extract_text(self, filepath: str) -> str:
        """
        Extract text from PDF, DOCX, or TXT.
        """
        ext = os.path.splitext(filepath)[1].lower()
        text_content = ""
        
        if ext == ".pdf":
            try:
                with pdfplumber.open(filepath) as pdf:
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            text_content += extracted + "\n"
            except Exception as e:
                logger.error(f"Error extracting PDF: {e}")
                raise e
        elif ext == ".docx":
            try:
                doc = DocxDocument(filepath)
                paragraphs = [p.text for p in doc.paragraphs]
                text_content = "\n".join(paragraphs)
            except Exception as e:
                logger.error(f"Error extracting DOCX: {e}")
                raise e
        elif ext == ".txt":
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    text_content = f.read()
            except Exception as e:
                logger.error(f"Error extracting TXT: {e}")
                raise e
        else:
            raise ValueError(f"Unsupported file format: {ext}")
            
        return text_content.strip()

    def clean_text(self, text: str) -> str:
        # Standard cleanups: remove consecutive blank lines, clean tabs, etc.
        lines = [line.strip() for line in text.split("\n")]
        cleaned_lines = [line for line in lines if line]
        return "\n".join(cleaned_lines)

    def detect_chapter_and_topic(self, text_sample: str) -> Tuple[str, str]:
        """
        Perform a keyword match to estimate the chapter. Falls back to Modern Physics if unclear.
        """
        sample_lower = text_sample.lower()
        chapter_scores = {ch: 0 for ch in SYLLABUS_MAP}
        
        for chapter, keywords in SYLLABUS_MAP.items():
            for kw in keywords:
                chapter_scores[chapter] += sample_lower.count(kw)

        best_chapter = max(chapter_scores, key=chapter_scores.get)
        if chapter_scores[best_chapter] == 0:
            return "Mechanics", "General Kinematics"  # Reasonable default

        # Attempt to find a topic name (a sentence or phrase containing keywords)
        detected_topic = f"General {best_chapter}"
        words = text_sample.split()
        if len(words) > 3:
            # Pick first short sentence or noun-phrase
            detected_topic = " ".join(words[:4]) + "..."
            
        return best_chapter, detected_topic

    def chunk_text(self, text: str, chunk_size: int = 800, overlap: int = 150) -> List[str]:
        """
        Split text into overlapping character segments.
        """
        chunks = []
        start = 0
        text_len = len(text)
        
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunks.append(text[start:end])
            start += chunk_size - overlap
            if start >= text_len or end == text_len:
                break
                
        return chunks

    def process_and_index_document(self, db_document: Any) -> bool:
        """
        Takes a SQLAlchemy document model entry, processes the physical file, 
        creates embeddings, and indexes in Qdrant.
        """
        try:
            # 1. Extract
            raw_text = self.extract_text(db_document.filepath)
            if not raw_text:
                raise ValueError("Extracted text content is empty.")

            # 2. Clean
            cleaned_text = self.clean_text(raw_text)

            # 3. Detect chapter and topic if missing
            detected_chapter = db_document.chapter
            detected_topic = db_document.topic
            
            if not detected_chapter:
                detected_chapter, detected_topic = self.detect_chapter_and_topic(cleaned_text[:2000])

            # 4. Chunk
            text_chunks = self.chunk_text(cleaned_text)
            
            # 5. Embed and prepare points
            qdrant_chunks = []
            for idx, text_chunk in enumerate(text_chunks):
                # Generate unique ID for Qdrant point
                point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{db_document.id}_{idx}"))
                
                # Generate vector embedding using Gemini
                vector = gemini_service.generate_embedding(text_chunk, is_query=False)
                
                # Payload metadata
                payload = {
                    "text": text_chunk,
                    "document_id": db_document.id,
                    "filename": db_document.filename,
                    "file_type": db_document.file_type,
                    "chapter": detected_chapter,
                    "topic": detected_topic,
                    "grade": db_document.grade,
                    "medium": db_document.medium,
                    "year": db_document.year,
                    "source": db_document.source
                }
                
                qdrant_chunks.append({
                    "id": point_id,
                    "vector": vector,
                    "payload": payload
                })

            # 6. Upload
            success = vector_db_service.upload_chunks(qdrant_chunks)
            return success
        except Exception as e:
            logger.error(f"Error processing document {db_document.filename}: {e}")
            return False

document_pipeline = DocumentPipeline()
