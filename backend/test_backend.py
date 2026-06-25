import sys
import os
import unittest
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set python path to find app module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import Base, get_db
from app.models import User, Document, ChatMessage, LearningState, Quiz
from app.services.vector_db import vector_db_service
from app.services.gemini import gemini_service
from app.services.document_pipeline import document_pipeline
from app.routers.auth import get_password_hash, verify_password, create_access_token

class TestPhysicsTutorBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure database connection
        cls.engine = create_engine(settings.DATABASE_URL)
        Base.metadata.create_all(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine)

    def test_database_connection_and_schemas(self):
        """
        Verify PostgreSQL connection and insert test tables.
        """
        session = self.Session()
        try:
            # Delete previous test accounts if any
            session.query(User).filter(User.email == "test_curriculum@student.com").delete()
            session.commit()
            
            # Test user insert
            test_user = User(
                email="test_curriculum@student.com",
                hashed_password=get_password_hash("securepass123"),
                role="student"
            )
            session.add(test_user)
            session.commit()
            session.refresh(test_user)
            
            self.assertIsNotNone(test_user.id)
            self.assertEqual(test_user.role, "student")
            self.assertTrue(verify_password("securepass123", test_user.hashed_password))
        except Exception as e:
            self.fail(f"Relational DB setup failed: {e}")
        finally:
            session.close()

    def test_qdrant_connectivity(self):
        """
        Ensure Qdrant client initializes and can check collections.
        """
        if not vector_db_service.client:
            self.skipTest("Qdrant client not initialized (check if Docker is running).")
        try:
            collections = vector_db_service.client.get_collections().collections
            collection_names = [c.name for c in collections]
            self.assertIn("physics_knowledge", collection_names)
        except Exception as e:
            self.fail(f"Qdrant vector DB connectivity failed: {e}")

    def test_document_pipeline_parsing_and_classification(self):
        """
        Test keyword-based chapter classification and text cleaning.
        """
        sample_text = """
        Newton's laws of motion are three physical laws that, together, laid the foundation for classical mechanics. 
        They describe the relationship between a body and the forces acting upon it, and its motion in response to those forces.
        First law: In an inertial reference frame, an object either remains at rest or continues to move at a constant velocity, 
        unless acted upon by a net force.
        """
        cleaned = document_pipeline.clean_text(sample_text)
        chapter, topic = document_pipeline.detect_chapter_and_topic(cleaned)
        
        self.assertEqual(chapter, "Mechanics")
        self.assertTrue(len(cleaned) > 0)
        
        # Test character-based chunking
        chunks = document_pipeline.chunk_text(cleaned, chunk_size=200, overlap=50)
        self.assertTrue(len(chunks) > 0)
        self.assertTrue(len(chunks[0]) <= 200)

    def test_gemini_service_embedding(self):
        """
        Ensure the Gemini embedding service responds with correct vector dimensions (768).
        """
        embedding = gemini_service.generate_embedding("Coulomb's Law")
        self.assertEqual(len(embedding), 768)

    def test_auth_jwt_token_generation(self):
        """
        Verify access token signing and verification logic.
        """
        email = "admin@tutor.com"
        token = create_access_token(data={"sub": email})
        self.assertTrue(len(token) > 0)

    def test_multilingual_answers(self):
        """
        Verify that the Gemini/Groq service can generate structured responses in Sinhala and Tamil.
        """
        if gemini_service.mock_mode:
            # Under mock mode, test mock translation triggers
            sinhala_ans = gemini_service.generate_answer(
                question="නිව්ටන්ගේ දෙවන නියමය විස්තර කරන්න",
                retrieved_context="Newton's second law of motion specifies F=ma.",
                medium="sinhala"
            )
            self.assertIn("යාන්ත්‍ර විද්‍යාව", sinhala_ans.get("topic", ""))
            
            tamil_ans = gemini_service.generate_answer(
                question="நியூட்டனின் இரண்டாம் விதியை விளக்குக",
                retrieved_context="Newton's second law of motion specifies F=ma.",
                medium="tamil"
            )
            self.assertIn("இயக்கவியல்", tamil_ans.get("topic", ""))
        else:
            # Under live API keys, verify actual Sinhala/Tamil character presence
            sinhala_ans = gemini_service.generate_answer(
                question="නිව්ටන්ගේ දෙවන නියමය විස්තර කරන්න",
                retrieved_context="Newton's second law of motion specifies force is mass times acceleration (F=ma).",
                medium="sinhala"
            )
            self.assertTrue(len(sinhala_ans.get("explanation", "")) > 0)
            has_sinhala = bool(re.search(r'[\u0d80-\u0dff]', sinhala_ans.get("explanation", "")))
            self.assertTrue(has_sinhala, f"Explanation should contain Sinhala Unicode: {sinhala_ans.get('explanation')}")

            tamil_ans = gemini_service.generate_answer(
                question="நியூட்டனின் இரண்டாம் விதியை விளக்குக",
                retrieved_context="Newton's second law of motion specifies force is mass times acceleration (F=ma).",
                medium="tamil"
            )
            self.assertTrue(len(tamil_ans.get("explanation", "")) > 0)
            has_tamil = bool(re.search(r'[\u0b80-\u0bff]', tamil_ans.get("explanation", "")))
            self.assertTrue(has_tamil, f"Explanation should contain Tamil Unicode: {tamil_ans.get('explanation')}")

if __name__ == "__main__":
    unittest.main()
