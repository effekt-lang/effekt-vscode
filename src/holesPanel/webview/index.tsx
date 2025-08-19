import { createRoot } from 'react-dom/client';
import { HolesPanel } from './holesPanel';

const container = document.getElementById('react-root');
if (!container) {
  throw new Error('Root container missing');
}
const showHoles = container.dataset.showHoles === 'true';
const agentSupport = container.dataset.agentSupport === 'true';
createRoot(container).render(
  <HolesPanel initShowHoles={showHoles} agentSupport={agentSupport} />,
);
