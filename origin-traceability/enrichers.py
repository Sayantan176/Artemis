import os
import json
from datetime import datetime
from typing import Optional
import warnings

import requests
import dns.resolver
import whois
from dotenv import load_dotenv

from ot_models import ASNProfile, DomainProfile, GeoSnapshot, ReputationSnapshot

# Suppress annoying whois socket timeout warnings in the terminal
warnings.filterwarnings("ignore", category=UserWarning, module="whois")

# Load environment variables from the .env file
load_dotenv()
IPINFO_TOKEN = os.getenv("IPINFO_TOKEN")

class NetworkEnricher:
    def __init__(self, redis_client=None, geoip_city_db=None, geoip_asn_db=None):
        self.redis = redis_client
        self.city_db = geoip_city_db
        self.asn_db = geoip_asn_db

    def geolocate(self, ip: str) -> GeoSnapshot:
        """Looks up IP location using MaxMind. Fails gracefully if DB is missing."""
        if not self.city_db:
            return GeoSnapshot()

        try:
            record = self.city_db.city(ip)
            return GeoSnapshot(
                country=record.country.iso_code,
                region=record.subdivisions.most_specific.name if record.subdivisions else None,
                city=record.city.name,
                latitude=record.location.latitude,
                longitude=record.location.longitude,
                accuracy_radius_km=record.location.accuracy_radius,
            )
        except Exception:
            return GeoSnapshot()

    def check_ip_reputation(self, ip: str) -> ReputationSnapshot:
        """Calls IPinfo.io to detect VPNs, Proxies, and organization info."""
        cache_key = f"ip_rep:{ip}"
        
        if self.redis:
            cached = self.redis.get(cache_key)
            if cached:
                return ReputationSnapshot(**json.loads(cached))

        reputation = ReputationSnapshot()
        
        # DEBUG: Check if the token is loaded
        if not IPINFO_TOKEN:
            print("DEBUG: No IPINFO_TOKEN found! Check your .env file.")
            return reputation
            
        try:
            print(f"DEBUG: Calling IPinfo API for IP {ip}...")
            url = f"https://ipinfo.io/{ip}/json?token={IPINFO_TOKEN}"
            response = requests.get(url, timeout=5)
            
            print(f"DEBUG: API Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # IPinfo groups VPN/proxy data under a 'privacy' object
                privacy = data.get("privacy", {})
                org_name = data.get("org", "")
                
                is_dc = privacy.get("hosting", False)
                if not is_dc and any(cloud in org_name.lower() for cloud in ["amazon", "google", "digitalocean", "ovh", "azure", "hetzner"]):
                    is_dc = True

                reputation = ReputationSnapshot(
                    is_vpn=privacy.get("vpn", False),
                    is_tor=privacy.get("tor", False),
                    is_proxy=privacy.get("proxy", False),
                    is_datacenter=is_dc, 
                    provider_name=org_name,
                    threat_score=None,
                )
            else:
                print(f"DEBUG: IPinfo returned error status. Response: {response.text}")
        except Exception as e:
            print(f"DEBUG: IPinfo API connection error for {ip}: {e}")

        # Save to Redis for 24 hours if configured
        if self.redis and reputation.provider_name is not None:
            self.redis.setex(cache_key, 86400, reputation.model_dump_json())

        return reputation

    def asn_lookup(self, ip: str) -> ASNProfile:
        """Resolves IP to Autonomous System Number and Organization."""
        if not self.asn_db:
            return ASNProfile()

        try:
            record = self.asn_db.asn(ip)
            asn_org = record.autonomous_system_organization or ""
            
            asn_type = "residential"
            if any(cloud in asn_org.lower() for cloud in ["amazon", "digitalocean", "ovh", "google", "azure", "hetzner"]):
                asn_type = "datacenter"

            return ASNProfile(
                asn=record.autonomous_system_number,
                asn_org=asn_org,
                asn_type=asn_type,
            )
        except Exception:
            return ASNProfile()

    def domain_profile(self, domain: str) -> DomainProfile:
        """Profiles the sender domain using DNS and WHOIS."""
        mx_records = []
        spf_present = False
        dmarc_present = False

        try:
            answers = dns.resolver.resolve(domain, "MX")
            mx_records = [rdata.exchange.to_text().rstrip(".") for rdata in answers]
        except Exception:
            pass

        try:
            txt_answers = dns.resolver.resolve(domain, "TXT")
            for rdata in txt_answers:
                if "v=spf1" in rdata.to_text():
                    spf_present = True
                    break
        except Exception:
            pass

        try:
            dmarc_answers = dns.resolver.resolve(f"_dmarc.{domain}", "TXT")
            for rdata in dmarc_answers:
                if "v=DMARC1" in rdata.to_text():
                    dmarc_present = True
                    break
        except Exception:
            pass

        creation_date = None
        registrar = None
        domain_age_days = None

        try:
            w = whois.whois(domain)
            registrar = w.registrar
            raw_date = w.creation_date
            
            if isinstance(raw_date, list):
                raw_date = raw_date[0]
                
            # FIX: Explicitly parse the specific date string Namecheap sends
            if isinstance(raw_date, datetime):
                creation_date = raw_date
            elif isinstance(raw_date, str):
                try:
                    # Try parsing Namecheap's exact format first
                    creation_date = datetime.strptime(raw_date, "%Y-%m-%dT%H:%M:%SZ")
                except ValueError:
                    # Fallback for standard ISO formats
                    try:
                        clean_date = raw_date.replace("Z", "+00:00")
                        creation_date = datetime.fromisoformat(clean_date)
                    except ValueError:
                        pass
            
            # Strip timezone info so we can subtract it from utcnow()
            if creation_date and creation_date.tzinfo:
                creation_date = creation_date.replace(tzinfo=None)

            if creation_date:
                domain_age_days = (datetime.utcnow() - creation_date).days
        except Exception:
            pass

        return DomainProfile(
            domain=domain,
            registrar=registrar,
            creation_date=creation_date,
            domain_age_days=domain_age_days,
            mx_records=mx_records,
            spf_present=spf_present,
            dmarc_present=dmarc_present,
        )
