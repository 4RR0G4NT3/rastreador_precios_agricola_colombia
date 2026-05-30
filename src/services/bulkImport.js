import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import iconv from 'iconv-lite';
import { connectDB, getDB } from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, '..', 'db');

/**
 * Imports a single DANE CSV file into MongoDB
 */
async function importCsvFile(filePath) {
    console.log(`\n[Bulk Import] Starting: ${path.basename(filePath)}`);
    const db = getDB();
    const collection = db.collection('prices');
    
    // Create an index for performance if it doesn't exist
    await collection.createIndex({ producto: 1, mercado: 1, fecha: 1 });

    return new Promise((resolve, reject) => {
        let count = 0;
        let batch = [];
        const BATCH_SIZE = 2000; // Efficient batch size for MongoDB

        const stream = fs.createReadStream(filePath)
            .pipe(iconv.decodeStream('win1252')) // Handle Latin1 (NARIO, etc.)
            .pipe(csv({ separator: ';' })); // DANE uses semicolon

        stream.on('data', (row) => {
            // Mapping based on headers: Fuente;FechaEncuesta;...;Ali;Cant Kg
            const product = row['Ali'];
            const market = row['Fuente'];
            const dateStr = row['FechaEncuesta'];
            // Clean price string (handle European decimal comma)
            const price = parseFloat(row['Cant Kg']?.replace(',', '.') || 0);

            if (product && market && dateStr) {
                // Parse date DD/MM/YYYY
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const date = new Date(parts[2], parts[1] - 1, parts[0]);

                    batch.push({
                        updateOne: {
                            filter: { producto: product, mercado: market, fecha: date },
                            update: { 
                                $set: { 
                                    producto: product, 
                                    mercado: market, 
                                    fecha: date, 
                                    precio: price,
                                    source: 'historical_csv'
                                } 
                            },
                            upsert: true
                        }
                    });

                    count++;
                }
            }

            // Process in batches to optimize memory and speed
            if (batch.length >= BATCH_SIZE) {
                const currentBatch = [...batch];
                batch = [];
                // Pause stream while writing to DB to avoid memory overflow
                stream.pause();
                collection.bulkWrite(currentBatch)
                    .then(() => {
                        process.stdout.write(`.`); // Progress indicator
                        stream.resume();
                    })
                    .catch(err => {
                        console.error('\nBulk write error:', err);
                        stream.resume();
                    });
            }
        });

        stream.on('end', async () => {
            if (batch.length > 0) {
                await collection.bulkWrite(batch);
            }
            console.log(`\n[Bulk Import] Finished ${path.basename(filePath)}. Total records: ${count}`);
            resolve();
        });

        stream.on('error', (error) => {
            console.error(`\n[Bulk Import] Error in ${filePath}:`, error);
            reject(error);
        });
    });
}

/**
 * Scans src/db for folders and imports all CSV files found
 */
async function startBulkImport() {
    console.log('=== DANE Historical Data Bulk Importer ===');
    try {
        await connectDB();
        
        const items = fs.readdirSync(DB_DIR);
        // Filter only directories (2018_SemI, etc.)
        const folders = items.filter(item => {
            const fullPath = path.join(DB_DIR, item);
            return fs.statSync(fullPath).isDirectory();
        }).sort();

        console.log(`Found ${folders.length} data folders to process.`);

        for (const folder of folders) {
            const folderPath = path.join(DB_DIR, folder);
            const files = fs.readdirSync(folderPath);
            const csvFiles = files.filter(f => f.toLowerCase().endsWith('.csv'));

            for (const csvFile of csvFiles) {
                await importCsvFile(path.join(folderPath, csvFile));
            }
        }

        console.log('\n[Bulk Import] ALL DATA IMPORTED SUCCESSFULLY! 🚀');
        process.exit(0);
    } catch (error) {
        console.error('\n[Bulk Import] CRITICAL ERROR:', error);
        process.exit(1);
    }
}

startBulkImport();
