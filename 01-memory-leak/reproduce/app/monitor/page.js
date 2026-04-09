export default function MonitorPage() {
  return (
    <html>
      <head>
        <title>Memory Monitor</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #0f0f0f; color: #e0e0e0; font-family: monospace; padding: 24px; }
          h1 { font-size: 16px; color: #888; margin-bottom: 4px; }
          h2 { font-size: 24px; color: #fff; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
          .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; }
          .card label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .card .value { font-size: 32px; font-weight: bold; color: #fff; margin-top: 4px; }
          .card .value.warn { color: #f59e0b; }
          .card .value.danger { color: #ef4444; }
          canvas { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; width: 100% !important; }
          .badge { display: inline-block; background: #ef4444; color: white; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }
          .badge.ok { background: #22c55e; }
        `}</style>
      </head>
      <body>
        <h1>Next.js Memory Monitor</h1>
        <h2>
          Buggy: readFile on every request
          <span className="badge" id="status">LIVE</span>
        </h2>
        <div className="grid">
          <div className="card">
            <label>RSS (total process)</label>
            <div className="value" id="rss">—</div>
          </div>
          <div className="card">
            <label>Heap Used</label>
            <div className="value" id="heap-used">—</div>
          </div>
          <div className="card">
            <label>Heap Total</label>
            <div className="value" id="heap-total">—</div>
          </div>
          <div className="card">
            <label>External</label>
            <div className="value" id="external">—</div>
          </div>
        </div>
        <canvas id="chart" height="300"></canvas>

        <script dangerouslySetInnerHTML={{ __html: `
          const ctx = document.getElementById('chart').getContext('2d');
          const maxPoints = 60;
          const data = { labels: [], rss: [], heapUsed: [], heapTotal: [] };

          const chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: data.labels,
              datasets: [
                { label: 'RSS', data: data.rss, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
                { label: 'Heap Used', data: data.heapUsed, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
                { label: 'Heap Total', data: data.heapTotal, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.05)', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.3, borderDash: [4,4] },
              ]
            },
            options: {
              responsive: true,
              animation: false,
              scales: {
                x: { ticks: { color: '#666', maxTicksLimit: 10 }, grid: { color: '#1f1f1f' } },
                y: { ticks: { color: '#666', callback: v => v + ' MB' }, grid: { color: '#1f1f1f' }, min: 0 }
              },
              plugins: {
                legend: { labels: { color: '#888', boxWidth: 12 } },
                tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + ctx.raw + ' MB' } }
              }
            }
          });

          function parseNum(str) { return parseInt(str.replace(' MB', '')); }

          async function poll() {
            try {
              const res = await fetch('/api/memory');
              const mem = await res.json();
              const now = new Date().toLocaleTimeString();

              document.getElementById('rss').textContent = mem.rss;
              document.getElementById('heap-used').textContent = mem.heapUsed;
              document.getElementById('heap-total').textContent = mem.heapTotal;
              document.getElementById('external').textContent = mem.external;

              const rssNum = parseNum(mem.rss);
              const heapNum = parseNum(mem.heapUsed);
              const el = document.getElementById('heap-used');
              el.className = 'value' + (heapNum > 300 ? ' danger' : heapNum > 150 ? ' warn' : '');

              data.labels.push(now);
              data.rss.push(rssNum);
              data.heapUsed.push(heapNum);
              data.heapTotal.push(parseNum(mem.heapTotal));

              if (data.labels.length > maxPoints) {
                data.labels.shift(); data.rss.shift();
                data.heapUsed.shift(); data.heapTotal.shift();
              }

              chart.update();
            } catch(e) {
              document.getElementById('status').textContent = 'DOWN';
              document.getElementById('status').className = 'badge';
            }
          }

          poll();
          setInterval(poll, 1000);
        `}} />
      </body>
    </html>
  );
}
