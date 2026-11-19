import test from 'node:test';
/**
 * These checks require literal bytes from a specific 2026 historical release.
 * They cannot evaluate a changed current engine. Keep them unchanged and
 * executable via `npm run test:historical`; the default release test runs
 * current behavior contracts instead of requiring rollback to v7/v8.0.
 */
export function historicalSnapshotTest(name,fn){
  return test(name,{
    skip:process.env.DJ_HISTORICAL_SNAPSHOT_AUDIT==='1'?false:
      'Historical byte snapshot: run npm run test:historical to audit intentional drift'
  },fn);
}
