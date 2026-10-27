// @level infrastructure
/**
 * Everything this process has opened that must not outlive it.
 *
 * A `finally` covers a throw. It does not cover Ctrl-C, and it does not cover a
 * crash — and a leaked listener is not a tidiness problem here: the next run
 * finds a port held by a process nobody owns, and a harness that trusts what is
 * listening walks it (coordinator, 2026-09-07). Everything registers, and the
 * process closes the lot on its way out however it leaves.
 */
const openThings = new Set();

function closeEverything() {
  for (const close of [...openThings]) {
    openThings.delete(close);
    try { close(); } catch { /* going away anyway */ }
  }
}

let hooked = false;
function hookExit() {
  if (hooked) return;
  hooked = true;
  process.on("exit", closeEverything);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.on(signal, () => { closeEverything(); process.exit(130); });
  process.on("uncaughtException", (e) => { closeEverything(); throw e; });
}

/** Register a thing to be closed, and hand back a close that only runs once. */
export function owned(close) {
  hookExit();
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    openThings.delete(once);
    try { close(); } catch { /* already gone */ }
  };
  openThings.add(once);
  return once;
}
