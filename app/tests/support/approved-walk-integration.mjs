/**
 * One approved exception to the archived v7.0.29/v7.10.0 protected SHA lists.
 * The uploaded WALK_SAFETY_INTEGRATED v7.10.3 intentionally modifies src/main.js
 * to add Seoul pedestrian routing and opt-in safety layers. Other protected
 * files must still match their original SHA exactly. Do not rewrite the
 * historical baseline lists to disguise this intentional change.
 */
// v8.2.14 explicit authorized exception: route selections are constrained to the
// v8.3.2 approved guarded GPS completion and route boundary prompt;
// verified Dongjak polygon in src/main.js (search, map picks, facilities,
// waypoints and route calculation). All other code remains protected.
// The old v8.2.13 main.js hash is preserved in the release note audit log.
// v820 merged-walking main.js came from the user-provided Pretendard baseline.
// v823 online Pretendard unification updated style.css before the user's uploaded baseline.
export const APPROVED_V823_PRETENDARD_STYLE_SHA256='b7296c069f6891fb5e4417f22cae12f404d52d2e071f2047bdf9dd55056f9be8';
export const APPROVED_WALK_INTEGRATION_MAIN_SHA256 = '33c3f91f45f6e553d5f023a89afed30579026c667b6854ac7781a4108075d44a';
// v7.11.0 approved narrow exception: line selectors replace the duplicate
// transfer strip in transport-map.js. All other archived protected hashes remain.
export const APPROVED_V711_METRO_SHA256='a5afaa55afbf6f0128ae854befea1e785cc691cc5d44a4a01fc603d09bb4906f';
// v8.0.6: Only the two blue bus pictogram icon-size arrays were intentionally
// increased. See v806-approved-bus-icon-scope.test.mjs, which verifies that
// reversing precisely those two replacements yields the historical v7.11 hash.
// Do NOT replace historic baseline JSON files or weaken other file checks.
export const APPROVED_V806_BUS_ICON_SHA256='123cf7e41bd66f4a7076d8ab315d0b95134bfc9fe0f570fc32d95268df89776d';
// v809: another 4.8% increase in the same TWO approved icon-size arrays.
// All remaining transport rendering and API logic must remain identical.
export const APPROVED_V809_BUS_ICON_SHA256='827a6e31caea2e931c8946009204cb42faa2c2a521f4a94fcaac8db1943789c6';
// v818: only transport camera positioning is intentionally changed.
export const APPROVED_V818_TRANSPORT_FOCUS_SHA256='15c1bd89214dddbff3b0840994c89032f293076b9d837c2e380be6f5b6a93c3a';
// v8.5.3 approved desktop rail exception: move the original road-width button
// into the PC safety workspace while restoring its original parent below 1080px.
export const APPROVED_V853_DESKTOP_RAIL_SHA256='c9b5a15275bbaf733a86a7626988b7a338c6e10ac44a28ae6490bbd768f69399';
export function approvedProtectionHash(path, archivedSha){
  if(path==='src/main.js')return APPROVED_WALK_INTEGRATION_MAIN_SHA256;
  if(path==='src/style.css')return APPROVED_V823_PRETENDARD_STYLE_SHA256;
  if(path==='src/transport-map.js')return APPROVED_V818_TRANSPORT_FOCUS_SHA256;
  if(path==='src/v713-desktop-rail.js')return APPROVED_V853_DESKTOP_RAIL_SHA256;
  return archivedSha;
}

