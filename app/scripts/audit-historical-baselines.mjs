/** Deliberately re-enable archived historical SHA expectations to reveal drift. */
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
const tests=readdirSync(new URL('../tests/',import.meta.url)).filter(s=>s.endsWith('.test.mjs')).map(s=>`tests/${s}`);
const r=spawnSync(process.execPath,['--test',...tests],{stdio:'inherit',env:{...process.env,DJ_HISTORICAL_SNAPSHOT_AUDIT:'1'}});
process.exit(r.status??1);
