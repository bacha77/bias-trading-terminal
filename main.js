const API_BASE = 'http://127.0.0.1:8000/api';

// Fetch and render breakout scanner data
async function fetchBreakoutScanner() {
    const container = document.getElementById('scanner-results');
    try {
        const response = await fetch(`${API_BASE}/scanner/breakout`);
        const data = await response.json();
        
        container.innerHTML = ''; // clear loading
        
        data.results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'scanner-item';
            
            const signalClass = item.signal.toLowerCase() === 'call' ? 'signal-call' : 'signal-put';
            
            div.innerHTML = `
                <div class="ticker-name">${item.ticker}</div>
                <div class="price-info">
                    <div>$${item.price.toFixed(2)}</div>
                    <div style="font-size: 0.7rem; color: var(--text-dim)">Vol: ${item.volume_multiplier}</div>
                </div>
                <div class="signal-badge ${signalClass}">${item.signal}</div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = `<div class="loading" style="color: var(--neon-red)">Error loading scanner data. Is backend running?</div>`;
        console.error('Scanner error:', error);
    }
}

// Fetch and render Confluence Data (SPY)
async function fetchConfluenceData() {
    try {
        const response = await fetch(`${API_BASE}/market-data/confluence?ticker=SPY`);
        const data = await response.json();
        
        document.getElementById('spy-alignment').innerText = data.overall_alignment;
        document.getElementById('bullish-text').innerText = `Bullish ${data.sentiment_score}%`;
        document.getElementById('bearish-text').innerText = `Bearish ${100 - data.sentiment_score}%`;
        document.getElementById('sentiment-fill').style.width = `${data.sentiment_score}%`;

    } catch (error) {
        console.error('Confluence error:', error);
    }
}

// Handle Backtest Button Click
document.getElementById('run-backtest-btn').addEventListener('click', async () => {
    const btn = document.getElementById('run-backtest-btn');
    const originalText = btn.innerText;
    btn.innerText = 'Testing...';
    btn.disabled = true;

    try {
        const strategy = document.getElementById('bt-strategy').value;
        const timeframe = document.getElementById('bt-timeframe').value;
        
        const response = await fetch(`${API_BASE}/backtest?ticker=QQQ&strategy=${strategy}&timeframe=${timeframe}`);
        const data = await response.json();
        
        document.getElementById('backtest-results').innerHTML = `
            <div class="stat">
                <span class="label">ROI</span>
                <span class="value green">${data.roi}</span>
            </div>
            <div class="stat">
                <span class="label">Sharpe</span>
                <span class="value green">${data.sharpe_ratio}</span>
            </div>
            <div class="stat">
                <span class="label">Drawdown</span>
                <span class="value red">${data.max_drawdown}</span>
            </div>
        `;
    } catch (error) {
        console.error('Backtest error:', error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// Initialize dashboard
async function initDashboard() {
    await Promise.all([
        fetchBreakoutScanner(),
        fetchConfluenceData()
    ]);
    
    // Poll scanner every 30 seconds
    setInterval(fetchBreakoutScanner, 30000);
}

// Run
initDashboard();
