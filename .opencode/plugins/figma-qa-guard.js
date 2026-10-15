import {isCritiqueReadTool} from './figma-critique-guard.js';
import {installQAGuard} from '../../rules/figma-qa-guard.mjs';

export default {id:'figma-qa-guard',setup:ctx=>installQAGuard(ctx,isCritiqueReadTool)};
