import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.config import settings

logger = logging.getLogger(__name__)

class VectorDBService:
    def __init__(self):
        self.collection_name = "physics_knowledge"
        self.vector_dim = 768  # text-embedding-004 output dimension
        try:
            self.client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
            )
            self.ensure_collection_exists()
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant Client: {e}")
            self.client = None

    def ensure_collection_exists(self):
        if not self.client:
            return
        try:
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            
            if self.collection_name not in collection_names:
                logger.info(f"Creating collection {self.collection_name}...")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_dim,
                        distance=Distance.COSINE
                    )
                )
                # Create payload indexes for metadata filtering
                self._create_payload_indexes()
        except Exception as e:
            logger.error(f"Error checking/creating Qdrant collection: {e}")

    def _create_payload_indexes(self):
        if not self.client:
            return
        fields_to_index = ["chapter", "topic", "file_type", "grade", "medium", "year"]
        for field in fields_to_index:
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field,
                    field_schema="keyword" if field != "year" and field != "grade" else "integer"
                )
            except Exception as e:
                logger.warning(f"Could not create index on field {field}: {e}")

    def upload_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        """
        chunks is a list of dicts:
        {
          "id": str/int,
          "vector": List[float],
          "payload": {
             "text": str,
             "chapter": str,
             "topic": str,
             "file_type": str,
             ...
          }
        }
        """
        if not self.client:
            logger.error("Qdrant client not initialized. Cannot upload.")
            return False
        
        try:
            points = []
            for i, chunk in enumerate(chunks):
                points.append(
                    PointStruct(
                        id=chunk.get("id", i),
                        vector=chunk["vector"],
                        payload=chunk["payload"]
                    )
                )
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Successfully uploaded {len(points)} chunks to Qdrant.")
            return True
        except Exception as e:
            logger.error(f"Failed to upsert points to Qdrant: {e}")
            return False

    def search_similar(
        self, 
        query_vector: List[float], 
        limit: int = 5, 
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search in Qdrant with optional metadata filtering.
        """
        if not self.client:
            logger.error("Qdrant client not initialized. Cannot search.")
            return []

        try:
            qdrant_filter = None
            if filters:
                conditions = []
                for key, val in filters.items():
                    if val is not None and val != "":
                        conditions.append(
                            FieldCondition(
                                key=key,
                                match=MatchValue(value=val)
                            )
                        )
                if conditions:
                    qdrant_filter = Filter(must=conditions)

            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                query_filter=qdrant_filter,
                limit=limit
            )

            hits = []
            for hit in results.points:
                hits.append({
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload
                })
            return hits
        except Exception as e:
            logger.error(f"Search similar failed: {e}")
            return []

vector_db_service = VectorDBService()
