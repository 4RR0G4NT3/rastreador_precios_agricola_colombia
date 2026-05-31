import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'precios_agricolas';

let client;
let db;

export async function connectDB() {
    if (db) return db;
    try {
        client = new MongoClient(uri);
        await client.connect();
        const mode = process.env.NODE_ENV === 'production' ? 'Production' : 'Development';
        console.log(`Connected successfully to MongoDB [Mode: ${mode}]`);
        db = client.db(dbName);
        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call connectDB first.');
    }
    return db;
}

export async function closeDB() {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
