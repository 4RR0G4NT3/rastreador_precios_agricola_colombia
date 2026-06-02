import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..', '..', '..');

const PATTERNS = [
    { name: 'MongoDB Connection String', regex: /mongodb(\+srv)?:\/\/(?!localhost)[^\s]+/gi },
    { name: 'Generic API Key', regex: /api[_-]key\s*[:=]\s*['"][a-z0-9]{20,}['"]/gi },
    { name: 'Generic Secret', regex: /secret\s*[:=]\s*['"][a-z0-9]{20,}['"]/gi },
    { name: 'Potential Password', regex: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi }
];

const IGNORED_FILES = [
    'node_modules',
    '.git',
    'package-lock.json',
    'tests/security/sca/scan-secrets.js',
    'replica',
    '.env'
];

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    PATTERNS.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
            matches.forEach(match => {
                // Simple heuristic to avoid false positives (like env variable references)
                if (!match.includes('process.env')) {
                    findings.push({ pattern: pattern.name, match: match });
                }
            });
        }
    });

    return findings;
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const relativePath = path.relative(rootDir, dirPath);
        
        if (IGNORED_FILES.some(ignored => relativePath.startsWith(ignored))) {
            return;
        }

        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

console.log('--- Iniciando escaneo de secretos ---');
let totalFindings = 0;

walkDir(rootDir, (filePath) => {
    try {
        const findings = scanFile(filePath);
        if (findings.length > 0) {
            const relativePath = path.relative(rootDir, filePath);
            console.log(`\n[!] Hallazgos en: ${relativePath}`);
            findings.forEach(f => {
                console.log(`    - Tipo: ${f.pattern}`);
                // Mask the match for safety in logs
                const masked = f.match.substring(0, 10) + '... (masked)';
                console.log(`      Coincidencia: ${masked}`);
            });
            totalFindings += findings.length;
        }
    } catch (e) {
        // Skip binary files or unreadable files
    }
});

console.log('\n--- Resumen ---');
if (totalFindings > 0) {
    console.error(`[FALLO] Se encontraron ${totalFindings} posibles secretos expuestos.`);
    process.exit(1);
} else {
    console.log('[ÉXITO] No se detectaron secretos obvios.');
    process.exit(0);
}
