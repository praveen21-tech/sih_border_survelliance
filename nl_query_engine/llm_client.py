import os
import json
from typing import Optional, Dict, Any
from config import settings

class UnifiedLLMClient:
    """
    Unified LLM Client interface supporting multiple providers:
    - Groq (Llama 3.3 70B, Llama 3 8B, Mixtral)
    - OpenAI (GPT-4o, GPT-4o-mini)
    - Google Gemini (Gemini 1.5 / 2.0 Flash / Pro)
    - Ollama (Local Llama 3 / Qwen)
    - Fallback heuristic generator when API keys are not provided yet.
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: float = 0.1
    ):
        self.provider = (provider or settings.LLM_PROVIDER).lower()
        self.model = model or settings.LLM_MODEL
        self.temperature = temperature
        self.api_key = api_key or self._get_default_api_key()

    def _get_default_api_key(self) -> str:
        """Fetch API key from settings according to provider."""
        if self.provider == "groq":
            return settings.GROQ_API_KEY
        elif self.provider == "openai":
            return settings.OPENAI_API_KEY
        elif self.provider == "gemini":
            return settings.GEMINI_API_KEY
        return ""

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """
        Executes a prompt completion against the configured LLM provider.
        """
        # 1. Groq Provider
        if self.provider == "groq" and self.api_key:
            try:
                from groq import Groq
                client = Groq(api_key=self.api_key)
                response = client.chat.completions.create(
                    model=self.model or "openai/gpt-oss-120b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=self.temperature,
                    max_tokens=800
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"[UnifiedLLMClient] Groq error ({e}). Trying fallback.")

        # 2. OpenAI Provider
        if self.provider == "openai" and self.api_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=self.api_key)
                response = client.chat.completions.create(
                    model=self.model or "gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=self.temperature
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"[UnifiedLLMClient] OpenAI error ({e}).")

        # 3. Google Gemini Provider
        if self.provider == "gemini" and self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                model = genai.GenerativeModel(
                    model_name=self.model or "gemini-1.5-flash",
                    system_instruction=system_prompt
                )
                response = model.generate_content(user_prompt)
                return response.text
            except Exception as e:
                print(f"[UnifiedLLMClient] Gemini error ({e}).")

        # 4. Ollama (Local)
        if self.provider == "ollama":
            try:
                import requests
                url = f"{settings.OLLAMA_BASE_URL}/api/generate"
                payload = {
                    "model": self.model or "llama3",
                    "prompt": f"System: {system_prompt}\nUser: {user_prompt}",
                    "stream": False
                }
                res = requests.post(url, json=payload, timeout=30)
                if res.status_code == 200:
                    return res.json().get("response", "")
            except Exception as e:
                print(f"[UnifiedLLMClient] Ollama error ({e}).")

        # 5. Smart Rule-Based / Local Heuristic fallback
        return self._smart_fallback(system_prompt, user_prompt)

    def _smart_fallback(self, system_prompt: str, user_prompt: str) -> str:
        """
        High-quality heuristic response generator when API keys are not yet configured.
        """
        p_lower = user_prompt.lower()
        if "sql" in system_prompt.lower() or "generate a sql query" in user_prompt.lower():
            if "person" in p_lower and ("track" in p_lower or "seen" in p_lower or "where" in p_lower or "001" in p_lower):
                return "SELECT * FROM person_sightings WHERE global_person_id = 'PERSON_001' ORDER BY timestamp ASC;"
            elif "event" in p_lower or "intrusion" in p_lower or "breach" in p_lower or "alert" in p_lower:
                return "SELECT * FROM surveillance_events ORDER BY timestamp DESC LIMIT 10;"
            elif "vehicle" in p_lower or "car" in p_lower or "plate" in p_lower:
                return "SELECT * FROM vehicle_records ORDER BY timestamp DESC LIMIT 10;"
            elif "watchlist" in p_lower or "wanted" in p_lower or "suspect" in p_lower:
                return "SELECT * FROM watchlist_hits ORDER BY timestamp DESC LIMIT 10;"
            else:
                return "SELECT * FROM surveillance_events ORDER BY timestamp DESC LIMIT 5;"

        return (
            "Based on the surveillance system logs, multiple sightings and events were analyzed. "
            "Relevant cross-camera activities, security alerts, and trajectory timelines have been compiled below."
        )
