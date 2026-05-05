const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const ROOT_DIR = path.resolve(__dirname);
const MACRODROID_WEBHOOK_URL = 'https://trigger.macrodroid.com/fe4a4799-422f-4698-ac4e-84982b13893a/water_alert';
const MACRODROID_MESSAGE = 'CRITICAL WATER ALERT 🚨! TDS is {lv=tds} ppm and Turbidity is {lv=ntu} NTU!';

function triggerMacroDroid(record) {
  if (!MACRODROID_WEBHOOK_URL || MACRODROID_WEBHOOK_URL.includes('YOUR_DEVICE_ID')) {
    return;
  }

  try {
    const url = new URL(MACRODROID_WEBHOOK_URL);
    url.searchParams.set('tds', String(record.tds));
    url.searchParams.set('ntu', String(record.ntu));
    url.searchParams.set('message', MACRODROID_MESSAGE);

    const request = https.get(url.toString(), (response) => {
      response.on('data', () => {});
      response.on('end', () => {});
    });

    request.on('error', (error) => {
      console.error('MacroDroid webhook failed:', error.message);
    });
  } catch (error) {
    console.error('MacroDroid trigger error:', error.message);
  }
}

const contentTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.csv': 'text/csv; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendResponse(res, statusCode, body, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function send404(res) {
  sendResponse(res, 404, '404 Not Found', 'text/plain; charset=UTF-8');
}

function serveStaticFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send404(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[ext] || 'application/octet-stream';
    sendResponse(res, 200, data, contentType);
  });
}

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (err) {
      callback(err);
    }
  });
}

function analyzeWaterData({ tds, ntu, voltage }) {
  let status = 'unknown';
  let anomaly = false;
  let trend = 'stable';
  let prediction = 'Unable to classify water quality.';
  let confidence = 60;

  if (typeof tds !== 'number' || typeof ntu !== 'number') {
    return {
      status: 'error',
      anomaly: true,
      trend: 'stable',
      prediction: 'Invalid or missing sensor values.',
      confidence: 100
    };
  }

  if (tds > 1000 || ntu > 5) {
    status = 'danger';
    anomaly = true;
    prediction = 'Critical alert: Water quality is unsafe.';
    confidence = 95;
  } else if (tds > 500 || ntu > 2) {
    status = 'warning';
    prediction = 'Warning: Water quality is degrading.';
    confidence = 85;
  } else {
    status = 'safe';
    prediction = 'Water quality looks stable and safe.';
    confidence = 90;
  }

  if (tds > 800) {
    trend = 'increasing';
  } else if (tds < 200) {
    trend = 'decreasing';
  }

  if (typeof voltage === 'number' && voltage < 3.3) {
    prediction += ' Warning: sensor voltage low.';
  }

  return { status, anomaly, trend, prediction, confidence };
}

const server = http.createServer((req, res) => {
  const url = req.url;

  if (url === '/api/health') {
    sendResponse(res, 200, JSON.stringify({ status: 'ok' }), 'application/json; charset=UTF-8');
    return;
  }

  if (url === '/api/sensor-data' && req.method === 'POST') {
    parseJsonBody(req, (err, body) => {
      if (err) {
        sendResponse(res, 400, JSON.stringify({ error: 'Invalid JSON payload' }), 'application/json; charset=UTF-8');
        return;
      }

      const record = {
        timestamp: body.timestamp || Date.now(),
        tds: Number(body.tds) || 0,
        ntu: Number(body.ntu) || 0,
        voltage: Number(body.voltage) || 0
      };
      const csvLine = `${record.timestamp},${record.tds},${record.ntu},${record.voltage}\n`;
      const csvFile = path.join(ROOT_DIR, 'water_data.csv');

      fs.appendFile(csvFile, csvLine, err => {
        if (err) {
          sendResponse(res, 500, JSON.stringify({ error: 'Unable to save sensor data' }), 'application/json; charset=UTF-8');
          return;
        }
        if (record.tds > 1000 || record.ntu > 5) {
          triggerMacroDroid(record);
        }
        sendResponse(res, 200, JSON.stringify({ success: true, record }), 'application/json; charset=UTF-8');
      });
    });
    return;
  }

  if (url === '/api/analyze' && req.method === 'POST') {
    parseJsonBody(req, (err, body) => {
      if (err) {
        sendResponse(res, 400, JSON.stringify({ error: 'Invalid JSON payload' }), 'application/json; charset=UTF-8');
        return;
      }
      sendResponse(res, 200, JSON.stringify(analyzeWaterData(body)), 'application/json; charset=UTF-8');
    });
    return;
  }

  if (url === '/api/data' && req.method === 'GET') {
    const csvFile = path.join(ROOT_DIR, 'water_data.csv');
    fs.readFile(csvFile, 'utf8', (err, data) => {
      if (err) {
        sendResponse(res, 500, JSON.stringify({ error: 'Unable to read data file' }), 'application/json; charset=UTF-8');
        return;
      }

      const rows = data.trim().split('\n').slice(1).filter(Boolean).map(line => {
        const [timestamp, tds, ntu, voltage] = line.split(',');
        return { timestamp: Number(timestamp), tds: Number(tds), ntu: Number(ntu), voltage: Number(voltage) };
      });
      sendResponse(res, 200, JSON.stringify(rows), 'application/json; charset=UTF-8');
    });
    return;
  }

  if (url === '/api/export' && req.method === 'GET') {
    const csvFile = path.join(ROOT_DIR, 'water_data.csv');
    fs.readFile(csvFile, (err, data) => {
      if (err) {
        send404(res);
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="water_data.csv"'
      });
      res.end(data);
    });
    return;
  }

  let requestPath = url.split('?')[0];
  if (requestPath === '/' || requestPath === '/index.html') {
    requestPath = '/index.html';
  }

  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^\.+/, '');
  const fullPath = path.join(ROOT_DIR, safePath);

  if (!fullPath.startsWith(ROOT_DIR)) {
    send404(res);
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err) {
      send404(res);
      return;
    }

    if (stats.isDirectory()) {
      serveStaticFile(path.join(fullPath, 'index.html'), res);
      return;
    }

    serveStaticFile(fullPath, res);
  });
});

server.listen(PORT, () => {
  console.log(`JS server running at http://localhost:${PORT}`);
});
