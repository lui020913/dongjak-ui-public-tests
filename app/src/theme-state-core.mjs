/** One owner for the user's preferred theme and an optional temporary night theme.
 * Pure module; safe to unit-test without a DOM or MapLibre. */
export function createThemeState(initial='light') {
  let preference=initial==='dark'?'dark':'light';
  let temporary=null;
  const valid=value=>value==='light'||value==='dark';
  return Object.freeze({
    get value(){return temporary||preference;},
    get preference(){return preference;},
    get temporary(){return temporary;},
    choose(value){if(!valid(value))return false;preference=value;return true;},
    toggle(){preference=preference==='dark'?'light':'dark';return preference;},
    override(value){if(value!==null&&!valid(value))return false;temporary=value;return true;},
    snapshot(){return {theme:temporary||preference,preference,temporary};}
  });
}
