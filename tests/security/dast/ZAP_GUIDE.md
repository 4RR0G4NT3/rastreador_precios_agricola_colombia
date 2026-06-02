# Guía de Escaneo DAST con OWASP ZAP Local

Para realizar un análisis dinámico profesional de tu aplicación, sigue estos pasos usando tu instalación local de OWASP ZAP:

## 1. Preparación
1. Inicia tu servidor localmente: `npm run start`.
2. Abre OWASP ZAP en tu PC.

## 2. Configuración del Contexto
1. En ZAP, haz clic derecho en "Contexts" -> "New Context".
2. Nombre: `Rastreador Agricola`.
3. En "Include in Context", añade: `http://localhost:3000/.*`.

## 3. Ejecución del Escaneo
1. **Spider:** Ve a la pestaña "Quick Start" -> "Automated Scan".
2. Introduce la URL: `http://localhost:3000`.
3. Haz clic en "Attack".
4. ZAP realizará primero un "Spider" (rastreo) y luego un "Active Scan" (ataque).

## 4. Exportación de Resultados
1. Una vez finalizado, ve al menú superior: `Report` -> `Generate Report`.
2. Selecciona el formato `HTML` o `JSON`.
3. Guarda el archivo en esta carpeta: `tests/security/dast/reports/`.
4. Nombra el archivo con la fecha, ej: `scan-2026-06-02.html`.

## 5. Análisis
Revisa la pestaña "Alerts" en ZAP para ver vulnerabilidades como:
- Cross-Site Scripting (XSS).
- SQL Injection avanzada.
- Divulgación de información sensible.
- Falta de tokens CSRF (si tuvieras formularios de escritura).
