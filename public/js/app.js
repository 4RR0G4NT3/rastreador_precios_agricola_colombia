let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadMarkets();

    document.getElementById('searchBtn').addEventListener('click', updateData);
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

async function updateData() {
    const product = document.getElementById('productSelect').value;
    const market = document.getElementById('marketSelect').value;

    let url = '/api/prices?';
    if (product) url += `product=${encodeURIComponent(product)}&`;
    if (market) url += `market=${encodeURIComponent(market)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        updateChart(data);
        updateTable(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Hubo un error al obtener los datos.');
    }
}

function updateChart(data) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Group data by product if multiple products are shown, or just plot a simple line.
    // For simplicity, let's plot a single line if a product is selected.
    
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
                tension: 0.1
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
            }
        }
    };

    chartInstance = new Chart(ctx, chartConfig);
}

function updateTable(data) {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay datos disponibles para esta búsqueda</td></tr>';
        return;
    }

    // Show only latest 100 in the table to avoid freezing
    const tableData = data.slice().reverse().slice(0, 100);

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
