#!/usr/bin/env node
/**
 * YAS Browser - Automated Binary Setup & Verification Script
 * 
 * Ensures yt-dlp.exe and ffmpeg.exe are downloaded and present in `resources/bin/`
 * prior to Electron packaging (`electron-builder --win`) or development.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const binDir = path.join(projectRoot, 'resources', 'bin');

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const FFMPEG_ZIP_URL = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

/**
 * Downloads a file following redirects
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    console.log(`[YAS Setup] Downloading: ${url}`);
    const req = client.get(url, { headers: { 'User-Agent': 'YAS-Browser-Binary-Installer' } }, (res) => {
      // Handle HTTP redirects (301, 302, 303, 307, 308)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const parsed = new URL(url);
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP status ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;
      let lastReport = 0;

      const fileStream = fs.createWriteStream(destPath);
      
      res.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.floor((downloadedBytes / totalBytes) * 100);
          if (percent >= lastReport + 10 || downloadedBytes === totalBytes) {
            lastReport = percent;
            process.stdout.write(`\r[YAS Setup] Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${(totalBytes / 1024 / 1024).toFixed(1)}MB)`);
          }
        }
      });

      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log('\n[YAS Setup] Download complete.');
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Extracts ffmpeg.exe from a zip file into destination directory
 */
function extractFfmpeg(zipPath, targetExePath) {
  console.log(`[YAS Setup] Extracting ffmpeg.exe from ${path.basename(zipPath)}...`);
  const tempExtractDir = path.join(binDir, '_temp_ffmpeg_extract');
  if (!fs.existsSync(tempExtractDir)) {
    fs.mkdirSync(tempExtractDir, { recursive: true });
  }

  try {
    if (process.platform === 'win32') {
      // Windows 10+ has tar.exe built-in, or PowerShell Expand-Archive
      try {
        execSync(`tar -xf "${zipPath}" -C "${tempExtractDir}"`, { stdio: 'ignore' });
      } catch (_) {
        execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempExtractDir}' -Force"`, { stdio: 'ignore' });
      }
    } else {
      // Unix / macOS / Linux fallback
      try {
        execSync(`unzip -q -o "${zipPath}" -d "${tempExtractDir}"`, { stdio: 'ignore' });
      } catch (_) {
        execSync(`tar -xf "${zipPath}" -C "${tempExtractDir}"`, { stdio: 'ignore' });
      }
    }

    // Find extracted ffmpeg.exe recursively
    function findFile(dir, fileName) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = findFile(full, fileName);
          if (found) return found;
        } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
          return full;
        }
      }
      return null;
    }

    const foundFfmpeg = findFile(tempExtractDir, 'ffmpeg.exe');
    if (foundFfmpeg) {
      fs.copyFileSync(foundFfmpeg, targetExePath);
      console.log(`[YAS Setup] ffmpeg.exe successfully installed to ${targetExePath}`);
    } else {
      throw new Error('ffmpeg.exe was not found inside the downloaded archive.');
    }
  } finally {
    // Cleanup temp extraction folder
    try {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

async function main() {
  console.log('====================================================');
  console.log('  YAS Browser - Dependency Setup & Verification');
  console.log('====================================================');

  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const ytdlpPath = path.join(binDir, 'yt-dlp.exe');
  const ffmpegPath = path.join(binDir, 'ffmpeg.exe');

  // 1. Check yt-dlp.exe
  if (fs.existsSync(ytdlpPath) && fs.statSync(ytdlpPath).size > 1000000) {
    console.log(`✓ yt-dlp.exe is already present (${(fs.statSync(ytdlpPath).size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.log('⚡ yt-dlp.exe is missing. Downloading standalone Windows executable...');
    const tempYtdlp = path.join(binDir, 'yt-dlp.download.tmp');
    await downloadFile(YTDLP_URL, tempYtdlp);
    if (fs.existsSync(ytdlpPath)) fs.unlinkSync(ytdlpPath);
    fs.renameSync(tempYtdlp, ytdlpPath);
    console.log(`✓ yt-dlp.exe successfully installed.`);
  }

  // 2. Check ffmpeg.exe
  if (fs.existsSync(ffmpegPath) && fs.statSync(ffmpegPath).size > 1000000) {
    console.log(`✓ ffmpeg.exe is already present (${(fs.statSync(ffmpegPath).size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    console.log('⚡ ffmpeg.exe is missing. Downloading official FFmpeg package...');
    const tempZip = path.join(binDir, 'ffmpeg-release.zip');
    try {
      await downloadFile(FFMPEG_ZIP_URL, tempZip);
      extractFfmpeg(tempZip, ffmpegPath);
    } finally {
      if (fs.existsSync(tempZip)) {
        try { fs.unlinkSync(tempZip); } catch (_) {}
      }
    }
  }

  console.log('====================================================');
  console.log('✓ All required runtime binaries are ready in:');
  console.log(`  ${binDir}`);
  console.log('  - yt-dlp.exe');
  console.log('  - ffmpeg.exe');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('[YAS Setup Error]', err);
  process.exit(1);
});
