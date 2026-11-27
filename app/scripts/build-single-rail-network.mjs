import {readFileSync,writeFileSync} from 'node:fs';
import {singleRailAlignments} from './single-rail-alignments.mjs';
const input=new URL('../data-source/seoul-rail-network-raw.geojson',import.meta.url),output=new URL('../public/data/transport/seoul-rail-network.geojson',import.meta.url);
writeFileSync(output,JSON.stringify(singleRailAlignments(JSON.parse(readFileSync(input,'utf8'))))+'\n');
