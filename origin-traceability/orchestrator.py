import email
from email.utils import parseaddr
import os
import json
from typing import Optional
from groq import Groq
from tavily import TavilyClient

from enrichers import NetworkEnricher
from extractor import find_origin_ip
from ot_models import OriginProfile, LLMPrediction

def extract_safe_email_content(parsed_msg: email.message.Message, max_chars: int = 12000) -> str:
    """
    Extracts only semantic headers and text body for LLM OSINT.
    Intentionally excludes 'Received' headers and IP fields to prevent
    the LLM from anchoring on US datacenter IPs (e.g., Google/Outlook).
    """
    headers = []
    for header in ["From", "To", "Subject", "Date"]:
        val = parsed_msg.get(header)
        if val:
            headers.append(f"{header}: {val}")
        
    headers_str = "\n".join(headers)

    body_parts = []
    if parsed_msg.is_multipart():
        for part in parsed_msg.walk():
            content_type = part.get_content_type()
            content_disp = str(part.get("Content-Disposition"))

            if content_type in ["text/plain", "text/html"] and "attachment" not in content_disp:
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        body_parts.append(payload.decode("utf-8", errors="ignore"))
                except Exception:
                    pass
    else:
        try:
            payload = parsed_msg.get_payload(decode=True)
            if payload:
                body_parts.append(payload.decode("utf-8", errors="ignore"))
        except Exception:
            pass

    body_str = "\n".join(body_parts)
    full_text = f"--- METADATA ---\n{headers_str}\n\n--- CONTENT ---\n{body_str}"
    
    if len(full_text) > max_chars:
        return full_text[:max_chars] + "\n... [TRUNCATED DUE TO LENGTH]"
    
    return full_text

class OriginTraceabilityService:
    def __init__(self, enricher: NetworkEnricher):
        self.enricher = enricher
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_client = Groq(api_key=self.groq_api_key) if self.groq_api_key else None
        
        tavily_key = os.getenv("TAVILY_API_KEY")
        self.tavily_client = TavilyClient(api_key=tavily_key) if tavily_key else None

    def analyze_with_llm(self, parsed_msg: email.message.Message) -> Optional[LLMPrediction]:
        """Passes a sanitized portion of the email to Groq for OSINT context attribution.
        If unknown, uses Tavily for web search augmentation."""
        if not self.groq_client:
            return None
            
        sanitized_email = extract_safe_email_content(parsed_msg)
            
        system_prompt = """You are an expert cybersecurity forensics analyst performing content-based OSINT attribution.
Predict the true geographic origin/country of the sender based SOLELY on email content and semantic metadata.

Key indicators to analyze:
1. Temporal/Timezone offsets in the 'Date' header (e.g., +0530 = India, +0900 = Japan, +0000 = UTC).
2. Currencies, telephone country dialing codes (+91, +1, +44), and address/postal formats.
3. Language, dialects, localized idioms, and spelling variants (British vs. American English).
4. Regional organizations, banks, utilities, or governmental bodies mentioned.
5. Country Code Top-Level Domains (ccTLDs like .in, .uk) in links and URLs.

DO NOT guess or assume US origin simply because an email is in English. If evidence is lacking, return 'Unknown'.

Respond ONLY in JSON matching this schema:
{
  "predicted_country": "Country name or 'Unknown'",
  "confidence_score": "High, Medium, or Low",
  "reasoning": "Detailed explanation citing the specific textual clues found"
}"""
        try:
            # Pass 1: Standard Evaluation
            completion = self.groq_client.chat.completions.create(
                model="qwen/qwen3.8-27b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Sanitized Email:\n\n{sanitized_email}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=1024
            )
            result_json = json.loads(completion.choices[0].message.content)
            predicted_country = result_json.get("predicted_country", "Unknown")

            # Fallback Pass 2: RAG Web Search Augmentation
            if predicted_country.lower() == "unknown" and self.tavily_client:
                query_prompt = """Extract the single most identifying piece of information from this email that could determine the sender's location (e.g., a company name, a unique phone number, or a physical address). Return ONLY a concise web search query. If nothing is found, return 'None'."""
                
                query_completion = self.groq_client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=[
                        {"role": "system", "content": query_prompt},
                        {"role": "user", "content": f"Sanitized Email:\n\n{sanitized_email}"}
                    ],
                    temperature=0.1,
                    max_tokens=50
                )
                search_query = query_completion.choices[0].message.content.strip().strip("'\"")
                
                if search_query and search_query.lower() != "none":
                    try:
                        # Call Tavily API for context
                        search_context = self.tavily_client.get_search_context(query=search_query, max_results=3)
                        augmented_prompt = f"""Sanitized Email:\n\n{sanitized_email}\n\n--- EXTERNAL WEB SEARCH CONTEXT ---\n{search_context}"""
                        
                        # Re-run LLM Analysis with new context
                        second_completion = self.groq_client.chat.completions.create(
                            model="qwen/qwen3.8-27b",
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": augmented_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.1,
                            max_tokens=1024
                        )
                        second_result = json.loads(second_completion.choices[0].message.content)
                        return LLMPrediction(**second_result, web_search_used=True)
                    except Exception as tavily_err:
                        print(f"DEBUG: Tavily Search Error - {tavily_err}")

            return LLMPrediction(**result_json, web_search_used=False)
            
        except Exception as e:
            print(f"DEBUG: Groq LLM API Error - {e}")
            return None

    def build_origin_profile(self, email_id: str, raw_email: str) -> OriginProfile:
        """Main pipeline orchestrator."""
        parsed_msg = email.message_from_string(raw_email)
        extraction = find_origin_ip(parsed_msg)

        _, from_address = parseaddr(parsed_msg.get("From", ""))
        sender_domain = None
        if "@" in from_address:
            sender_domain = from_address.split("@")[-1].lower()

        geo = None
        reputation = None
        asn = None

        if extraction.origin_ip:
            geo = self.enricher.geolocate(extraction.origin_ip)
            reputation = self.enricher.check_ip_reputation(extraction.origin_ip)
            asn = self.enricher.asn_lookup(extraction.origin_ip)

        domain_prof = None
        if sender_domain:
            domain_prof = self.enricher.domain_profile(sender_domain)
            
        llm_pred = self.analyze_with_llm(parsed_msg)

        return OriginProfile(
            email_id=email_id,
            extraction=extraction,
            geolocation=geo,
            ip_reputation=reputation,
            asn=asn,
            domain=domain_prof,
            llm_prediction=llm_pred
        )
