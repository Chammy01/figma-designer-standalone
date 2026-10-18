# Agent Presence event audit — V1.5.0

Baseline: `cf4510348a190b1af9fad583963329aceaed7eab`. OpenCode 2.0.28;
existing fixture coverage also exercises 2.0.24. Audit performed before implementation.

## Actual observation surface

`Runs.work` reads the existing session context every 700 ms, sliced at its submission
offset. The Web UI polls existing application endpoints every 1500 ms. No event
stream, hook, extra agent, model request or transport is needed.

The retained, non-sensitive acceptance session was read through the existing
authenticated OpenCode client without submitting work. It contained 14 user,
128 assistant, 14 idle and 3 system messages; 153 completed and 3 error tool records.
These counts describe that sample, not a guaranteed event sequence. Older saved
snapshots also contain `model-switched` and `synthetic` messages. None are animation
instructions.

| Observable | Exact shape / boundary |
| --- | --- |
| User | `{id,time,type:'user',text}`; never read text for presence. |
| Assistant | `{id,time,type:'assistant',agent,model,content,finish,...}`. Content can contain reasoning, text and tools. Only tool discriminators/names/statuses and safe final workflow markers are relevant. |
| Tool | `{type:'tool',id,name,executed,state,time}`. Completed state has `status,input,content,metadata`; error state has `status,input,error`. |
| Tool timing | `time.created`, `time.ran`, `time.completed`. Polling may see completion only; it does not prove a visible start event was captured. |
| Code Mode | Tool `execute` exposes `state.metadata.toolCalls[]`, with `{tool,status,input?}`. Observed names include `figma.get_node`, `figma.get_design_context`, `figma.get_pages`. Use only the allowlisted name/status, never the code/input. |
| Local tools | `read`, `write`, `shell`, `glob` and opaque execution also occur. A shell command is not proof of a Figma write or a particular workflow step. |
| Idle | `{id,time,type:'idle',outcome}`; existing Runs interprets succeeded/failed/interrupted. Presence does not reinterpret orchestration. |
| Errors | Existing safeError output supplies bounded provider-auth/model/rate-limit/connection categories. Raw provider exceptions never become presence copy. |
| Input needed | Existing `WAITING_FOR_USER` comes from idle without a canonical completion marker. The assistant's question remains in the conversation; presence uses fixed safe text. |
| Cancellation | Native interrupt request followed by idle/interrupted. Requesting cancellation is not proof of rollback. |
| Recovery | Existing `checking`, `responseLost`, `recovery`, `recoveryEvidence.counts/complete` and `integrity`. Presence never looks up receipts, retries or changes these fields. |
| QA result | Existing validated `run.validation` contains bounded kind/status; its canonical result and zero-write integrity remain authoritative. |
| Browser result | Existing final workflow marker and existing validation dashboard/report. A completed run is not necessarily a passing test. No counts inferred from prose. |
| Modes | AUTO, DESIGN, QA, BROWSER, BROWSER_TEST, STATUS. Explicit mode is known intent, not proof that a specific tool has executed. |
| Restart | Existing recovery record retains only bounded run/session/state metadata. It excludes contexts and progress history. Restore a static terminal/recovery presence; never replay context or operations for animation. |

## Implementation constraints from the audit

- Tool records mutate in place while running: rescan unfinished and newest messages,
  plus appended messages. Deduplicate by private record ID/status; IDs stay off the UI.
- Use structured Code Mode tool traces. Do not parse command strings, descriptions,
  user prompts, tool arguments, reasoning or tool output to guess activity.
- Unknown tools have a neutral fallback. No fabricated layout plan, pending stages,
  task percentages or inferred screen counts.
- Short operations may appear as completed observations. Use completed-action copy
  and stop the working animation; do not artificially delay or replay work.
- Safety/recovery/checkpoint/result code remains authoritative and independent.
- No new MCP capability is needed. MCP 1.1.0 / protocol 2 / 108 tools is unchanged.
## Live compatibility correction

Native OpenCode 2.0.28 records observed during the first Studio generation retained `executed: false` while `state.status` was `running`/`completed` and structured Code Mode traces contained completed Figma calls. The initial observer incorrectly discarded those records. The corrected observer uses explicit native status, not that legacy boolean, as execution evidence. Pending/missing status still cannot claim work. This affects presentation only; existing submission/recovery decisions are unchanged. The exact shape has a deterministic regression test. The first live attempt is retained as a failed presence probe and must not be relabeled as a passing sequence.
