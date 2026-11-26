/** One map click may dispatch both a generic map event and a named POI
 * layer event. A named hit must win; defer empty-coordinate handling until
 * MapLibre finishes its synchronous event fan-out. No timers or API calls. */
export function createRouteMapPickArbiter(enqueue=queueMicrotask){
 let generation=0;
 return {
  defer(fallback){
   const token=++generation;
   enqueue(()=>{if(token===generation)fallback();});
  },
  named(accept){
   // Even a rejected named hit must not silently choose the ground beneath it.
   ++generation;
   return accept();
  },
  cancel(){++generation;}
 };
}
