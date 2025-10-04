import net from 'net';

function checkTcp(host, port, ms = 5000) {
  return new Promise((resolve, reject) => {
    const sock = new net.Socket();
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('TCP timeout')); }, ms);
    sock.connect(port, host, () => { clearTimeout(timer); sock.destroy(); resolve(); });
    sock.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

const host = process.argv[2] || 'hosting12.hostingfact.in';
const port = Number(process.argv[3]) || 3306;
const ms = Number(process.argv[4]) || 10000;

try {
  await checkTcp(host, port, ms);
  console.log(`[TCP PROBE] ${host}:${port} reachable`);
  process.exit(0);
} catch (e) {
  console.error(`[TCP PROBE] ${host}:${port} NOT reachable:`, e.message);
  process.exit(1);
}
