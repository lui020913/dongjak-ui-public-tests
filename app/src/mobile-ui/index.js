/** One stable import path for shared mobile UI lifecycle controllers.
 * Functional implementations remain in their designated modules, rather than
 * being duplicated into a version-specific hotfix or another click listener.
 */
export {installMobileLayoutCoordinator} from '../mobile-ui-coordinator.js';
export {installBottomTabNavigation} from '../bottom-tab-navigation.js';
