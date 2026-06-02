import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from './db/db.js';
import { handleApiRoutes } from './api/routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

function setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Content-Security-Policy ajustada para permitir scripts de CDN y fuentes de Google
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:;");
}

// In-memory Rate Limiter
const rateLimitWindowMs = 60 * 1000; // 1 minuto
const rateLimitMax = 100; // Max 100 peticiones por IP por minuto
const ipRequests = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    if (!ipRequests.has(ip)) {
        ipRequests.set(ip, []);
    }
    const requests = ipRequests.get(ip);
    const recentRequests = requests.filter(time => now - time < rateLimitWindowMs);
    recentRequests.push(now);
    ipRequests.set(ip, recentRequests);
    return recentRequests.length <= rateLimitMax;
}

const server = http.createServer(async (req, res) => {
    console.log(`${req.method} ${req.url}`);

    const clientIp = req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too Many Requests. Please try again later.' }));
        return;
    }

    setSecurityHeaders(res);

    // CORS headers estrictos en producción
    if (isProduction) {
        const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://tu-dominio-seguro.com';
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (req.url.startsWith('/api')) {
        return handleApiRoutes(req, res);
    }

    // Serve static files
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    try {
        const content = await fs.promises.readFile(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
        } else {
            res.writeHead(500);
            res.end(`Server Error: ${error.code}`);
        }
    }
});

async function startServer() {
    try {
        await connectDB();
        
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT} [Mode: ${isProduction ? 'Production' : 'Development'}]`);
            if (!isProduction) {
                console.log(`Local access: http://localhost:${PORT}`);
            }
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
