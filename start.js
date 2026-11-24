/**
 * Launcher Fullstack TaskFlow UKK (Laravel 11 + React Vite)
 * ---------------------------------------------------------
 * Menjalankan pengecekan koneksi MySQL (port 3306), kemudian
 * menyalakan Backend Laravel (port 8000) dan Frontend Vite (port 5173)
 * secara bersamaan tanpa warning DEP0190 (tanpa opsi shell: true + args).
 */

const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function logInfo(prefix, color, message) {
  const lines = String(message).replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    console.log(`${color}${COLORS.bold}[${prefix}]${COLORS.reset} ${line}`);
  }
}

/**
 * Mengecek apakah layanan MySQL sudah aktif di 127.0.0.1:3306.
 * @returns {Promise<boolean>}
 */
function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function attachStreamLogger(stream, prefix, color, isError = false) {
  if (!stream) return;
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || '';
    for (const line of parts) {
      if (line.trim().length === 0) continue;
      const out = isError ? `${COLORS.dim}${line}${COLORS.reset}` : line;
      console.log(`${color}${COLORS.bold}[${prefix}]${COLORS.reset} ${out}`);
    }
  });
  stream.on('end', () => {
    if (buffer.trim().length > 0) {
      console.log(`${color}${COLORS.bold}[${prefix}]${COLORS.reset} ${buffer}`);
    }
  });
}

/**
 * Membaca variabel koneksi DB dari backend/.env secara sederhana.
 */
function readBackendEnv() {
  const envPath = path.join(BACKEND_DIR, '.env');
  const vars = {};
  if (!fs.existsSync(envPath)) return vars;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

/**
 * Memastikan database MySQL pada .env tersedia dan migrasi tabel terbaru sudah dijalankan.
 */
function ensureDatabaseReady() {
  const envVars = readBackendEnv();
  if ((envVars.DB_CONNECTION || '').toLowerCase() !== 'mysql' || !envVars.DB_DATABASE) {
    return;
  }

  const host = envVars.DB_HOST || '127.0.0.1';
  const port = envVars.DB_PORT || '3306';
  const user = envVars.DB_USERNAME || 'root';
  const pass = envVars.DB_PASSWORD || '';
  const dbName = envVars.DB_DATABASE;

  process.stdout.write(`${COLORS.dim}Menyiapkan database '${dbName}' & migrasi tabel... ${COLORS.reset}`);

  const phpEnsureDb =
    '$e=getenv();' +
    '$pdo=new PDO("mysql:host=".$e["TF_DB_HOST"].";port=".$e["TF_DB_PORT"],$e["TF_DB_USER"],$e["TF_DB_PASS"]);' +
    '$db=str_replace("`","``",$e["TF_DB_NAME"]);' +
    '$pdo->exec("CREATE DATABASE IF NOT EXISTS `".$db."` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");';

  const dbRes = spawnSync('php', ['-r', phpEnsureDb], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      TF_DB_HOST: host,
      TF_DB_PORT: port,
      TF_DB_USER: user,
      TF_DB_PASS: pass,
      TF_DB_NAME: dbName,
    },
    encoding: 'utf8',
    windowsHide: true,
  });

  if (dbRes.status !== 0) {
    console.log(`${COLORS.yellow}LEWATI${COLORS.reset}`);
    if (dbRes.stderr) {
      logInfo('DB-SETUP', COLORS.yellow, dbRes.stderr.trim());
    }
    return;
  }

  const migrateRes = spawnSync('php', ['artisan', 'migrate', '--force'], {
    cwd: BACKEND_DIR,
    encoding: 'utf8',
    windowsHide: true,
  });

  if (migrateRes.status === 0) {
    console.log(`${COLORS.green}${COLORS.bold}SIAP${COLORS.reset}`);
  } else {
    console.log(`${COLORS.yellow}PERINGATAN${COLORS.reset}`);
    if (migrateRes.stderr || migrateRes.stdout) {
      logInfo('MIGRATE', COLORS.yellow, (migrateRes.stderr || migrateRes.stdout).trim());
    }
  }
}

async function main() {
  console.log('');
  console.log(`${COLORS.cyan}${COLORS.bold}==========================================================${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}  TaskFlow Workspace — Fullstack Launcher (UKK PPLG/RPL)  ${COLORS.reset}`);
  console.log(`${COLORS.cyan}${COLORS.bold}==========================================================${COLORS.reset}`);

  // 1. Validasi folder backend & frontend
  if (!fs.existsSync(path.join(BACKEND_DIR, 'artisan'))) {
    console.error(`${COLORS.red}[ERROR] Folder backend/ atau file artisan tidak ditemukan.${COLORS.reset}`);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
    console.error(`${COLORS.red}[ERROR] Folder frontend/ atau package.json tidak ditemukan.${COLORS.reset}`);
    process.exit(1);
  }

  // 2. Cek apakah MySQL port 3306 aktif (kecuali jika --skip-db-check diberikan)
  const skipDbCheck = process.argv.includes('--skip-db-check');
  if (!skipDbCheck) {
    process.stdout.write(`${COLORS.dim}Memeriksa status MySQL di 127.0.0.1:3306... ${COLORS.reset}`);
    const mysqlActive = await checkPort('127.0.0.1', 3306);

    if (!mysqlActive) {
      console.log(`${COLORS.red}${COLORS.bold}TIDAK AKTIF${COLORS.reset}`);
      console.log('');
      console.error(`${COLORS.yellow}${COLORS.bold}[PERINGATAN DATABASE]${COLORS.reset}`);
      console.error('  MySQL tidak terdeteksi berjalan di port 3306.');
      console.error('  Pastikan layanan MySQL di Laragon ("Start All") atau XAMPP ("Start MySQL") sudah aktif.');
      console.error('  Setelah MySQL aktif, jalankan ulang launcher ini.');
      console.error(`  ${COLORS.dim}(Tips: gunakan "node start.js --skip-db-check" jika memakai konfigurasi database lain)${COLORS.reset}`);
      console.log('');
      process.exit(1);
    }

    console.log(`${COLORS.green}${COLORS.bold}AKTIF${COLORS.reset}`);
    ensureDatabaseReady();
  }

  const children = [];
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${COLORS.yellow}[LAUNCHER] Menghentikan seluruh server (${signal})...${COLORS.reset}`);

    for (const child of children) {
      if (!child.killed) {
        try {
          if (process.platform === 'win32' && child.pid) {
            spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
              stdio: 'ignore',
              windowsHide: true,
            });
          } else {
            child.kill('SIGTERM');
          }
        } catch {
          // Abaikan error saat proses sudah berhenti
        }
      }
    }

    setTimeout(() => process.exit(0), 300);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 3. Jalankan Backend Laravel (http://127.0.0.1:8000) tanpa shell: true
  logInfo('LAUNCHER', COLORS.cyan, 'Menyalakan Backend Laravel API di http://127.0.0.1:8000 ...');
  const laravelProc = spawn('php', ['artisan', 'serve', '--host=127.0.0.1', '--port=8000'], {
    cwd: BACKEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  children.push(laravelProc);
  attachStreamLogger(laravelProc.stdout, 'LARAVEL', COLORS.blue);
  attachStreamLogger(laravelProc.stderr, 'LARAVEL', COLORS.blue, true);

  laravelProc.on('error', (err) => {
    console.error(`${COLORS.red}[LARAVEL ERROR] Gagal menjalankan PHP Artisan: ${err.message}${COLORS.reset}`);
  });

  // 4. Jalankan Frontend Vite React (http://127.0.0.1:5173) tanpa shell: true (anti DEP0190)
  logInfo('LAUNCHER', COLORS.cyan, 'Menyalakan Frontend React Vite di http://127.0.0.1:5173 ...');
  const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');

  let viteProc;
  if (fs.existsSync(viteBin)) {
    // Eksekusi langsung via Node binary agar bebas warning DEP0190 & bebas shell overhead
    viteProc = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173'], {
      cwd: FRONTEND_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
  } else {
    // Fallback aman menggunakan cmd /c (tanpa shell: true) atau sh -c
    if (process.platform === 'win32') {
      viteProc = spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
        cwd: FRONTEND_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } else {
      viteProc = spawn('npm', ['run', 'dev'], {
        cwd: FRONTEND_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
  }

  children.push(viteProc);
  attachStreamLogger(viteProc.stdout, 'VITE', COLORS.green);
  attachStreamLogger(viteProc.stderr, 'VITE', COLORS.green, true);

  viteProc.on('error', (err) => {
    console.error(`${COLORS.red}[VITE ERROR] Gagal menjalankan Vite Dev Server: ${err.message}${COLORS.reset}`);
  });

  console.log('');
  console.log(`${COLORS.green}${COLORS.bold}  Aplikasi siap diakses di: http://127.0.0.1:5173${COLORS.reset}`);
  console.log(`${COLORS.dim}  API Endpoint tersedia di: http://127.0.0.1:8000/api${COLORS.reset}`);
  console.log(`${COLORS.dim}  Tekan Ctrl+C untuk menghentikan kedua server.${COLORS.reset}`);
  console.log('');

  laravelProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`${COLORS.red}[LARAVEL] Proses berhenti dengan kode ${code}.${COLORS.reset}`);
      shutdown('LARAVEL_EXIT');
    }
  });

  viteProc.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`${COLORS.red}[VITE] Proses berhenti dengan kode ${code}.${COLORS.reset}`);
      shutdown('VITE_EXIT');
    }
  });
}

main().catch((err) => {
  console.error(`${COLORS.red}[LAUNCHER ERROR] ${err.message}${COLORS.reset}`);
  process.exit(1);
});

