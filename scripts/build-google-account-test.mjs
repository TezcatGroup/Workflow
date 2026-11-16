// Genera el test de integración para ejecutarlo en una instancia Docker aislada.
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const esbuild=require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('vite'))]}));
const outfile=process.argv[2];if(!outfile)throw new Error('Indica archivo de salida .mjs');
await esbuild.build({entryPoints:['scripts/verify-google-accounts.ts'],outfile,bundle:true,platform:'node',format:'esm',packages:'external',
 alias:{'$lib':path.resolve('src/lib')},plugins:[{name:'svelte-test-env',setup(b){
 b.onResolve({filter:/^\$(env\/dynamic\/private|app\/environment)$/},args=>({path:args.path,namespace:'test-env'}));
 b.onLoad({filter:/.*/,namespace:'test-env'},args=>({contents:args.path.includes('dynamic')?'export const env=process.env;':'export const dev=false;',loader:'js'}));
 }}]});
