import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weeklyWeatherUrl,weeklyWeatherRows} from '../src/v854-weather-desktop.js';
import {MOBILE_SCALE_BLOCKERS} from '../src/map-scale-docking.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Dongjak seven-day weather explicitly requests source data with Korea timezone',()=>{
 const url=new URL(weeklyWeatherUrl());
 assert.equal(url.hostname,'api.open-meteo.com');
 assert.equal(url.searchParams.get('forecast_days'),'7');
 assert.equal(url.searchParams.get('timezone'),'Asia/Seoul');
 assert.ok(url.searchParams.get('daily').includes('temperature_2m_max'));
 assert.ok(url.searchParams.get('daily').includes('precipitation_probability_max'));
 assert.equal(url.searchParams.get('latitude'),'37.4987');
});

test('seven-day source-normalizer validates dates, numbers and does not fabricate missing days',()=>{
 const days=['2026-11-21','2026-11-22','2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27'];
 const data={daily:{time:days,weather_code:[0,1,3,61,71,80,95],temperature_2m_max:[-3,2,4,5,0,-1,6],temperature_2m_min:[-7,-5,-2,0,-4,-7,1],precipitation_probability_max:[0,10,20,90,80,60,75]}};
 const rows=weeklyWeatherRows(data);
 assert.equal(rows.length,7);assert.equal(rows[0].dayLabel,'오늘');assert.equal(rows[0].condition,'맑음');
 assert.equal(rows[0].min,-7);assert.equal(rows[3].condition,'비');assert.equal(rows[6].condition,'뇌우');
 assert.deepEqual(rows.map(r=>r.precipitation),data.daily.precipitation_probability_max);
 assert.throws(()=>weeklyWeatherRows({...data,daily:{...data.daily,time:days.slice(0,6)}}),/7일 예보/);
 assert.throws(()=>weeklyWeatherRows({...data,daily:{...data.daily,time:['날짜 오류',...days.slice(1)]}}),/예보 날짜 오류/);
 assert.throws(()=>weeklyWeatherRows({...data,daily:{...data.daily,temperature_2m_max:[NaN,...data.daily.temperature_2m_max.slice(1)]}}),/예보 기온/);
 const missing={...data,daily:{...data.daily,weather_code:[null,...data.daily.weather_code.slice(1)]}};
 assert.throws(()=>weeklyWeatherRows(missing),/예보 기온/);
 const missingRain=weeklyWeatherRows({...data,daily:{...data.daily,precipitation_probability_max:[null,...data.daily.precipitation_probability_max.slice(1)]}});
 assert.equal(missingRain[0].precipitation,null,'missing source precipitation must not appear as 0%');
});

test('PRI uses three-source composite and five vulnerability levels with one disclosure',()=>{
 const js=source('src/pri-map.js'),css=source('src/pri-map.css');
 assert.match(js,/종합 보행 취약도 · 현재 3개 지표/);
 assert.doesNotMatch(js,/options\.unshift\(\['pri12'/);
 for(const t of ['낮음','주의','보통','높음','매우 높음','평가 기준 보기','dj-pri-detail-wrap','aria-expanded','data-dj-pri-visible'])assert.ok(js.includes(t)||css.includes(t),t);
 assert.match(css,/grid-template-rows:0fr/);assert.match(css,/grid-template-rows:1fr/);
 assert.match(css,/maplibregl-ctrl-bottom-left/);
 assert.match(js,/delete app\.dataset\.djPriVisible/);
 assert.match(css,/\.dj-pri-button\{[^}]*min-height:44px/);
 assert.match(css,/\.dj-pri-legend \.dj-pri-button\{min-height:44px/);
});

test('map scale uses the same visibility blockers as PRI and the layer sheet',()=>{
 for(const s of ['#djNext-layer-panel','#djNext-permissions','#dj-pri-legend','#dj-pri-dialog'])assert.ok(MOBILE_SCALE_BLOCKERS.includes(s));
});

test('iOS onboarding status sample matches first-run background and optional permission dialog does not dim it',()=>{
 const status=source('src/mobile-pwa-status-tone-v793.js');
 assert.match(status,/const onboarding=visible\('dj860-onboarding'\)/);
 assert.match(status,/\(startup\|\|onboarding\)\?baselineColor\(\)/);
 assert.doesNotMatch(status,/#f5faf7/);
 assert.doesNotMatch(status,/\['map-gesture-guide','djNext-layer-panel','djNext-permissions'/);
});
