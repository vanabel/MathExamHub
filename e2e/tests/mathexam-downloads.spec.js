const { test, expect } = require('@playwright/test');

test.describe('mathexam template downloads', () => {
  test('serves mathexam.sty and template zip with expected content types', async ({ request }) => {
    const styRes = await request.get('/downloads/mathexam.sty');
    expect(styRes.status()).toBe(200);
    expect(styRes.headers()['content-type'] || '').toMatch(/text\/plain|application\/octet-stream/);
    const styBody = await styRes.text();
    expect(styBody).toMatch(/\\ProvidesPackage\{mathexam\}/);
    expect(styBody).toMatch(/v2\.3\.3/);

    const zipRes = await request.get('/downloads/mathexam-v2.3.3.zip');
    expect(zipRes.status()).toBe(200);
    expect(zipRes.headers()['content-type'] || '').toMatch(/zip|octet-stream/);
    const zipBuf = await zipRes.body();
    expect(zipBuf.length).toBeGreaterThan(500);
    expect(zipBuf.slice(0, 2).toString('utf8')).toBe('PK');
  });
});
