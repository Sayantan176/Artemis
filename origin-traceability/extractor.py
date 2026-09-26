import email
from email.message import Message
import ipaddress
import re
from typing import List, Optional, Tuple

from ot_models import OriginExtractionResult, TraceHop

# Regex to find standard IPv4 addresses in header text
IP_REGEX = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
)

# We define internal/private networks and known ESPs as trusted[cite: 1].
# In a full production app, this list would be extensive.
TRUSTED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),       # Private
    ipaddress.ip_network("172.16.0.0/12"),    # Private
    ipaddress.ip_network("192.168.0.0/16"),   # Private
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("167.89.0.0/17"),    # Example: SendGrid outbound range
]

def classify_ip(ip_str: str) -> Tuple[bool, str]:
    """Determines if an IP is trusted (internal/ESP) or external[cite: 1]."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            return True, "RFC 1918 / Private network hop"
        
        for net in TRUSTED_NETWORKS:
            if ip_obj in net:
                return True, f"Matched trusted ESP range ({net})"
                
        return False, "Public external IP"
    except ValueError:
        return False, "Malformed IP"

def find_origin_ip(parsed_msg: Message) -> OriginExtractionResult:
    """
    Walks chronological headers to find the first untrusted origin IP[cite: 1].
    """
    # Received headers stack newest-first. Reverse them to walk oldest -> newest[cite: 1].
    raw_received = parsed_msg.get_all("Received", [])
    chronological_hops = list(reversed(raw_received))

    trace: List[TraceHop] = []
    origin_ip: Optional[str] = None
    confidence = "indeterminate" # Default to indeterminate (no silent guessing)[cite: 1].

    for index, header_val in enumerate(chronological_hops):
        # Extract the first IP candidate found in this specific Received line[cite: 1]
        matches = IP_REGEX.findall(header_val)
        ip_candidate = matches[0] if matches else None

        if not ip_candidate:
            trace.append(
                TraceHop(
                    hop_index=index,
                    header_raw=header_val.strip().replace("\n", " ").replace("\t", " "),
                    extracted_ip=None,
                    is_trusted=True,
                    reason="No parsable IP found in Received line",
                )
            )
            continue

        is_trusted, reason = classify_ip(ip_candidate)
        trace.append(
            TraceHop(
                hop_index=index,
                header_raw=header_val.strip().replace("\n", " ").replace("\t", " "),
                extracted_ip=ip_candidate,
                is_trusted=is_trusted,
                reason=reason,
            )
        )

        # The first external, non-trusted IP walking oldest -> newest is our origin[cite: 1].
        if not is_trusted and origin_ip is None:
            origin_ip = ip_candidate
            # High confidence if it's the very first hop, medium if it's buried in the middle[cite: 1]
            confidence = "high" if index == 0 else "medium"

    # Corroborating check: X-Originating-IP[cite: 1]
    x_orig = parsed_msg.get("X-Originating-IP")
    if x_orig:
        x_orig_clean = re.sub(r"[\[\]]", "", x_orig).strip()
        # If headers disagree, degrade confidence[cite: 1]
        if origin_ip and x_orig_clean != origin_ip:
            confidence = "medium"

    # If everything was trusted or stripped, fail explicitly[cite: 1].
    if not origin_ip:
        confidence = "indeterminate"

    return OriginExtractionResult(
        origin_ip=origin_ip,
        confidence=confidence,
        trace=trace,
    )
