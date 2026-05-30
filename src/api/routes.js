import { getDB } from '../db/db.js';
import { parse } from 'url';

export async function handleApiRoutes(req, res) {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    res.setHeader('Content-Type', 'application/json');

    try {
        const db = getDB();
        const collection = db.collection('prices');

        if (req.method === 'GET') {
            if (pathname === '/api/products') {
                const products = await collection.distinct('producto');
                res.writeHead(200);
                res.end(JSON.stringify(products.sort()));
                return;
            }

            if (pathname === '/api/markets') {
                const markets = await collection.distinct('mercado');
                res.writeHead(200);
                res.end(JSON.stringify(markets.sort()));
                return;
            }

            if (pathname === '/api/prices') {
                const { product, market, startDate, endDate } = query;
                
                const filter = {};
                if (product) filter.producto = product;
                if (market) filter.mercado = market;
                
                if (startDate || endDate) {
                    filter.fecha = {};
                    if (startDate) filter.fecha.$gte = new Date(startDate);
                    if (endDate) filter.fecha.$lte = new Date(endDate);
                }

                const prices = await collection.find(filter)
                    .sort({ fecha: 1 }) // Sort by date ascending
                    .limit(1000) // Limit to prevent massive payloads
                    .toArray();
                    
                res.writeHead(200);
                res.end(JSON.stringify(prices));
                return;
            }
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint not found' }));

    } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
}
