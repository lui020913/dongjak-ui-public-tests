/** v7.10.4 safety drawer UI enhancement. Original map startup is unchanged. */
import './safety-workbench-v7103.css';
import './safety-polish-v7104.css';
import { installSafetyWorkbenchUI } from './safety-workbench-v7103.js';

function attachSafetyUI() {
  installSafetyWorkbenchUI(document);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachSafetyUI, { once: true });
} else {
  attachSafetyUI();
}
