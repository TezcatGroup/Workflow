// Transformaciones exclusivas de esta imagen; no cambian los fuentes del host.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const assets = 'static/universidad-fonts';
await mkdir(assets, { recursive: true });
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  return response;
}
for (const file of ['src/routes/login/+page.svelte', 'src/lib/components/EncabezadoApp.svelte']) {
  let source = await readFile(file, 'utf8');
  source = source.replace(/<link\s+rel="preconnect"[^>]*\/>/g, '');
  for (const match of source.matchAll(/https:\/\/fonts\.googleapis\.com\/css2[^"\s]+/g)) {
    const url = match[0];
    let css = await (await download(url)).text();
    for (const font of [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) ?? [])]) {
      const name = createHash('sha256').update(font).digest('hex') + '.font';
      await writeFile(`${assets}/${name}`, Buffer.from(await (await download(font)).arrayBuffer()));
      css = css.replaceAll(font, `/universidad-fonts/${name}`);
    }
    const name = createHash('sha256').update(url).digest('hex') + '.css';
    await writeFile(`${assets}/${name}`, css);
    source = source.replaceAll(url, `/universidad-fonts/${name}`);
  }
  await writeFile(file, source);
}
