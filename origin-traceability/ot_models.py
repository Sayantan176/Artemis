from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Represents a single "Received" hop in the email header chain
class TraceHop(BaseModel):
    hop_index: int
    header_raw: str
    extracted_ip: Optional[str] = None
    is_trusted: bool
    reason: str

# The output of the First-Hop IP Extraction algorithm
class OriginExtractionResult(BaseModel):
    origin_ip: Optional[str] = None
    confidence: str = Field(description="Must be: high | medium | indeterminate")
    trace: List[TraceHop]

# Timestamped snapshot for geolocation (prevents historical drift)
class GeoSnapshot(BaseModel):
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_radius_km: Optional[int] = None
    lookup_timestamp: datetime = Field(default_factory=datetime.utcnow)

# Stores the VPN/Proxy/Hosting flags
class ReputationSnapshot(BaseModel):
    is_vpn: bool = False
    is_tor: bool = False
    is_proxy: bool = False
    is_datacenter: bool = False
    provider_name: Optional[str] = None
    threat_score: Optional[int] = None
    lookup_timestamp: datetime = Field(default_factory=datetime.utcnow)

class ASNProfile(BaseModel):
    asn: Optional[int] = None
    asn_org: Optional[str] = None
    asn_type: Optional[str] = Field(
        default="unknown",
        description="residential | mobile | datacenter | business | unknown",
    )

class DomainProfile(BaseModel):
    domain: str
    registrar: Optional[str] = None
    creation_date: Optional[datetime] = None
    domain_age_days: Optional[int] = None
    mx_records: List[str] = Field(default_factory=list)
    spf_present: bool = False
    dmarc_present: bool = False

class LLMPrediction(BaseModel):
    predicted_country: str
    confidence_score: str
    reasoning: str
    web_search_used: bool = False

# The master record that combines all of the above
class OriginProfile(BaseModel):
    email_id: str
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    extraction: OriginExtractionResult
    geolocation: Optional[GeoSnapshot] = None
    ip_reputation: Optional[ReputationSnapshot] = None
    asn: Optional[ASNProfile] = None
    domain: Optional[DomainProfile] = None
    llm_prediction: Optional[LLMPrediction] = None
