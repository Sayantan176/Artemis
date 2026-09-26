import argparse
import os
import sys
from pathlib import Path

import geoip2.database
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from enrichers import NetworkEnricher
from orchestrator import OriginTraceabilityService

def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract origin IP and enrich metadata from an .eml email file."
    )
    parser.add_argument(
        "eml_path",
        nargs="?",
        default="sample.eml",
        help="Path to the .eml file to analyze (defaults to 'sample.eml')",
    )
    return parser.parse_args()

def load_eml_content(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Email file not found: {file_path}")
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()

def display_profile(console: Console, profile):
    console.print(Panel.fit("[bold white]🕵️‍♂️ Origin Traceability Report[/bold white]", border_style="blue"))

    # 1. Extraction Summary Table
    extract_table = Table(show_header=True, header_style="bold magenta")
    extract_table.add_column("Field")
    extract_table.add_column("Value")
    extract_table.add_row("Email ID", profile.email_id)
    extract_table.add_row("Origin IP", f"[bold cyan]{profile.extraction.origin_ip}[/bold cyan]")
    
    conf = profile.extraction.confidence
    conf_color = "green" if conf == "high" else "yellow" if conf == "medium" else "red"
    extract_table.add_row("Confidence", f"[{conf_color}]{conf.upper()}[/{conf_color}]")
    console.print(extract_table)

    # 2. Trace Audit Table
    trace_table = Table(title="Header Trace Audit (Chronological)", show_header=True, header_style="bold cyan")
    trace_table.add_column("Hop")
    trace_table.add_column("Extracted IP")
    trace_table.add_column("Trusted?")
    trace_table.add_column("Reason / Classifier")
    
    for hop in profile.extraction.trace:
        trusted_str = "[green]Yes[/green]" if hop.is_trusted else "[bold red]No[/bold red]"
        trace_table.add_row(
            str(hop.hop_index), 
            str(hop.extracted_ip) if hop.extracted_ip else "None", 
            trusted_str, 
            hop.reason
        )
    console.print(trace_table)
    
    # 3. Geolocation & ASN Table
    geo = profile.geolocation
    asn = profile.asn
    if geo and geo.country:
        geo_table = Table(title="Physical Origin & Network (MaxMind)", show_header=True, header_style="bold blue")
        geo_table.add_column("Country")
        geo_table.add_column("City")
        geo_table.add_column("Coordinates")
        geo_table.add_column("ASN")
        geo_table.add_column("Network Org")
        
        geo_table.add_row(
            str(geo.country),
            str(geo.city) if geo.city else "Unknown",
            f"{geo.latitude}, {geo.longitude}" if geo.latitude else "Unknown",
            f"AS{asn.asn}" if asn and asn.asn else "Unknown",
            str(asn.asn_org) if asn and asn.asn_org else "Unknown"
        )
        console.print(geo_table)

        # Analyst Warning for Cloud/Webmail Privacy Masking
        if asn and asn.asn_org:
            org_lower = asn.asn_org.lower()
            if any(provider in org_lower for provider in ["google", "microsoft", "amazon", "apple", "cloudflare"]):
                console.print(
                    Panel(
                        "[bold yellow]⚠️ Analyst Warning: Origin IP belongs to a major cloud/webmail provider. "
                        "The true end-user physical location may be masked by provider privacy routing or webmail infrastructure.[/bold yellow]",
                        border_style="yellow"
                    )
                )

    # 4. IP Reputation Table
    rep = profile.ip_reputation
    if rep and rep.provider_name:
        rep_table = Table(title="Origin IP Intelligence", show_header=True, header_style="bold red")
        rep_table.add_column("Provider / ISP")
        rep_table.add_column("Datacenter?")
        rep_table.add_column("VPN?")
        rep_table.add_column("Proxy?")
        
        rep_table.add_row(
            str(rep.provider_name),
            "[red]Yes[/red]" if rep.is_datacenter else "No",
            "[red]Yes[/red]" if rep.is_vpn else "No",
            "[red]Yes[/red]" if rep.is_proxy else "No"
        )
        console.print(rep_table)

    # 5. Domain Profile Table
    dom = profile.domain
    if dom:
        dom_table = Table(title="Claimed Sender Domain", show_header=True, header_style="bold green")
        dom_table.add_column("Domain")
        dom_table.add_column("Registrar")
        dom_table.add_column("Age (Days)")
        dom_table.add_column("SPF Present")
        dom_table.add_column("DMARC Present")
        
        age_str = str(dom.domain_age_days)
        if dom.domain_age_days is not None and dom.domain_age_days < 30:
            age_str = f"[bold red]{age_str} (NEW)[/bold red]"

        dom_table.add_row(
            str(dom.domain),
            str(dom.registrar),
            age_str,
            "[green]Yes[/green]" if dom.spf_present else "[red]No[/red]",
            "[green]Yes[/green]" if dom.dmarc_present else "[red]No[/red]"
        )
        console.print(dom_table)

    # 6. LLM Contextual Analysis Table
    llm = profile.llm_prediction
    if llm:
        llm_table = Table(title="OSINT Contextual Attribution (Groq LLM)", show_header=True, header_style="bold yellow")
        llm_table.add_column("Predicted Country", justify="left")
        llm_table.add_column("Confidence", justify="center")
        llm_table.add_column("Web Search Fallback", justify="center")
        llm_table.add_column("Reasoning", justify="left")
        
        conf_color = "green" if llm.confidence_score.lower() == "high" else "yellow" if llm.confidence_score.lower() == "medium" else "red"
        
        # Display whether web search was used
        web_search_str = "[bold cyan]Yes[/bold cyan]" if llm.web_search_used else "[dim]No[/dim]"
        
        llm_table.add_row(
            f"[bold yellow]{llm.predicted_country}[/bold yellow]",
            f"[{conf_color}]{llm.confidence_score.upper()}[/{conf_color}]",
            web_search_str,
            str(llm.reasoning)
        )
        console.print(llm_table)
        console.print("\n")

if __name__ == "__main__":
    args = parse_args()
    console = Console()

    try:
        raw_email = load_eml_content(args.eml_path)
    except FileNotFoundError as err:
        console.print(f"[bold red]Error:[/bold red] {err}")
        sys.exit(1)

    console.print(f"\n[bold yellow]Analyzing file:[/bold yellow] [cyan]{args.eml_path}[/cyan]")
    console.print("[bold yellow]Initializing Enrichers...[/bold yellow]")
    
    city_db = None
    asn_db = None
    try:
        if os.path.exists("GeoLite2-City.mmdb"):
            city_db = geoip2.database.Reader("GeoLite2-City.mmdb")
        if os.path.exists("GeoLite2-ASN.mmdb"):
            asn_db = geoip2.database.Reader("GeoLite2-ASN.mmdb")
    except Exception as e:
        console.print(f"[bold red]MaxMind load error:[/bold red] {e}")
    
    enricher = NetworkEnricher(redis_client=None, geoip_city_db=city_db, geoip_asn_db=asn_db)
    service = OriginTraceabilityService(enricher=enricher)

    email_id = Path(args.eml_path).stem
    profile = service.build_origin_profile(email_id=email_id, raw_email=raw_email)

    display_profile(console, profile)
    
    if city_db: city_db.close()
    if asn_db: asn_db.close()
