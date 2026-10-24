# Portal OS domain boundary

The existing kernel implementation is in `apps/worker/src/kernel.ts`; older `src/kernel` imports re-export the relocated code. This directory is available for future runtime-independent domain modules.
