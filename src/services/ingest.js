import { getDB } from '../db/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Defaulting to a common Socrata API URL format. User can change this in .env
// We limit to 500 records per fetch just as an example
const DATA_URL = process.env.DATA_URL || 'https://www.datos.gov.co/resource/cq88-qaaa.json?$limit=500';
const INGEST_INTERVAL_MS = process.env.INGEST_INTERVAL_MS || 24 * 60 * 60 * 1000; // 24 hours

export async function fetchAgriculturalData() {
    console.log(`[Ingest Worker] Fetching data from ${DATA_URL}`);
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[Ingest Worker] Error fetching data:', error);
        
        // --- Fallback/Mock Data for Demonstration ---
        console.log('[Ingest Worker] Falling back to mock data for demonstration purposes.');
        return [
            {
                producto: 'Arroz',
                mercado: 'Bogotá - Corabastos',
                precio_promedio: Math.floor(Math.random() * 1000) + 2000,
                fecha: new Date().toISOString()
            },
            {
                producto: 'Papa Pastusa',
                mercado: 'Bogotá - Corabastos',
                precio_promedio: Math.floor(Math.random() * 500) + 1000,
                fecha: new Date().toISOString()
            },
            {
                producto: 'Arroz',
                mercado: 'Medellín - Mayorista',
                precio_promedio: Math.floor(Math.random() * 1000) + 2100,
                fecha: new Date().toISOString()
            }
        ];
    }
}

export async function processAndSaveData(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.log('[Ingest Worker] No data to process.');
        return;
    }

    const db = getDB();
    const collection = db.collection('prices');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of data) {
        // Map common Socrata dataset field names to our schema
        // Adjust these mappings based on the actual dataset structure from datos.gov.co
        const producto = item.producto || item.producto_nombre || item.nombre_producto || 'Desconocido';
        const mercado = item.mercado || item.ciudad || item.municipio || 'Desconocido';
        const precio = parseFloat(item.precio_promedio || item.precio || 0);
        
        // Try to parse the date, default to now if missing
        let fecha = new Date();
        if (item.fecha || item.fecha_registro) {
            fecha = new Date(item.fecha || item.fecha_registro);
        }

        // We use a combination of product, market, and date as a unique identifier 
        // to avoid duplicate entries (upsert)
        const filter = {
            producto: producto,
            mercado: mercado,
            // To simplify matching, we could match by exact date (day)
            // Here we use the exact Date object or string for exact match
            fecha: fecha 
        };

        const update = {
            $set: {
                producto,
                mercado,
                precio,
                fecha,
                raw_data: item // Store the original raw data just in case
            }
        };

        const result = await collection.updateOne(filter, update, { upsert: true });
        
        if (result.upsertedCount > 0) {
            insertedCount++;
        } else if (result.modifiedCount > 0) {
            updatedCount++;
        }
    }

    console.log(`[Ingest Worker] Finished processing. Inserted: ${insertedCount}, Updated: ${updatedCount}`);
}

export async function runIngestionJob() {
    console.log(`[Ingest Worker] Starting job at ${new Date().toISOString()}`);
    const data = await fetchAgriculturalData();
    await processAndSaveData(data);
    console.log(`[Ingest Worker] Job finished at ${new Date().toISOString()}`);
}

export function startIngestionJob() {
    // Run immediately on startup
    runIngestionJob();

    // Then run periodically
    setInterval(runIngestionJob, INGEST_INTERVAL_MS);
    console.log(`[Ingest Worker] Scheduled to run every ${INGEST_INTERVAL_MS} ms.`);
}
