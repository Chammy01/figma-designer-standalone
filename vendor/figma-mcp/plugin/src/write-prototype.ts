function buildReaction(r: any): Reaction {
  // `actions` (plural array) is the current API; `action` (singular) is deprecated.
  // Accept either form so callers don't need to worry about the distinction.
  const actions: Action[] = r.actions ?? (r.action != null ? [r.action] : []);
  return { trigger: r.trigger ?? null, actions } as Reaction;
}

// The MCP framework may pass array params as a JSON string. Parse defensively.
function parseArray(v: any, name: string): any[] {
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { throw new Error(`${name} must be an array`); }
  }
  if (!Array.isArray(v)) throw new Error(`${name} must be an array`);
  return v;
}

const isObject = (v: any) => v !== null && typeof v === "object" && !Array.isArray(v);
const triggerTypes = new Set(["ON_CLICK", "ON_HOVER", "ON_PRESS", "ON_DRAG", "AFTER_TIMEOUT", "MOUSE_ENTER", "MOUSE_LEAVE", "MOUSE_UP", "MOUSE_DOWN", "ON_KEY_DOWN", "ON_MEDIA_HIT", "ON_MEDIA_END"]);
const actionTypes = new Set(["NODE", "BACK", "CLOSE", "URL", "CONDITIONAL", "SET_VARIABLE", "SET_VARIABLE_MODE", "UPDATE_MEDIA_RUNTIME"]);

function validateAction(action: any): void {
  if (!isObject(action) || !actionTypes.has(action.type)) throw new Error("Invalid reaction action");
  if (action.type === "NODE") {
    if (!["NAVIGATE", "SWAP", "OVERLAY", "SCROLL_TO", "CHANGE_TO"].includes(action.navigation)) throw new Error("Invalid NODE navigation");
    if ("destinationId" in action && action.destinationId !== null && typeof action.destinationId !== "string") throw new Error("Invalid destinationId");
    if ("transition" in action && action.transition !== null) {
      const t = action.transition;
      if (!isObject(t) || !["DISSOLVE", "SMART_ANIMATE", "SCROLL_ANIMATE", "MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"].includes(t.type) || !Number.isFinite(t.duration) || t.duration < 0 || !isObject(t.easing) || typeof t.easing.type !== "string") throw new Error("Invalid transition");
    }
  }
  if (action.type === "URL" && (typeof action.url !== "string" || !action.url)) throw new Error("Invalid URL action");
  for (const key of action.type === "SET_VARIABLE" ? ["variableId"] : action.type === "SET_VARIABLE_MODE" ? ["variableCollectionId", "variableModeId"] : []) {
    if (!(key in action) || (action[key] !== null && typeof action[key] !== "string")) throw new Error(`Invalid ${key}`);
  }
  if (action.type === "UPDATE_MEDIA_RUNTIME") {
    if (!["PLAY", "PAUSE", "TOGGLE_PLAY_PAUSE", "MUTE", "UNMUTE", "TOGGLE_MUTE_UNMUTE", "SKIP_FORWARD", "SKIP_BACKWARD", "SKIP_TO"].includes(action.mediaAction)) throw new Error("Invalid mediaAction");
    const field = action.mediaAction === "SKIP_TO" ? "newTimestamp" : action.mediaAction.startsWith("SKIP_") ? "amountToSkip" : null;
    if (field && (!Number.isFinite(action[field]) || action[field] < 0)) throw new Error(`Invalid ${field}`);
    if ("destinationId" in action && action.destinationId !== null && typeof action.destinationId !== "string") throw new Error("Invalid media destinationId");
  }
  if (action.type === "CONDITIONAL") {
    if (!Array.isArray(action.conditionalBlocks)) throw new Error("Invalid conditionalBlocks");
    for (const block of action.conditionalBlocks) {
      if (!isObject(block) || !Array.isArray(block.actions)) throw new Error("Invalid conditional block actions");
      block.actions.forEach(validateAction);
    }
  }
}

function validateReaction(r: any): void {
  if (!isObject(r) || !("trigger" in r)) throw new Error("Reaction requires a trigger");
  if (r.trigger !== null) {
    if (!isObject(r.trigger) || !triggerTypes.has(r.trigger.type)) throw new Error("Invalid reaction trigger");
    const field = r.trigger.type === "AFTER_TIMEOUT" ? "timeout" : r.trigger.type.startsWith("MOUSE_") ? "delay" : r.trigger.type === "ON_MEDIA_HIT" ? "mediaHitTime" : null;
    if (field && (!Number.isFinite(r.trigger[field]) || r.trigger[field] < 0)) throw new Error(`Invalid trigger ${field}`);
    if (r.trigger.type === "ON_KEY_DOWN" && (!["KEYBOARD", "XBOX_ONE", "PS4", "SWITCH_PRO", "UNKNOWN_CONTROLLER"].includes(r.trigger.device) || !Array.isArray(r.trigger.keyCodes) || !r.trigger.keyCodes.every((v: any) => Number.isInteger(v) && v >= 0))) throw new Error("Invalid keyboard trigger");
  }
  if (!("actions" in r) && !("action" in r)) throw new Error("Reaction requires actions");
  if ("actions" in r) {
    if (!Array.isArray(r.actions)) throw new Error("Reaction actions must be an array");
    r.actions.forEach(validateAction);
  }
  if ("action" in r) validateAction(r.action);
}

// setReactionsAsync is required when documentAccess is "dynamic-page".
// Fall back to direct assignment only when setReactionsAsync is unavailable (older Figma).
async function setReactions(node: any, reactions: Reaction[]): Promise<void> {
  if (typeof node.setReactionsAsync === "function") {
    await node.setReactionsAsync(reactions);
    return;
  }
  try {
    node.reactions = reactions;
  } catch (e) {
    throw new Error(`Failed to set reactions: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export const handleWritePrototypeRequest = async (request: any) => {
  switch (request.type) {
    case "set_reactions": {
      const p = request.params || {};
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      if (!("reactions" in node)) throw new Error(`Node ${nodeId} does not support reactions`);

      if ("mode" in p && p.mode !== "replace" && p.mode !== "append") throw new Error("mode must be replace or append");
      const raw = parseArray(p.reactions, "reactions");
      raw.forEach(validateReaction);
      const incoming: Reaction[] = raw.map(buildReaction);
      const current: Reaction[] = (node as any).reactions;
      const final = p.mode === "append" ? [...current, ...incoming] : incoming;

      await setReactions(node, final);
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { id: node.id, name: (node as any).name, reactionCount: final.length },
      };
    }

    case "remove_reactions": {
      const p = request.params || {};
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      if (!("reactions" in node)) throw new Error(`Node ${nodeId} does not support reactions`);

      const current: Reaction[] = (node as any).reactions;
      let updated: Reaction[];
      if (!("indices" in p)) {
        // indices not provided → remove all
        updated = [];
      } else {
        const indices = parseArray(p.indices, "indices");
        if (!indices.every(v => Number.isInteger(v) && v >= 0)) throw new Error("indices must contain nonnegative integers");
        if (indices.length === 0) {
          // indices provided but empty → remove all
          updated = [];
        } else {
          const toRemove = new Set<number>(indices);
          updated = current.filter((_: any, i: number) => !toRemove.has(i));
        }
      }

      await setReactions(node, updated);
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          id: node.id,
          name: (node as any).name,
          removed: current.length - updated.length,
          reactionCount: updated.length,
        },
      };
    }

    default:
      return null;
  }
};
