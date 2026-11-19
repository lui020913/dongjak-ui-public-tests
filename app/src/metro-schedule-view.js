/**
 * Every subway line uses separate realtime and timetable views.
 * Korail Line 1 has an in-app full timetable; it is not merged into the live tab.
 */
export function isScheduleMergedStation(){
  return false;
}
