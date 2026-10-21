import json
import os
from pathlib import Path
from typing import List, Dict, Any

KNOWLEDGE_DIR = Path(os.getenv("KNOWLEDGE_DIR", Path(__file__).parent.parent.parent / "knowledge"))

class KnowledgeRetriever:
    def __init__(self, knowledge_dir: Path = KNOWLEDGE_DIR):
        self.knowledge_dir = knowledge_dir
        self.scam_patterns: List[Dict[str, Any]] = []
        self.dark_patterns: List[Dict[str, Any]] = []
        self.legal_snippets: List[Dict[str, Any]] = []
        self.load_all()

    def load_all(self):
        scam_file = self.knowledge_dir / "scam_patterns.json"
        if scam_file.exists():
            with open(scam_file, "r", encoding="utf-8") as f:
                self.scam_patterns = json.load(f).get("scams", [])

        dp_file = self.knowledge_dir / "dark_patterns_taxonomy.json"
        if dp_file.exists():
            with open(dp_file, "r", encoding="utf-8") as f:
                self.dark_patterns = json.load(f).get("categories", [])

        legal_file = self.knowledge_dir / "legal_snippets.json"
        if legal_file.exists():
            with open(legal_file, "r", encoding="utf-8") as f:
                self.legal_snippets = json.load(f).get("provisions", [])

    def retrieve_scam_grounding(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        scored = []
        for item in self.scam_patterns:
            score = 0
            # Keyword matching on name, description, lines, tactics
            words = (
                item["name"] + " " +
                item["description"] + " " +
                " ".join(item.get("typical_script_lines", []))
            ).lower()
            for token in query_lower.split():
                if len(token) > 3 and token in words:
                    score += 1
            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]

    def retrieve_dark_pattern_grounding(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        scored = []
        for item in self.dark_patterns:
            score = 0
            words = (
                item["name"] + " " +
                item["definition"] + " " +
                " ".join(item.get("examples", []))
            ).lower()
            for token in query_lower.split():
                if len(token) > 3 and token in words:
                    score += 1
            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]

    def retrieve_legal_grounding(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        scored = []
        for item in self.legal_snippets:
            score = 0
            words = (
                item.get("topic", "") + " " +
                item.get("summary", "") + " " +
                item.get("citation", "")
            ).lower()
            for token in query_lower.split():
                if len(token) > 3 and token in words:
                    score += 1
            scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored[:top_k]]

retriever = KnowledgeRetriever()
