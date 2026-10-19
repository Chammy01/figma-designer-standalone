import { installIntentRouter } from '../../rules/figma-intent-router.mjs';
import { installBrowserTestWorkflow } from '../../rules/browser-test-workflow.mjs';

export default {
  id: 'figma-browser-test-guard',
  async setup(ctx) {
    await installIntentRouter(ctx);
    await installBrowserTestWorkflow(ctx);
  },
};
