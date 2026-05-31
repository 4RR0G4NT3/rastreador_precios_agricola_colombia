let chartInstance = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 50;
const MAX_CHART_POINTS = 2000;

document.addEventListener('DOMContentLoaded', async () => {
    // Set default dates (last 6 months)
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);
    
    document.getElementById('startDate').value = start.toISOString().split('T')[0];
    document.getElementById('endDate').value = end.toISOString().split('T')[0];

    await loadProducts();
    await loadMarkets();

    document.getElementById('searchBtn').addEventListener('click', () => {
        currentPage = 1;
        updateAll();
    });

    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTableData();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        currentPage++;
        updateTableData();
    });
});

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const select = document.getElementById('productSelect');
        select.innerHTML = '<option value="">Todos los productos</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product;
            option.textContent = product;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('productSelect').innerHTML = '<option value="">Error cargando</option>';
    }
}

async function loadMarkets() {
    try {
        const response = await fetch('/api/markets');
        const markets = await response.json();
        
        const select = document.getElementById('marketSelect');
        select.innerHTML = '<option value="">Todos los mercados</option>';
        
        markets.forEach(market => {
            const option = document.createElement('option');
            option.value = market;
            option.textContent = market;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading markets:', error);
        document.getElementById('marketSelect').innerHTML = '<option value="">Error cargando</option>';
    }
}

async function updateAll() {
    await Promise.all([
        updateChartData(),
        updateTableData()
    ]);
}

function getQueryString(limit, page) {
    const product = document.getElementById('productSelect').value;
    const market = document.getElementById('marketSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let params = new URLSearchParams();
    if (product) params.append('product', product);
    if (market) params.append('market', market);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (limit) params.append('limit', limit);
    if (page) params.append('page', page);

    return params.toString();
}

async function updateChartData() {
    const url = `/api/prices?${getQueryString(MAX_CHART_POINTS)}`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        updateChart(result.data);
    } catch (error) {
        console.error('Error fetching chart data:', error);
    }
}

async function updateTableData() {
    const url = `/api/prices?${getQueryString(ITEMS_PER_PAGE, currentPage)}`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        updateTable(result.data);
        updatePaginationUI(result.total, result.page, result.totalPages);
    } catch (error) {
        console.error('Error fetching table data:', error);
        alert('Hubo un error al obtener los datos de la tabla.');
    }
}

function updateChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Sort data by date just in case
    data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const labels = data.map(item => new Date(item.fecha).toLocaleDateString());
    const prices = data.map(item => item.precio);

    if (chartInstance) {
        chartInstance.destroy();
    }

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Precio Promedio (COP)',
                data: prices,
                borderColor: '#2E7D32',
                backgroundColor: 'rgba(46, 125, 50, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1,
                pointRadius: data.length > 100 ? 0 : 3 // Hide points if too many
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Precio (COP)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    };

    chartInstance = new Chart(ctx, chartConfig);
}

function updateTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay datos disponibles para esta búsqueda</td></tr>';
        return;
    }

    // We show data as it comes from API (already sorted by date ASC by default, but we might want latest first in table)
    // Actually the API sorts by date ASC. Let's reverse it for the table to see latest first.
    const tableData = [...data].reverse();

    tableData.forEach(item => {
        const tr = document.createElement('tr');
        
        const tdFecha = document.createElement('td');
        tdFecha.textContent = new Date(item.fecha).toLocaleDateString();
        
        const tdProducto = document.createElement('td');
        tdProducto.textContent = item.producto;
        
        const tdMercado = document.createElement('td');
        tdMercado.textContent = item.mercado;
        
        const tdPrecio = document.createElement('td');
        tdPrecio.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.precio);

        tr.appendChild(tdFecha);
        tr.appendChild(tdProducto);
        tr.appendChild(tdMercado);
        tr.appendChild(tdPrecio);
        
        tbody.appendChild(tr);
    });
}

function updatePaginationUI(total, page, totalPages) {
    document.getElementById('recordCount').textContent = `Total registros: ${total.toLocaleString()}`;
    document.getElementById('pageIndicator').textContent = `Página ${page} de ${totalPages || 1}`;
    
    document.getElementById('prevPage').disabled = (page <= 1);
    document.getElementById('nextPage').disabled = (page >= totalPages);
}
