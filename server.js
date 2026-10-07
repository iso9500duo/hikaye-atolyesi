/**
 * HİKÂYE ATÖLYESİ - SUNUCU (SERVER.JS)
 * 
 * Sıfır harici paket bağımlılığıyla (Pure Node.js) çalışan yerel web sunucusu ve
 * güvenli Gemini API proxy sunucusu.
 * 
 * Özellikler:
 * 1. Statik web dosyalarını (HTML, CSS, JS) doğru MIME türleriyle sunar.
 * 2. API anahtarlarını (.env veya ortam değişkeni) frontend'e sızdırmadan güvenli tutar.
 * 3. /api/generate-story ve /api/evaluate-story uç noktaları sağlar.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// .env dosyasını oku (varsa)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...vals] = trimmed.split('=');
          if (key && vals.length > 0) {
            process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
          }
        }
      });
      console.log("📄 .env dosyası başarıyla yüklendi.");
    } catch (e) {
      console.warn("⚠️ .env dosyası okunamadı:", e.message);
    }
  }
}
loadEnv();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8'
};

const server = http.createServer(async (req, res) => {
  // CORS başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // ==========================================
  // API: HİKÂYE OLUŞTURMA PROXY (/api/generate-story)
  // ==========================================
  if (req.method === 'POST' && pathname === '/api/generate-story') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Sunucu tarafında GEMINI_API_KEY tanımlanmamış." }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { olay, kisiler, mekan, zaman } = JSON.parse(body);
        const prompt = `
Sen Türk Dili ve Edebiyatı alanında ödüllü, öğrencilere ilham veren usta bir öykü yazarısın.
Aşağıda verilen 4 temel yapı unsurunu kullanarak edebi, akıcı ve yaratıcı bir örnek hikâye yaz.

YAPI UNSURLARI:
- Olay: "${olay}"
- Kişi(ler): "${kisiler}"
- Mekân: "${mekan}"
- Zaman: "${zaman}"

KURALLAR:
1. Hikâye Türkçe olmalı ve 500-750 kelime civarında olmalıdır.
2. Bu 4 unsuru doğal bir olay örgüsü içinde kullan.
3. Giriş, gelişme ve sonuç bölümleri belirgin olsun.
4. SADECE aşağıdaki JSON formatında yanıt ver:
{
  "title": "Hikâyenin Özgün Başlığı",
  "story": "Hikâye metni (paragraflar arasında \\n\\n kullanarak biçimlendir)"
}
`;
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json"
            }
          })
        });

        if (!apiRes.ok) {
          throw new Error(`Google API Hatası: ${apiRes.status}`);
        }

        const data = await apiRes.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(candidateText);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          title: parsed.title,
          story: parsed.story,
          provider: `Gemini AI (${model} - Güvenli Sunucu)`
        }));
      } catch (err) {
        console.error("API proxy hatası:", err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // API: DEĞERLENDİRME PROXY (/api/evaluate-story)
  // ==========================================
  if (req.method === 'POST' && pathname === '/api/evaluate-story') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Sunucu tarafında GEMINI_API_KEY tanımlanmamış." }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { title, text, elements } = JSON.parse(body);
        const prompt = `
Sen Türk Dili ve Edebiyatı öğretmenisin. Öğrencinin yazdığı hikâyeyi 9 kriterde yapıcı ve öğretici bir dille değerlendir. Hikâyeyi öğrencinin yerine YENİDEN YAZMA.

SEÇİLEN UNSURLAR:
- Olay: "${elements.olay}"
- Kişiler: "${elements.kisiler}"
- Mekân: "${elements.mekan}"
- Zaman: "${elements.zaman}"

ÖĞRENCİ METNİ:
Başlık: "${title}"
${text}

SADECE aşağıdaki JSON formatında yanıt ver:
{
  "overallScore": 8.5,
  "badge": "Genç Öykücü 🖋️",
  "rubric": [
    {"category": "Olay", "score": 9, "comment": "..."},
    {"category": "Kişiler", "score": 8, "comment": "..."},
    {"category": "Mekân", "score": 8, "comment": "..."},
    {"category": "Zaman", "score": 8, "comment": "..."},
    {"category": "Olay örgüsü", "score": 8, "comment": "..."},
    {"category": "Giriş-gelişme-sonuç", "score": 9, "comment": "..."},
    {"category": "Yaratıcılık", "score": 9, "comment": "..."},
    {"category": "Dil ve anlatım", "score": 8, "comment": "..."},
    {"category": "Tutarlılık", "score": 9, "comment": "..."}
  ],
  "generalReview": "...",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "..."],
  "nextStoryTip": "..."
}
`;
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const apiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: "application/json"
            }
          })
        });

        if (!apiRes.ok) throw new Error(`Google API Hatası: ${apiRes.status}`);
        const data = await apiRes.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(candidateText);
      } catch (err) {
        console.error("Değerlendirme proxy hatası:", err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // STATİK DOSYA SUNUCUSU
  // ==========================================
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 - Sayfa veya Dosya Bulunamadı');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

function startServer(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} kullanımda, ${port + 1} deneniyor...`);
      startServer(port + 1);
    } else {
      console.error('Sunucu hatası:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Hikâye Atölyesi Başarıyla Başlatıldı!`);
    console.log(`🌐 Web Adresi: http://localhost:${port}`);
    console.log(`💡 Durum: Gerçek zamanlı hazır, sıfır harici bağımlılık.`);
    console.log(`======================================================\n`);
  });
}

startServer(PORT);
