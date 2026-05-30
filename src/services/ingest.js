import { getDB } from '../db/db.js';
import soap from 'soap';
import dotenv from 'dotenv';

dotenv.config();

// DANE SIPSA SOAP WSDL URL
const WSDL_URL = 'http://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService?WSDL';
const INGEST_INTERVAL_MS = process.env.INGEST_INTERVAL_MS || 24 * 60 * 60 * 1000; // 24 hours

export async function fetchAgriculturalData() {
    console.log(`[Ingest Worker] Connecting to DANE SOAP Service: ${WSDL_URL}`);
    
    return new Promise((resolve, reject) => {
        soap.createClient(WSDL_URL, async (err, client) => {
            if (err) {
                console.error('[Ingest Worker] Error creating SOAP client:', err);
                return resolve(getMockData()); // Fallback to mock on error
            }

            try {
                // We use 'promedioAbasSipsaMesMadr' as an example method.
                // This typically requires parameters like month and year.
                // For a real production app, we would iterate over recent months.
                const now = new Date();
                const args = {
                    // Parameters based on DANE WSDL documentation
                    // Usually: anio, mes
                    anio: now.getFullYear().toString(),
                    mes: (now.getMonth() + 1).toString() 
                };

                console.log(`[Ingest Worker] Calling promedioAbasSipsaMesMadr with args:`, args);

                client.promedioAbasSipsaMesMadr(args, (err, result) => {
                    if (err) {
                        console.error('[Ingest Worker] SOAP Call Error:', err);
                        return resolve(getMockData());
                    }

                    // Process the XML/Object result from SOAP
                    // The structure depends on the DANE response. 
                    // Usually it's an array of objects inside return.
                    const rawRecords = result?.return || [];
                    console.log(`[Ingest Worker] Received ${rawRecords.length} records from DANE.`);
                    
                    if (rawRecords.length === 0) {
                        return resolve(getMockData());
                    }

                    // Map DANE fields to our schema
                    const formattedData = rawRecords.map(item => ({
                        producto: item.producto || item.nombreProducto || 'Desconocido',
                        mercado: item.fuente || item.nombreFuente || 'Desconocido',
                        precio: parseFloat(item.precioPromedio || item.valor || 0),
                        fecha: new Date(), // DANE monthly data usually implies the current month
                        raw_data: item
                    }));

                    resolve(formattedData);
                });
            } catch (error) {
                console.error('[Ingest Worker] Unexpected error during SOAP execution:', error);
                resolve(getMockData());
            }
        });
    });
}

function getMockData() {
    console.log('[Ingest Worker] Falling back to mock data.');
    return [
        {
            producto: 'Arroz (DANE Mock)',
            mercado: 'Bogotá - Corabastos',
            precio: Math.floor(Math.random() * 1000) + 2000,
            fecha: new Date()
        },
        {
            producto: 'Papa Pastusa (DANE Mock)',
            mercado: 'Bogotá - Corabastos',
            precio: Math.floor(Math.random() * 500) + 1000,
            fecha: new Date()
        }
    ];
}

export async function processAndSaveData(data) {
    if (!Array.isArray(data) || data.length === 0) return;

    const db = getDB();
    const collection = db.collection('prices');
    let inserted = 0;
    let updated = 0;

    for (const item of data) {
        const filter = {
            producto: item.producto,
            mercado: item.mercado,
            fecha: {
                $gte: new Date(item.fecha.getFullYear(), item.fecha.getMonth(), 1),
                $lt: new Date(item.fecha.getFullYear(), item.fecha.getMonth() + 1, 1)
            }
        };

        const update = {
            $set: {
                ...item,
                updatedAt: new Date()
            }
        };

        const result = await collection.updateOne(filter, update, { upsert: true });
        if (result.upsertedCount > 0) inserted++;
        else if (result.modifiedCount > 0) updated++;
    }

    console.log(`[Ingest Worker] DB Sync: ${inserted} new, ${updated} updated.`);
}

export async function runIngestionJob() {
    const data = await fetchAgriculturalData();
    await processAndSaveData(data);
}

export function startIngestionJob() {
    runIngestionJob();
    setInterval(runIngestionJob, INGEST_INTERVAL_MS);
}
