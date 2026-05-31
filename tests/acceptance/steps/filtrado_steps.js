import { createBdd } from 'playwright-bdd';
import { test, expect } from '@playwright/test';

const { Given: Dado, When: Cuando, Then: Entonces } = createBdd();

Dado('que el usuario navega a la página principal', async ({ page }) => {
  await page.goto('/');
});

Cuando('selecciona el producto {string}', async ({ page }, producto) => {
  await page.selectOption('#productSelect', { label: producto });
});

Cuando('selecciona el mercado {string}', async ({ page }, mercado) => {
  await page.selectOption('#marketSelect', { label: mercado });
});

Cuando('establece la fecha inicial en {string}', async ({ page }, fecha) => {
  await page.fill('#startDate', fecha);
});

Cuando('establece la fecha final en {string}', async ({ page }, fecha) => {
  await page.fill('#endDate', fecha);
});

Cuando('hace clic en el botón {string}', async ({ page }, boton) => {
  await page.getByRole('button', { name: boton }).first().click();
  // Wait for loading to finish and table to have rows
  await expect(page.locator('#loadingOverlay')).toBeHidden({ timeout: 15000 });
});

Entonces('el sistema debe mostrar registros en la tabla', async ({ page }) => {
  const rowCount = await page.locator('#dataTable tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
});

Entonces('el total de registros debe ser mayor a 0', async ({ page }) => {
  const recordCountText = await page.locator('#recordCount').textContent();
  const count = parseInt(recordCountText.replace(/[^0-9]/g, ''));
  expect(count).toBeGreaterThan(0);
});

Entonces('al hacer clic en {string} se debe iniciar la descarga', async ({ page }, boton) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: boton }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.csv');
});
