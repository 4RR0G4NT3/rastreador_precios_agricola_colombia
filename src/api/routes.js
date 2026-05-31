import { getDB } from '../db/db.js';
import { parse } from 'url';

let cachedProducts = null;
let cachedMarkets = null;

export async function handleApiRoutes(req, res) {
    const parsedUrl = parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    try {
        const db = getDB();
        const collection = db.collection('prices');

        if (req.method === 'GET') {
            if (pathname === '/api/products') {
                if (!cachedProducts) {
                    const products = await collection.distinct('producto');
                    cachedProducts = products.sort();
                }
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify(cachedProducts));
                return;
            }

            if (pathname === '/api/markets') {
                if (!cachedMarkets) {
                    const markets = await collection.distinct('mercado');
                    cachedMarkets = markets.sort();
                }
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify(cachedMarkets));
                return;
            }

            if (pathname === '/api/prices') {
                res.setHeader('Content-Type', 'application/json');
                const { product, market, startDate, endDate, page, limit } = query;
                
                const filter = {};
                if (product) filter.producto = product;
                if (market) filter.mercado = market;
                
                if (startDate || endDate) {
                    filter.fecha = {};
                    if (startDate) filter.fecha.$gte = new Date(startDate);
                    if (endDate) filter.fecha.$lte = new Date(endDate);
                }

                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 1000;
                const skip = (pageNum - 1) * limitNum;

                const total = await collection.countDocuments(filter);
                const prices = await collection.find(filter)
                    .sort({ fecha: 1 })
                    .skip(skip)
                    .limit(limitNum)
                    .toArray();
                    
                res.writeHead(200);
                res.end(JSON.stringify({
                    data: prices,
                    total,
                    page: pageNum,
                    totalPages: Math.ceil(total / limitNum)
                }));
                return;
            }

            if (pathname === '/api/export') {
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
                    .sort({ fecha: 1 })
                    .toArray();
                
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=precios_agricolas.csv');
                
                let csvContent = 'Fecha;Producto;Mercado;Precio\n';
                prices.forEach(row => {
                    const fecha = new Date(row.fecha).toLocaleDateString('es-CO');
                    csvContent += `${fecha};${row.producto};${row.mercado};${row.precio}\n`;
                });
                
                res.writeHead(200);
                res.end(csvContent);
                return;
            }
            
            if (pathname === '/api/cache/clear') {
                cachedProducts = null;
                cachedMarkets = null;
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                res.end(JSON.stringify({ message: 'Cache cleared' }));
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
