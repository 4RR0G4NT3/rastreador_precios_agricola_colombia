# language: es
Característica: Filtrado y Exportación de Precios Agrícolas
  Como analista del sector agrícola
  Quiero filtrar los precios por producto, mercado y fecha
  Para analizar las tendencias y exportar los datos para informes externos

  Escenario: Filtrar precios de un producto específico y exportar a CSV
    Dado que el usuario navega a la página principal
    Cuando selecciona el producto "Papa suprema"
    Y selecciona el mercado "Armenia, Mercar"
    Y establece la fecha inicial en "2018-01-01"
    Y establece la fecha final en "2018-01-31"
    Y hace clic en el botón "Actualizar Gráfico"
    Entonces el sistema debe mostrar registros en la tabla
    Y el total de registros debe ser mayor a 0
    Y al hacer clic en "Exportar CSV" se debe iniciar la descarga
