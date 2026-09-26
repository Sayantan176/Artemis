let map;
let infraLayer;
let semanticLayer;
let currentProfile = null;
let currentRaw = null;

// Initialize Map
function initMap() {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_332m_1_23cc1144485231b6779bca53', {
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    // Invalidate size after a slight delay to ensure container is rendered
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

// Fetch samples
async function loadSamples() {
    try {
        const res = await fetch('/api/samples');
        const data = await res.json();
        const container = document.getElementById('sample-container');
        
        data.samples.forEach(sample => {
            const btn = document.createElement('button');
            btn.className = 'px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-mono text-slate-300 transition-colors';
            btn.textContent = sample;
            btn.onclick = () => runAnalysis('sample', sample);
            container.appendChild(btn);
        });
    } catch (e) {
        console.error('Failed to load samples', e);
    }
}

// Drag & Drop
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-cyan-500', 'bg-slate-800');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-cyan-500', 'bg-slate-800');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-cyan-500', 'bg-slate-800');
    if (e.dataTransfer.files.length) {
        runAnalysis('upload', null, e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        runAnalysis('upload', null, e.target.files[0]);
    }
});

// Trace Table Toggle
document.getElementById('toggle-trace').addEventListener('click', () => {
    const table = document.getElementById('trace-table');
    const icon = document.getElementById('trace-icon');
    table.classList.toggle('hidden');
    if (table.classList.contains('hidden')) {
        icon.style.transform = 'rotate(0deg)';
    } else {
        icon.style.transform = 'rotate(180deg)';
    }
});

// View Raw
document.getElementById('btn-raw').addEventListener('click', () => {
    document.getElementById('raw-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('raw-drawer').classList.remove('translate-x-full');
    }, 10);
});

document.getElementById('close-raw').addEventListener('click', () => {
    document.getElementById('raw-drawer').classList.add('translate-x-full');
    setTimeout(() => {
        document.getElementById('raw-modal').classList.add('hidden');
    }, 300);
});

// Download JSON
document.getElementById('btn-export').addEventListener('click', () => {
    if (!currentProfile) return;
    const blob = new Blob([JSON.stringify(currentProfile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origin_profile_${currentProfile.email_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Copy IP
document.getElementById('copy-ip').addEventListener('click', () => {
    const ip = document.getElementById('res-ip').textContent;
    if (ip && ip !== '-') {
        navigator.clipboard.writeText(ip);
        const icon = document.getElementById('copy-ip').innerHTML;
        document.getElementById('copy-ip').innerHTML = '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        setTimeout(() => {
            document.getElementById('copy-ip').innerHTML = icon;
        }, 2000);
    }
});

function resetUI() {
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('cloud-warning').classList.add('hidden');
    document.getElementById('map-overlay').classList.add('hidden');
    
    // Clear map layers
    if (infraLayer) map.removeLayer(infraLayer);
    if (semanticLayer) map.removeLayer(semanticLayer);
    infraLayer = null;
    semanticLayer = null;
    
    // Start progress
    document.getElementById('progress-container').classList.remove('hidden');
    const bar = document.getElementById('progress-bar');
    bar.style.width = '0%';
    
    // Fake progress animation
    let w = 0;
    const interval = setInterval(() => {
        w += Math.random() * 15;
        if (w > 90) clearInterval(interval);
        bar.style.width = Math.min(w, 90) + '%';
        
        // Highlight steps based on width
        if (w > 20) document.getElementById('step-1').classList.replace('text-slate-500', 'text-cyan-400');
        if (w > 40) document.getElementById('step-2').classList.replace('text-slate-500', 'text-cyan-400');
        if (w > 60) document.getElementById('step-3').classList.replace('text-slate-500', 'text-cyan-400');
        if (w > 80) document.getElementById('step-4').classList.replace('text-slate-500', 'text-cyan-400');
    }, 500);
    
    return interval;
}

async function runAnalysis(type, filename = null, file = null) {
    const interval = resetUI();
    
    try {
        let res;
        
        if (type === 'sample') {
            res = await fetch(`/api/analyze-sample/${filename}`, { method: 'POST' });
            // Let's also fetch the raw file content to show in the raw viewer
            const rawRes = await fetch(`/${filename}`); // Wait, this might not be served. Let's rely on the upload or we just don't have it.
            // Actually, we can fetch it if we mount the root or we can just ignore it for now.
        } else {
            const formData = new FormData();
            formData.append('file', file);
            res = await fetch('/api/analyze', { method: 'POST', body: formData });
            
            // Read file for raw content
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('raw-content').textContent = e.target.result;
            };
            reader.readAsText(file);
        }
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Analysis failed');
        }
        
        const data = await res.json();
        currentProfile = data;
        
        // Finish progress
        clearInterval(interval);
        document.getElementById('progress-bar').style.width = '100%';
        document.getElementById('step-4').classList.replace('text-slate-500', 'text-cyan-400');
        
        setTimeout(() => {
            document.getElementById('progress-container').classList.add('hidden');
            populateUI(data);
        }, 500);
        
    } catch (e) {
        clearInterval(interval);
        alert(`Error: ${e.message}`);
        document.getElementById('progress-container').classList.add('hidden');
    }
}

async function populateUI(data) {
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('map-overlay').classList.remove('hidden');
    map.invalidateSize();
    
    const ext = data.extraction;
    const geo = data.geolocation || {};
    const rep = data.ip_reputation || {};
    const asn = data.asn || {};
    const dom = data.domain || {};
    const llm = data.llm_prediction || {};
    
    // Key Metrics
    document.getElementById('res-ip').textContent = ext.origin_ip || 'UNKNOWN';
    document.getElementById('res-conf').textContent = `CONF: ${ext.confidence.toUpperCase()}`;
    
    const isHighConf = ext.confidence.toLowerCase() === 'high';
    document.getElementById('res-conf').className = `px-2 py-0.5 rounded border text-xs font-mono ${isHighConf ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-amber-900/30 border-amber-800 text-amber-400'}`;
    
    document.getElementById('res-country').innerHTML = llm.predicted_country 
        ? `${llm.predicted_country} ${llm.predicted_country !== 'Unknown' ? '📍' : ''}`
        : 'UNKNOWN';
        
    document.getElementById('res-sem-conf').textContent = `SEMANTIC: ${llm.confidence_score ? llm.confidence_score.toUpperCase() : '-'}`;
    if (llm.web_search_used) {
        document.getElementById('res-rag').classList.remove('hidden');
    } else {
        document.getElementById('res-rag').classList.add('hidden');
    }
    
    // Reasoning
    document.getElementById('res-reasoning').textContent = llm.reasoning || 'No reasoning provided.';
    
    // Network
    document.getElementById('res-city').textContent = geo.city || '-';
    document.getElementById('res-region').textContent = geo.region || '-';
    document.getElementById('res-asn').textContent = asn.asn ? `AS${asn.asn}` : '-';
    document.getElementById('res-org').textContent = asn.asn_org || '-';
    document.getElementById('res-type').textContent = asn.asn_type ? asn.asn_type.toUpperCase() : '-';
    
    // Flags
    const flagsDiv = document.getElementById('res-flags');
    flagsDiv.innerHTML = '';
    
    let isCloud = rep.is_datacenter || asn.asn_type === 'datacenter';
    let hasFlags = false;
    
    if (rep.is_vpn) { flagsDiv.innerHTML += `<span class="px-2 py-1 rounded bg-rose-900/50 border border-rose-800 text-rose-400 text-xs font-mono">VPN</span>`; hasFlags = true; }
    if (rep.is_tor) { flagsDiv.innerHTML += `<span class="px-2 py-1 rounded bg-rose-900/50 border border-rose-800 text-rose-400 text-xs font-mono">TOR</span>`; hasFlags = true; }
    if (rep.is_proxy) { flagsDiv.innerHTML += `<span class="px-2 py-1 rounded bg-amber-900/50 border border-amber-800 text-amber-400 text-xs font-mono">PROXY</span>`; hasFlags = true; }
    if (rep.is_datacenter) { flagsDiv.innerHTML += `<span class="px-2 py-1 rounded bg-amber-900/50 border border-amber-800 text-amber-400 text-xs font-mono">DATACENTER</span>`; hasFlags = true; }
    
    if (!hasFlags) {
        flagsDiv.innerHTML = `<span class="px-2 py-1 rounded bg-emerald-900/30 border border-emerald-800 text-emerald-400 text-xs font-mono">CLEAN</span>`;
    }
    
    if (isCloud) {
        document.getElementById('cloud-warning').classList.remove('hidden');
    }
    
    // Domain
    document.getElementById('res-domain').textContent = dom.domain || '-';
    const ageEl = document.getElementById('res-age');
    ageEl.textContent = dom.domain_age_days ? `${dom.domain_age_days} days` : '-';
    if (dom.domain_age_days && dom.domain_age_days < 30) {
        ageEl.classList.add('text-rose-400', 'font-bold');
    } else {
        ageEl.classList.remove('text-rose-400', 'font-bold');
    }
    
    document.getElementById('res-spf').textContent = `SPF: ${dom.spf_present ? 'PASS' : 'FAIL'}`;
    document.getElementById('res-spf').className = `px-1.5 py-0.5 rounded text-xs font-mono ${dom.spf_present ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`;
    
    document.getElementById('res-dmarc').textContent = `DMARC: ${dom.dmarc_present ? 'PASS' : 'FAIL'}`;
    document.getElementById('res-dmarc').className = `px-1.5 py-0.5 rounded text-xs font-mono ${dom.dmarc_present ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`;
    
    // Origin IP Intelligence Table
    const asnStr = asn.asn ? `AS${asn.asn}` : '';
    const orgStr = asn.asn_org || '';
    const ispStr = (asnStr || orgStr) ? `${asnStr} ${orgStr}`.trim() : '-';
    document.getElementById('intel-isp').textContent = ispStr;
    document.getElementById('intel-dc').textContent = rep.is_datacenter ? 'Yes' : 'No';
    document.getElementById('intel-vpn').textContent = rep.is_vpn ? 'Yes' : 'No';
    document.getElementById('intel-proxy').textContent = rep.is_proxy ? 'Yes' : 'No';

    // Trace Table
    const tbody = document.getElementById('trace-body');
    tbody.innerHTML = '';
    
    // Reverse trace to show latest hops first
    const traces = [...ext.trace].reverse();
    traces.forEach(t => {
        const tr = document.createElement('tr');
        const isTrusted = t.is_trusted;
        
        tr.innerHTML = `
            <td class="py-2 align-top text-slate-400">[${t.hop_index}]</td>
            <td class="py-2 align-top ${isTrusted ? 'text-slate-500' : 'text-cyan-400 font-bold'}">${t.extracted_ip || '-'}</td>
            <td class="py-2 align-top">
                <span class="px-1.5 py-0.5 rounded text-[10px] ${isTrusted ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}">
                    ${isTrusted ? 'TRUSTED' : 'UNTRUSTED'}
                </span>
            </td>
            <td class="py-2 align-top text-slate-500 text-[10px] pr-2 break-words max-w-[200px]">${t.reason || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Map markers
    let mapBounds = [];
    
    if (geo.latitude && geo.longitude) {
        const infraIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="marker-pulse-infra"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        
        infraLayer = L.marker([geo.latitude, geo.longitude], {icon: infraIcon}).addTo(map);
        infraLayer.bindPopup(`
            <div class="mb-1"><span class="text-cyan-400">INFRA NODE</span></div>
            <div>IP: ${ext.origin_ip}</div>
            <div>ASN: ${asn.asn_org || 'Unknown'}</div>
            <div>TYPE: ${isCloud ? 'Cloud/Datacenter' : 'Residential/ISP'}</div>
        `);
        mapBounds.push([geo.latitude, geo.longitude]);
        document.getElementById('map-loc').textContent = `${geo.country || geo.city || '-'} (${isCloud ? 'CLOUD' : 'ISP'})`;
    } else {
        document.getElementById('map-loc').textContent = 'NO DATA';
    }
    
    document.getElementById('map-sem').textContent = llm.predicted_country ? llm.predicted_country.toUpperCase() : 'UNKNOWN';
    
    // Geocode semantic country if it exists and isn't "Unknown"
    if (llm.predicted_country && llm.predicted_country.toLowerCase() !== 'unknown') {
        try {
            const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(llm.predicted_country)}`);
            const geocodeData = await geocodeRes.json();
            
            if (geocodeData && geocodeData.length > 0) {
                const lat = parseFloat(geocodeData[0].lat);
                const lon = parseFloat(geocodeData[0].lon);
                
                const semIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: '<div class="marker-pulse-semantic"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });
                
                semanticLayer = L.marker([lat, lon], {icon: semIcon}).addTo(map);
                semanticLayer.bindPopup(`
                    <div class="mb-1"><span class="text-rose-400">OSINT ATTRIBUTION</span></div>
                    <div>${llm.predicted_country}</div>
                `);
                mapBounds.push([lat, lon]);
                
                // Draw a line between infra and true origin if they differ significantly
                if (geo.latitude && geo.longitude && isCloud) {
                    const latlngs = [
                        [geo.latitude, geo.longitude],
                        [lat, lon]
                    ];
                    L.polyline(latlngs, {color: '#64748b', dashArray: '5, 10', weight: 2, opacity: 0.5}).addTo(map);
                }
            }
        } catch (e) {
            console.error("Geocoding failed", e);
        }
    }
    
    if (mapBounds.length > 0) {
        if (mapBounds.length === 1) {
            map.flyTo(mapBounds[0], 5, { duration: 1.5 });
        } else {
            map.flyToBounds(L.latLngBounds(mapBounds).pad(0.5), { duration: 1.5 });
        }
    }
}

// Init
window.onload = () => {
    initMap();
    loadSamples();
};
