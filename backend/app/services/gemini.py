import logging
import json
import base64
import hashlib
from typing import List, Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.mock_mode = not bool(self.api_key)
        
        # Detect if we are using Groq (gsk_...) or Gemini (AIzaSy...)
        self.is_groq = self.api_key.startswith("gsk_") if self.api_key else False
        
        if self.mock_mode:
            logger.warning("No API key configured. Running in MOCK mode.")
        elif self.is_groq:
            logger.info("Groq API Key detected. Routing LLM requests to Groq.")
            self.model_name = "llama-3.3-70b-versatile"
            self.vision_model = "llama-3.2-11b-vision-preview"
            self.url = "https://api.groq.com/openai/v1/chat/completions"
        else:
            logger.info("Gemini API Key detected. Routing LLM requests to Google Gemini.")
            self.model_name = "gemini-1.5-flash"
            self.vision_model = "gemini-1.5-flash"
            self.url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"

    def generate_embedding(self, text: str, is_query: bool = False) -> List[float]:
        """
        Generates a 768-dimension vector embedding.
        If using Groq or if Gemini fails, it falls back to a deterministic local hashing vectorizer 
        which runs offline with zero dependencies and no API key.
        """
        if self.mock_mode:
            import random
            random.seed(hash(text))
            return [random.uniform(-1, 1) for _ in range(768)]

        # If using Gemini, attempt network embedding
        if not self.is_groq:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={self.api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": "models/text-embedding-004",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            try:
                with httpx.Client(timeout=10.0) as client:
                    res = client.post(url, headers=headers, json=payload)
                    if res.status_code == 200:
                        return res.json()["embedding"]["values"]
                    else:
                        logger.warning(f"Gemini embedding API failed (Status {res.status_code}). Falling back to local vectorizer.")
            except Exception as e:
                logger.warning(f"Error in Gemini embedding connection: {e}. Falling back to local vectorizer.")

        # Local deterministic term-hashing vectorizer (768 dimensions)
        # Guarantees key-free, network-free, fast, and deterministic keyword matching in Qdrant
        try:
            words = text.lower().split()
            vector = [0.0] * 768
            
            if not words:
                return vector

            for w in words:
                # Calculate MD5 hash of the word
                h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16)
                idx = h % 768
                vector[idx] += 1.0  # TF weighting
                
            # Normalize vector (L2 norm)
            norm = sum(val * val for val in vector) ** 0.5
            if norm > 0:
                vector = [val / norm for val in vector]
                
            return vector
        except Exception as e:
            logger.error(f"Local vectorizer failed: {e}")
            return [0.0] * 768

    def _call_llm(self, prompt: str, system_instruction: str = "", model_override: Optional[str] = None) -> str:
        """
        Helper method to call Groq or Gemini based on the configured key.
        """
        if self.is_groq:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": model_override if model_override else self.model_name,
                "messages": [
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            
            with httpx.Client(timeout=30.0) as client:
                res = client.post(self.url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
                else:
                    raise Exception(f"Groq API Error ({res.status_code}): {res.text}")
        else:
            payload = {
                "contents": [{
                    "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=30.0) as client:
                res = client.post(self.url, json=payload)
                if res.status_code == 200:
                    return res.json()["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    raise Exception(f"Gemini API Error ({res.status_code}): {res.text}")

    def generate_answer(self, question: str, retrieved_context: str, medium: str = "english") -> Dict[str, Any]:
        """
        Answers a student's question based on retrieved context, returning a structured JSON response.
        Ensures explanations and examples are formulated in the target medium language (Sinhala/Tamil/English).
        """
        if self.mock_mode:
            return self._get_mock_answer(question, medium)

        system_instruction = (
            f"You are an expert, highly experienced Sri Lankan Advanced Level (A/L) Physics teacher. "
            f"You MUST write all explanations, descriptions, worked examples, exam tips, and common mistakes in the {medium} language. "
            f"Formulas and mathematical equations can use standard English characters/letters and physics notation. "
            f"Answer the student's question strictly using the retrieved context."
        )
        
        prompt = f"""
Your task is to answer the student's question STRICTLY using the retrieved context provided below. 

You MUST write all explanations, descriptions, exam tips, worked examples, and common mistakes in the {medium} language. (Formulas and equations can use standard Latin/English variables and characters).

If the provided context does not contain the answer, or if you are not confident, you MUST return:
- confidence_score: 0.0
- explanation: "I cannot find sufficient information in the knowledge base." (Translate this explanation to {medium})
- all other fields: "N/A"

Retrieved Context:
{retrieved_context}

Student Question:
{question}

You MUST return a JSON object with this exact structure:
{{
  "topic": "The main physics concept/topic translated to {medium}",
  "explanation": "Detailed explanation of the physics concept in clear terms written in {medium}",
  "formula": "Key mathematical formulas associated with the topic",
  "worked_example": "A step-by-step solved sample problem matching the concept, explained in {medium}",
  "exam_tips": "Valuable exam tips, how marks are allocated, or what examiners look for, written in {medium}",
  "common_mistakes": "Typical student mistakes or misconceptions, written in {medium}",
  "confidence_score": 0.95, // Float between 0.0 and 1.0 representing context relevance
  "citations": ["document_1.pdf"] // Array of strings representing sources used
}}
"""
        try:
            result_text = self._call_llm(prompt, system_instruction)
            return json.loads(result_text)
        except Exception as e:
            logger.error(f"Error in generate_answer: {e}")
            return self._get_mock_answer(question, medium)

    def solve_image_question(self, image_bytes: bytes, mime_type: str, similar_context: Optional[str] = None, medium: str = "english") -> Dict[str, Any]:
        """
        Solves a Physics question from a photo/PDF using vision models.
        Formulates solutions, steps, and marks allocations in the chosen medium (Sinhala/Tamil/English).
        """
        if self.mock_mode:
            return self._get_fallback_image_solution(medium)

        base64_data = base64.b64encode(image_bytes).decode("utf-8")
        
        prompt = f"""
Analyze the uploaded image containing a Sri Lankan A/L Physics question.
Your task is to:
1. Extract the text (OCR) from the image. Keep the original extracted text in its original language, or translate it if you can.
2. Detect the physics chapter and question type (e.g. MCQ, Structured, Essay) and describe them in {medium}.
3. Solve the question step-by-step showing full mathematical calculations. Write all steps, descriptions, and derivations in {medium}.
4. Provide marks allocation typical of A/L marking schemes, described in {medium}.
5. Provide a confidence score (0.0 to 1.0) on your solution.

Use the following similar past paper context if helpful:
{similar_context if similar_context else "No similar past paper context provided."}

You MUST return a JSON object with this exact structure:
{{
  "extracted_text": "Parsed OCR text of the question",
  "detected_chapter": "Physics Chapter Name in {medium}",
  "question_type": "Question Type (MCQ, Structured, Essay) in {medium}",
  "solution_steps": [
    "Step 1 details in {medium}",
    "Step 2 details in {medium}"
  ],
  "final_answer": "Highlighted final numerical/conceptual answer in {medium}",
  "marks_allocation": "Marks allocation criteria breakdown in {medium}",
  "confidence_score": 0.95
}}
"""

        try:
            if self.is_groq:
                # Call Groq vision Llama 3.2 model
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.vision_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{base64_data}"
                                    }
                                }
                            ]
                        }
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2
                }
                with httpx.Client(timeout=45.0) as client:
                    res = client.post(self.url, headers=headers, json=payload)
                    if res.status_code == 200:
                        result_text = res.json()["choices"][0]["message"]["content"]
                        return json.loads(result_text)
                    else:
                        raise Exception(f"Groq Vision Error ({res.status_code}): {res.text}")
            else:
                # Call Gemini vision model
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {
                                "inlineData": {
                                    "mimeType": mime_type,
                                    "data": base64_data
                                }
                            }
                        ]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                with httpx.Client(timeout=45.0) as client:
                    res = client.post(url, json=payload)
                    if res.status_code == 200:
                        result_text = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                        return json.loads(result_text)
                    else:
                        raise Exception(f"Gemini Vision Error ({res.status_code}): {res.text}")
        except Exception as e:
            logger.error(f"Error in solve_image_question: {e}")
            return self._get_fallback_image_solution(medium)

    def generate_quiz(self, chapter: str, difficulty: str, question_format: str, count: int = 5, medium: str = "english") -> Dict[str, Any]:
        """
        Generates a quiz based on chapter and difficulty level, translated in the selected medium.
        """
        if self.mock_mode:
            return self._get_mock_quiz(chapter, difficulty, medium)

        prompt = f"""
Create a physics quiz based on:
- Chapter: {chapter}
- Difficulty Level: {difficulty}
- Format: {question_format}
- Number of questions: {count}

You MUST generate the entire quiz (title, question_text, options, correct_answer, explanation) in the {medium} language.

You MUST return a JSON object with this exact structure:
{{
  "title": "Practice Quiz title in {medium}",
  "chapter": "{chapter}",
  "difficulty": "{difficulty}",
  "questions": [
    {{
      "id": 1,
      "question_text": "Question text content in {medium}",
      "question_type": "{question_format}",
      "options": ["Option A in {medium}", "Option B in {medium}", "Option C in {medium}", "Option D in {medium}"], // Optional, only if MCQ
      "correct_answer": "Correct Option, or brief answer outline in {medium}",
      "explanation": "Detailed explanation of why this answer is correct in {medium}"
    }}
  ]
}}
"""
        try:
            result_text = self._call_llm(prompt, f"You are an examiner building a practice quiz. You MUST formulate it in the {medium} language.")
            return json.loads(result_text)
        except Exception as e:
            logger.error(f"Error in generate_quiz: {e}")
            return self._get_mock_quiz(chapter, difficulty, medium)

    def grade_quiz(self, quiz_questions: List[Dict[str, Any]], student_answers: List[Any], medium: str = "english") -> Dict[str, Any]:
        """
        Grades a quiz submission and returns scores with feedback in the selected medium language.
        """
        if self.mock_mode:
            return {
                "score": 80.0,
                "feedback_per_question": [
                    { 
                        "question_id": 1, 
                        "correct": True, 
                        "marks_obtained": 100.0, 
                        "review": "හොඳින් කර ඇත!" if medium == "sinhala" else "மிக நன்று!" if medium == "tamil" else "Excellent work!" 
                    }
                ],
                "general_study_advice": (
                    "භෞතික විද්‍යා සමීකරණ නැවත අධ්‍යයනය කරන්න." if medium == "sinhala" else 
                    "பௌதீகவியல் சூத்திரங்களை மீளாய்வு செய்வதில் கவனம் செலுத்துங்கள்." if medium == "tamil" else 
                    "Focus on revision of mechanics formulas."
                )
            }

        prompt = f"""
You are an A/L Physics examiner grading a quiz.
Here are the quiz questions:
{json.dumps(quiz_questions, indent=2)}

Here are the student's submitted answers corresponding to each question index (0-based):
{json.dumps(student_answers, indent=2)}

Compute the final score (out of 100).
For each question, explain if the answer is correct or partially correct, why, and how many marks are allocated.
Provide study suggestions based on performance.

You MUST formulate all feedback_per_question review fields and general_study_advice in the {medium} language.

You MUST return a JSON object with this exact structure:
{{
  "score": 80.0, // Float between 0 and 100
  "feedback_per_question": [
     {{ "question_id": 1, "correct": true, "marks_obtained": 100.0, "review": "Feedback description in {medium}" }}
  ],
  "general_study_advice": "General revision suggestions in {medium}."
}}
"""
        try:
            result_text = self._call_llm(prompt, f"You are an A/L Physics examiner. You MUST grade and provide all feedback in the {medium} language.")
            return json.loads(result_text)
        except Exception as e:
            logger.error(f"Error in grade_quiz: {e}")
            return {
                "score": 0.0,
                "feedback_per_question": [],
                "general_study_advice": "Grading service failed due to an error."
            }

    def _get_mock_answer(self, question: str, medium: str = "english") -> Dict[str, Any]:
        if medium == "sinhala":
            return {
                "topic": "යාන්ත්‍ර විද්‍යාව / චලිත විද්‍යාව (Mock)",
                "explanation": f"මෙය '{question}' සඳහා වන ආදර්ශ පිළිතුරකි. API කී එක සැකසූ පසු, මෙම පිළිතුරු ඔබේ දත්ත ගබඩාවේ ඇති භෞතික විද්‍යා PDF ඇසුරෙන් සකස් වේ.",
                "formula": "v = u + at \ns = ut + 0.5 * a * t^2",
                "worked_example": "නිශ්චලතාවයේ සිට 2 m/s^2 ත්වරණයකින් තත්පර 5ක් ගමන් කරන මෝටර් රථයක්.\nආරම්භක වේගය u = 0, a = 2, t = 5.\nඅවසන් වේගය v = 0 + 2 * 5 = 10 m/s.",
                "exam_tips": "සමීකරණ විසඳීමට පෙර වස්තුව මත ක්‍රියා කරන බල නිරූපණය කරන දෛශික රූප සටහනක් ඇඳීමට අමතක නොකරන්න.",
                "common_mistakes": "ආරම්භක ප්‍රවේගය සහ අවසන් ප්‍රවේගය දෛශික පටලවා ගැනීම, හෝ චලිත සමීකරණ වල කාලය වර්ග කිරීමට අමතක වීම.",
                "confidence_score": 0.85,
                "citations": ["Mechanics_Grade12_Notes.pdf"]
            }
        elif medium == "tamil":
            return {
                "topic": "இயக்கவியல் (Mock)",
                "explanation": f"இது '{question}' க்கான மாதிரி பதில். ஏபிஐ கீ அமைக்கப்பட்ட பின், இந்த பதில்கள் உங்கள் தரவுத்தளத்தில் உள்ள பௌதீகவியல் பிடிஎஃப் கோப்புகளிலிருந்து பெறப்படும்.",
                "formula": "v = u + at \ns = ut + 0.5 * a * t^2",
                "worked_example": "ஒரு கார் ஓய்விலிருந்து 2 m/s^2 முடுக்கத்துடன் 5 விநாடிகள் பயணிக்கிறது.\nதொடக்க வேகம் u = 0, a = 2, t = 5.\nஇறுதி வேகம் v = 0 + 2 * 5 = 10 m/s.",
                "exam_tips": "சமன்பாடுகளைத் தீர்க்கும் முன் எப்போதும் விசைகளைக் குறிக்கும் வரைபடத்தை வரையவும்.",
                "common_mistakes": "தொடக்க திசைவேகம் மற்றும் இறுதி திசைவேகங்களை மாற்றிப் பயன்படுத்துதல், அல்லது இயக்கவியல் சமன்பாடுகளில் நேரத்தை வர்க்கப்படுத்த மறப்பது.",
                "confidence_score": 0.85,
                "citations": ["Mechanics_Grade12_Notes.pdf"]
            }
        else:
            return {
                "topic": "Mechanics / Kinematics (Mock Mode)",
                "explanation": f"This is a demonstration answer for '{question}' because API Key is not set or mock mode is enabled. In production, this response contains explanations directly sourced from your educational PDFs.",
                "formula": "v = u + at \ns = ut + 0.5 * a * t^2",
                "worked_example": "A car accelerates from rest at 2 m/s^2 for 5 seconds.\nInitial speed u = 0, a = 2, t = 5.\nFinal speed v = 0 + 2 * 5 = 10 m/s.",
                "exam_tips": "Always sketch a vector diagram representing the forces acting on the objects before resolving equations.",
                "common_mistakes": "Mixing up initial velocity and final velocity vectors, or forgetting to square the time parameter in kinematic equations.",
                "confidence_score": 0.85,
                "citations": ["Mechanics_Grade12_Notes.pdf"]
            }

    def _get_mock_quiz(self, chapter: str, difficulty: str, medium: str = "english") -> Dict[str, Any]:
        if medium == "sinhala":
            return {
                "title": f"ප්‍රායෝගික ප්‍රශ්නාවලිය: {chapter} (Mock)",
                "chapter": chapter,
                "difficulty": difficulty,
                "questions": [
                    {
                        "id": 1,
                        "question_text": f"බලයේ SI ඒකකය කුමක්ද?",
                        "question_type": "MCQ",
                        "options": ["නිව්ටන් (N)", "ජූල් (J)", "වොට් (W)", "පැස්කල් (Pa)"],
                        "correct_answer": "නිව්ටන් (N)",
                        "explanation": "බලය මනින්නේ නිව්ටන් (N) ඒකකයෙනි."
                    }
                ]
            }
        elif medium == "tamil":
            return {
                "title": f"பயிற்சி வினாடிவினா: {chapter} (Mock)",
                "chapter": chapter,
                "difficulty": difficulty,
                "questions": [
                    {
                        "id": 1,
                        "question_text": f"விசையின் SI அலகு எது?",
                        "question_type": "MCQ",
                        "options": ["நியூட்டன் (N)", "ஜூல் (J)", "வாட் (W)", "பாஸ்கல் (Pa)"],
                        "correct_answer": "நியூட்டன் (N)",
                        "explanation": "விசை நியூட்டன் (N) அலகில் அளவிடப்படுகிறது."
                    }
                ]
            }
        else:
            return {
                "title": f"Practice Quiz: {chapter} - {difficulty.capitalize()}",
                "chapter": chapter,
                "difficulty": difficulty,
                "questions": [
                    {
                        "id": 1,
                        "question_text": f"What is the SI unit of force, which is key in studying {chapter}?",
                        "question_type": "MCQ",
                        "options": ["Newton (N)", "Joule (J)", "Watt (W)", "Pascal (Pa)"],
                        "correct_answer": "Newton (N)",
                        "explanation": "Force is measured in Newtons (N)."
                    }
                ]
            }

    def _get_fallback_image_solution(self, medium: str = "english") -> Dict[str, Any]:
        if medium == "sinhala":
            return {
                "extracted_text": "රූපයෙන් පෙළ ලබා ගැනීමට අපොහොසත් විය.",
                "detected_chapter": "නොදනී",
                "question_type": "නොදනී",
                "solution_steps": ["විද්‍යුත් AI ආකෘතිය ඇමතීමේදී දෝෂයක් සිදු විය."],
                "final_answer": "දෝෂයකි",
                "marks_allocation": "නැත",
                "confidence_score": 0.0
            }
        elif medium == "tamil":
            return {
                "extracted_text": "படத்தில் இருந்து உரையை பிரித்தெடுக்க முடியவில்லை.",
                "detected_chapter": "அறியப்படாதது",
                "question_type": "அறியப்படாதது",
                "solution_steps": ["AI மாதிரியை அழைப்பதில் பிழை ஏற்பட்டது."],
                "final_answer": "பிழை",
                "marks_allocation": "N/A",
                "confidence_score": 0.0
            }
        else:
            return {
                "extracted_text": "Failed to extract text from image.",
                "detected_chapter": "Unknown",
                "question_type": "Unknown",
                "solution_steps": ["An error occurred while calling the visual AI model."],
                "final_answer": "Error",
                "marks_allocation": "N/A",
                "confidence_score": 0.0
            }

gemini_service = GeminiService()
