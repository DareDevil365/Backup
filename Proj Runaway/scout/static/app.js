/**
 * RunawayScout — Frontend Logic
 * SSE streaming, skip/pause, source links, progressive results, history, route inputs
 */
let currentMode = 'scrape';
let lastResultId = null;
let currentStreamId = null;

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    restoreInputs();
});

// --- Mode Switching ---
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-mode="${mode}"]`).classList.add('active');
    document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');
    hideResults();
}

// --- LocalStorage backup for inputs ---
function saveInputs() {
    const fields = ['compileCompanies','compileDataPoints','compileInstruction','compileOrigin','compileDest'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) localStorage.setItem('scout_'+id, el.value);
    });
}
function restoreInputs() {
    const fields = ['compileCompanies','compileDataPoints','compileInstruction','compileOrigin','compileDest'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        const saved = localStorage.getItem('scout_'+id);
        if (el && saved) el.value = saved;
    });
}

// --- History ---
async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        const data = await res.json();
        renderHistory(data);
    } catch(e) { console.log('History load failed:', e); }
}

function renderHistory(items) {
    const list = document.getElementById('historyList');
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="history-empty">No past research found.</div>';
        return;
    }
    list.innerHTML = items.map(item => {
        const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
        const companies = Array.isArray(item.companies) ? item.companies.join(', ') : (item.query || item.mode);
        return `<div class="history-item" onclick="loadHistoryItem('${item.id}')">
            <div class="history-meta">
                <span class="history-mode">${item.mode || 'research'}</span>
                <span class="history-date">${date}</span>
            </div>
            <div class="history-title">${escapeHtml(companies).substring(0,80)}</div>
            <div class="history-summary">${escapeHtml((item.summary||'').substring(0,100))}</div>
            <button class="history-delete" onclick="event.stopPropagation();deleteHistory('${item.id}',this)" title="Delete">✕</button>
        </div>`;
    }).join('');
}

async function loadHistoryItem(id) {
    try {
        const res = await fetch(`/api/history/${id}`);
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        lastResultId = data.id;
        switchMode(data.mode || 'compile');
        displayResults(data);
        toggleHistory();
    } catch(e) { alert('Failed to load: '+e.message); }
}

async function deleteHistory(id, btn) {
    if (!confirm('Delete this result?')) return;
    try {
        await fetch(`/api/history/${id}`, {method:'DELETE'});
        btn.closest('.history-item').remove();
    } catch(e) {}
}

function toggleHistory() {
    const sb = document.getElementById('historySidebar');
    sb.classList.toggle('hidden');
    if (!sb.classList.contains('hidden')) loadHistory();
}

// --- Config Modal ---
function showConfigModal() { document.getElementById('configModal').classList.remove('hidden'); }
function hideConfigModal() { document.getElementById('configModal').classList.add('hidden'); }
async function saveConfig() {
    const key = document.getElementById('perplexityKey').value.trim();
    if (!key) return;
    try {
        await fetch('/api/config', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({perplexity_key: key})
        });
        localStorage.setItem('scout_perplexity_configured', '1');
        hideConfigModal();
        alert('Perplexity API key saved!');
    } catch(e) { alert('Failed: '+e.message); }
}

// --- API Calls ---
async function runScrape() {
    const url = document.getElementById('scrapeUrl').value.trim();
    const instruction = document.getElementById('scrapeInstruction').value.trim();
    if (!url) { shakeInput('scrapeUrl'); return; }
    setLoading(true, 'Scraping page and extracting data...');
    try {
        const res = await fetch('/api/scrape', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({url, instruction: instruction||'Extract all relevant data'})
        });
        const data = await res.json();
        lastResultId = data.id;
        displayResults(data);
    } catch(err) { showError(`Request failed: ${err.message}`); }
    finally { setLoading(false); }
}

async function runDiscover() {
    const query = document.getElementById('discoverQuery').value.trim();
    const instruction = document.getElementById('discoverInstruction').value.trim();
    if (!query) { shakeInput('discoverQuery'); return; }
    setLoading(true, 'Researching with AI + Google Search...');
    try {
        const res = await fetch('/api/discover', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({query, instruction: instruction||'Extract all relevant data'})
        });
        const data = await res.json();
        lastResultId = data.id;
        displayResults(data);
    } catch(err) { showError(`Request failed: ${err.message}`); }
    finally { setLoading(false); }
}

async function runCompile() {
    const companiesRaw = document.getElementById('compileCompanies').value.trim();
    const dataPointsRaw = document.getElementById('compileDataPoints').value.trim();
    const instruction = document.getElementById('compileInstruction').value.trim();
    const originCity = document.getElementById('compileOrigin').value.trim();
    const destCity = document.getElementById('compileDest').value.trim();
    if (!companiesRaw || !dataPointsRaw) {
        if (!companiesRaw) shakeInput('compileCompanies');
        if (!dataPointsRaw) shakeInput('compileDataPoints');
        return;
    }
    saveInputs();
    const companies = companiesRaw.split('\n').map(s=>s.trim()).filter(Boolean);
    const dataPoints = dataPointsRaw.split('\n').map(s=>s.trim()).filter(Boolean);
    setLoading(true, `Starting deep research for ${companies.length} companies...`);
    showStreamingResults(companies);
    try {
        const response = await fetch('/api/compile/stream', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({companies, data_points:dataPoints, instruction, origin_city:originCity, dest_city:destCity})
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream:true});
            const events = buffer.split('\n\n');
            buffer = events.pop();
            for (const eb of events) {
                if (!eb.trim()) continue;
                const lines = eb.split('\n');
                let eventType='', eventData='';
                for (const line of lines) {
                    if (line.startsWith('event: ')) eventType = line.substring(7);
                    else if (line.startsWith('data: ')) eventData = line.substring(6);
                }
                if (eventType && eventData) {
                    try { handleStreamEvent(eventType, JSON.parse(eventData)); }
                    catch(e) { console.error('SSE parse error:', e); }
                }
            }
        }
    } catch(err) { showError(`Stream failed: ${err.message}`); }
    finally { setLoading(false); }
}

// --- Skip Company ---
async function skipCompany(company) {
    if (!currentStreamId) return;
    try {
        await fetch(`/api/skip/${currentStreamId}/${encodeURIComponent(company)}`, {method:'POST'});
        updateCompanyTracker(company, 'skipped');
    } catch(e) { console.error('Skip failed:', e); }
}

// --- SSE Stream Event Handlers ---
function handleStreamEvent(type, data) {
    switch(type) {
        case 'status':
            updateProgress(data.message, data.step, data.total);
            if (data.stream_id) currentStreamId = data.stream_id;
            if (data.route && data.route.origin) {
                const rc = document.getElementById('routeCard');
                document.getElementById('routeText').textContent = `Route: ${data.route.origin} → ${data.route.destination}`;
                rc.classList.remove('hidden');
            }
            break;
        case 'progress':
            updateProgress(data.message, data.step, data.total);
            updateCompanyTracker(data.company, 'working');
            break;
        case 'company_done':
            if (data.skipped) {
                updateCompanyTracker(data.company, 'skipped');
            } else {
                updateCompanyTracker(data.company, data.result.success ? 'done' : 'error');
                if (data.result.sources && data.result.sources.length > 0)
                    addSourceCountToTracker(data.company, data.result.sources, []);
                // Show scrape stats
                if (data.result.pages_scraped !== undefined)
                    addScrapeStats(data.company, data.result.pages_scraped, data.result.pages_extracted, data.result.perplexity_sources);
            }
            updateProgress(`Completed ${data.company} (${data.step}/${data.total-1})`, data.step, data.total);
            if (data.table_so_far && data.table_so_far.length > 0) {
                renderTable(data.table_so_far);
                document.getElementById('dataTableCard').classList.remove('hidden');
            }
            // Save partial to localStorage
            localStorage.setItem('scout_partial_data', JSON.stringify(data.table_so_far || []));
            break;
        case 'done':
            lastResultId = data.id;
            currentStreamId = null;
            displayFinalResults(data);
            localStorage.removeItem('scout_partial_data');
            loadHistory();
            break;
    }
}

function showStreamingResults(companies) {
    const section = document.getElementById('resultsSection');
    section.classList.remove('hidden');
    document.getElementById('dataTableCard').classList.remove('hidden');
    document.getElementById('dataTableHead').innerHTML = '';
    document.getElementById('dataTableBody').innerHTML = '';
    const trackerCard = document.getElementById('companyTracker');
    trackerCard.classList.remove('hidden');
    trackerCard.innerHTML = '<h3>Research Progress</h3><div id="trackerList" class="tracker-list"></div>';
    const list = document.getElementById('trackerList');
    companies.forEach(company => {
        const item = document.createElement('div');
        item.className = 'tracker-item pending';
        item.id = `tracker-${slugify(company)}`;
        item.innerHTML = `
            <div class="tracker-dot"></div>
            <span class="tracker-name">${escapeHtml(company)}</span>
            <div class="tracker-actions">
                <button class="btn-skip" onclick="skipCompany('${escapeHtml(company)}')" title="Skip this company">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
                    </svg> Skip
                </button>
            </div>
            <span class="tracker-status">Pending</span>
            <span class="tracker-stats"></span>`;
        list.appendChild(item);
    });
    document.getElementById('summaryCard').classList.add('hidden');
    document.getElementById('sourcesCard').classList.add('hidden');
    document.getElementById('routeCard').classList.add('hidden');
    document.getElementById('rawJson').textContent = 'Streaming results...';
    section.scrollIntoView({behavior:'smooth', block:'start'});
}

function updateCompanyTracker(company, status) {
    if (!company) return;
    const el = document.getElementById(`tracker-${slugify(company)}`);
    if (!el) return;
    el.className = `tracker-item ${status}`;
    const statusEl = el.querySelector('.tracker-status');
    const skipBtn = el.querySelector('.btn-skip');
    const labels = {working:'Deep researching...', done:'Done ✓', error:'Failed', skipped:'Skipped'};
    statusEl.textContent = labels[status] || status;
    if (status !== 'pending' && status !== 'working' && skipBtn) skipBtn.style.display = 'none';
}

function addScrapeStats(company, scraped, extracted, perplexity) {
    const el = document.getElementById(`tracker-${slugify(company)}`);
    if (!el) return;
    const statsEl = el.querySelector('.tracker-stats');
    if (statsEl) {
        let parts = [];
        if (scraped) parts.push(`${scraped} pages scraped`);
        if (extracted) parts.push(`${extracted} with data`);
        if (perplexity) parts.push(`${perplexity} via Perplexity`);
        statsEl.textContent = parts.join(' · ');
    }
}

function addSourceCountToTracker(company, sources, knownRefs) {
    const el = document.getElementById(`tracker-${slugify(company)}`);
    if (!el) return;
    const total = (sources?sources.length:0) + (knownRefs?knownRefs.length:0);
    if (total === 0) return;
    const actionsDiv = el.querySelector('.tracker-actions');
    if (!actionsDiv) return;
    const allUrls = [];
    if (sources) sources.forEach(s => { if (s.url) allUrls.push(s); });
    if (knownRefs) knownRefs.forEach(s => { if (s.url) allUrls.push(s); });
    const btn = document.createElement('button');
    btn.className = 'btn-sources';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> ${total} sources`;
    btn.onclick = () => showSourcesPopup(company, allUrls);
    actionsDiv.insertBefore(btn, actionsDiv.firstChild);
}

function showSourcesPopup(company, sources) {
    const existing = document.getElementById('sourcesPopup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'sourcesPopup';
    popup.className = 'sources-popup';
    popup.innerHTML = `<div class="sources-popup-inner">
        <div class="sources-popup-header"><h3>Sources for ${escapeHtml(company)}</h3>
        <button class="popup-close" onclick="document.getElementById('sourcesPopup').remove()">&times;</button></div>
        <div class="sources-popup-list">${sources.map((s,i) => `
            <a href="${escapeHtml(s.url)}" target="_blank" class="popup-source-item">
                <span class="popup-source-num">${i+1}</span>
                <div><div class="popup-source-title">${escapeHtml(s.title||s.url)}</div>
                <div class="popup-source-url">${escapeHtml(s.url)}</div></div>
            </a>`).join('')}</div></div>`;
    document.body.appendChild(popup);
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
}

function updateProgress(message, step, total) {
    document.getElementById('progressText').textContent = message;
    if (total > 0) document.getElementById('progressBar').style.width = Math.round((step/total)*100)+'%';
}

function displayFinalResults(data) {
    const summaryCard = document.getElementById('summaryCard');
    let summaryText = data.summary || 'Research complete.';
    if (data.confidence) summaryText += ` (Confidence: ${data.confidence})`;
    document.getElementById('summaryText').textContent = summaryText;
    summaryCard.classList.remove('hidden');
    const allSources = data.sources || [];
    if (data.source_urls) {
        data.source_urls.forEach(url => {
            if (typeof url==='string' && !allSources.find(s=>(s.url||s)===url))
                allSources.push({title:url, url:url});
        });
    }
    if (allSources.length > 0) { renderSources(allSources); document.getElementById('sourcesCard').classList.remove('hidden'); }
    const tableData = data.merged_data || data.data;
    if (tableData) { renderTable(tableData); document.getElementById('dataTableCard').classList.remove('hidden'); }
    document.getElementById('btnExport').style.display = (data.id && tableData) ? 'inline-flex' : 'none';
    document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);
}

function displayResults(data) {
    const section = document.getElementById('resultsSection');
    section.classList.remove('hidden');
    document.getElementById('companyTracker').classList.add('hidden');
    document.getElementById('routeCard').classList.add('hidden');
    const summaryCard = document.getElementById('summaryCard');
    let summaryText = data.summary || (data.success ? 'Data extracted successfully.' : `Error: ${data.error||'Unknown error'}`);
    if (data.confidence) summaryText += ` (Confidence: ${data.confidence})`;
    if (data.notes) summaryText += `\n${data.notes}`;
    document.getElementById('summaryText').textContent = summaryText;
    summaryCard.classList.remove('hidden');
    const allSources = data.sources || [];
    if (data.source_urls && data.source_urls.length > 0) {
        data.source_urls.forEach(url => {
            if (typeof url==='string' && !allSources.find(s=>(s.url||s)===url))
                allSources.push({title:url, url:url});
        });
    }
    if (allSources.length > 0) { renderSources(allSources); document.getElementById('sourcesCard').classList.remove('hidden'); }
    else document.getElementById('sourcesCard').classList.add('hidden');
    const tableData = data.merged_data || data.data;
    if (tableData) { renderTable(tableData); document.getElementById('dataTableCard').classList.remove('hidden'); }
    else document.getElementById('dataTableCard').classList.add('hidden');
    document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);
    document.getElementById('btnExport').style.display = (data.id && tableData) ? 'inline-flex' : 'none';
    section.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderSources(sources) {
    const list = document.getElementById('sourcesList');
    list.innerHTML = '';
    sources.forEach((s, idx) => {
        const title = (typeof s==='string') ? s : (s.title||'Source');
        const url = (typeof s==='string') ? s : (s.url||s.uri||'');
        const item = document.createElement('div');
        item.className = 'source-item';
        item.innerHTML = `<div class="source-score score-high">${idx+1}</div>
            <div class="source-info"><div class="source-title">${escapeHtml(title)}</div>
            ${url ? `<a href="${escapeHtml(url)}" target="_blank" class="source-url">${escapeHtml(url)}</a>` : ''}</div>`;
        list.appendChild(item);
    });
}

function renderTable(data) {
    const thead = document.getElementById('dataTableHead');
    const tbody = document.getElementById('dataTableBody');
    thead.innerHTML = ''; tbody.innerHTML = '';
    let rows = [];
    if (Array.isArray(data)) rows = data;
    else if (typeof data==='object') {
        for (const key of ['merged_data','companies','results','data','rates','pricing','items']) {
            if (data[key] && Array.isArray(data[key])) { rows = data[key]; break; }
        }
        if (rows.length===0) rows = [data];
    }
    if (rows.length===0) return;
    const skipKeys = new Set(['source_urls','sources','data_sources','raw_data','_source_url']);
    rows = rows.map(row => {
        if (typeof row!=='object' || row===null) return row;
        const flat = {};
        for (const [k,v] of Object.entries(row)) {
            if (skipKeys.has(k)) continue;
            if (typeof v==='object' && v!==null && !Array.isArray(v)) {
                for (const [subK,subV] of Object.entries(v)) flat[`${k} - ${subK}`] = subV;
            } else flat[k] = v;
        }
        return flat;
    });
    const allKeys = new Set();
    rows.forEach(row => { if (typeof row==='object' && row!==null) Object.keys(row).forEach(k=>allKeys.add(k)); });
    let keys = Array.from(allKeys);
    if (keys.includes('company')) keys = ['company', ...keys.filter(k=>k!=='company')];
    const headerRow = document.createElement('tr');
    keys.forEach(key => { const th = document.createElement('th'); th.textContent = formatKey(key); headerRow.appendChild(th); });
    const thSrc = document.createElement('th'); thSrc.textContent = 'Sources'; headerRow.appendChild(thSrc);
    thead.appendChild(headerRow);
    rows.forEach((row, rowIdx) => {
        if (typeof row!=='object' || row===null) return;
        const tr = document.createElement('tr');
        tr.style.animation = `fadeIn 0.3s ease ${rowIdx*0.1}s both`;
        const originalRow = Array.isArray(data) ? data[rowIdx] : null;
        const rowSources = originalRow ? (originalRow.source_urls || []) : [];
        keys.forEach(key => {
            const td = document.createElement('td');
            const val = row[key];
            if (val===null || val===undefined) { td.textContent = '\u2014'; td.style.color = 'var(--text-muted)'; }
            else if (Array.isArray(val)) { td.textContent = val.join(', '); td.style.fontSize = '0.78rem'; }
            else if (typeof val==='object') { td.textContent = JSON.stringify(val); td.style.fontSize = '0.75rem'; }
            else td.textContent = String(val);
            tr.appendChild(td);
        });
        const tdSrc = document.createElement('td');
        if (rowSources.length > 0) {
            const btn = document.createElement('button');
            btn.className = 'btn-table-sources';
            btn.innerHTML = `🔗 ${rowSources.length}`;
            btn.onclick = () => showSourcesPopup(row.company||`Row ${rowIdx+1}`, rowSources.map(u=>({url:u,title:u})));
            tdSrc.appendChild(btn);
        } else { tdSrc.textContent = '\u2014'; tdSrc.style.color = 'var(--text-muted)'; }
        tr.appendChild(tdSrc);
        tbody.appendChild(tr);
    });
}

// --- Export ---
async function exportCSV() {
    if (!lastResultId) { downloadTableAsCSV(); return; }
    try {
        const res = await fetch(`/api/export/${lastResultId}`);
        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = `scout_export_${lastResultId}.csv`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        } else downloadTableAsCSV();
    } catch { downloadTableAsCSV(); }
}

function downloadTableAsCSV() {
    const table = document.getElementById('dataTable');
    if (!table) return;
    let csv = '';
    table.querySelectorAll('tr').forEach(row => {
        const cols = row.querySelectorAll('th, td');
        csv += Array.from(cols).map(c=>`"${c.textContent.replace(/"/g,'""')}"`).join(',')+'\n';
    });
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='scout_export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// --- UI Helpers ---
function setLoading(loading, message='Processing...') {
    const progress = document.getElementById('progressSection');
    const bar = document.getElementById('progressBar');
    const statusBadge = document.getElementById('statusBadge');
    document.querySelectorAll('.btn-primary').forEach(btn=>btn.disabled=loading);
    if (loading) {
        progress.classList.remove('hidden');
        document.getElementById('progressText').textContent = message;
        bar.style.width = '5%';
        statusBadge.innerHTML = '<span class="spinner" style="width:12px;height:12px;border-width:1.5px;"></span> Working...';
        statusBadge.style.color = 'var(--amber)';
        statusBadge.style.background = 'var(--amber-dim)';
        if (currentMode !== 'compile') {
            let pct = 5;
            window._progressInterval = setInterval(()=>{ pct=Math.min(pct+Math.random()*5,90); bar.style.width=pct+'%'; },800);
        }
    } else {
        clearInterval(window._progressInterval);
        bar.style.width = '100%';
        setTimeout(()=>{ progress.classList.add('hidden'); bar.style.width='0%'; },500);
        statusBadge.innerHTML = '<span class="status-dot"></span> Ready';
        statusBadge.style.color = 'var(--green)';
        statusBadge.style.background = 'var(--green-dim)';
    }
}

function hideResults() {
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('companyTracker').classList.add('hidden');
}

function showError(message) {
    const section = document.getElementById('resultsSection');
    section.classList.remove('hidden');
    document.getElementById('summaryCard').classList.remove('hidden');
    document.getElementById('summaryText').textContent = 'Error: ' + message;
    document.getElementById('sourcesCard').classList.add('hidden');
    document.getElementById('dataTableCard').classList.add('hidden');
    document.getElementById('companyTracker').classList.add('hidden');
}

function shakeInput(id) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--red)';
    el.style.animation = 'shake 0.4s ease';
    el.focus();
    setTimeout(()=>{ el.style.borderColor=''; el.style.animation=''; },600);
}

function formatKey(key) { return key.replace(/_/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase()); }
function escapeHtml(str) { const div=document.createElement('div'); div.textContent=str; return div.innerHTML; }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

// Inject animations
const style = document.createElement('style');
style.textContent = `
@keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-6px); } 75% { transform:translateX(6px); } }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
`;
document.head.appendChild(style);
