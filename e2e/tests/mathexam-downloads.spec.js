const { test, expect } = require('@playwright/test');

/**
 * Static downloads are served by deploy/pm2/start-frontend.sh (serve@14 -s frontend/dist).
 * serve.json in dist sets Content-Type / Content-Disposition for /downloads/* (not SPA index.html).
 */
test.describe('mathexam template downloads', () => {
  test('serves mathexam.sty and template zip (not SPA fallback)', async ({ request }) => {
    const styRes = await request.get('/downloads/mathexam.sty');
    expect(styRes.status()).toBe(200);
    expect(styRes.headers()['content-type'] || '').toMatch(/text\/plain/);
    expect(styRes.headers()['content-disposition'] || '').toMatch(/mathexam\.sty/i);
    const styBody = await styRes.text();
    expect(styBody.slice(0, 20)).not.toMatch(/<!doctype/i);
    expect(styBody).toMatch(/\\ProvidesPackage\{mathexam\}/);
    expect(styBody).toMatch(/v2\.3\.3/);

    const zipRes = await request.get('/downloads/mathexam-v2.3.3.zip');
    expect(zipRes.status()).toBe(200);
    expect(zipRes.headers()['content-type'] || '').toMatch(/application\/zip/);
    expect(zipRes.headers()['content-disposition'] || '').toMatch(/mathexam-v2\.3\.3\.zip/i);
    const zipBuf = await zipRes.body();
    expect(zipBuf.length).toBeGreaterThan(500);
    expect(zipBuf.slice(0, 2).toString('utf8')).toBe('PK');
    expect(zipBuf.slice(0, 4).toString('utf8')).not.toBe('<!DO');
  });
});
