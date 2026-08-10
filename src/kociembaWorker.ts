import { init, solve } from 'kociemba-wasm';

let ready = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, stateStr } = e.data;

  if (type === 'INIT') {
    try {
      await init();
      ready = true;
      self.postMessage({ type: 'INIT_DONE' });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: 'Wasm init failed: ' + (err?.message ?? err) });
    }
  } else if (type === 'SOLVE') {
    if (!ready) {
      self.postMessage({ type: 'ERROR', error: 'Solver not initialized yet.' });
      return;
    }
    try {
      const solution = await solve(stateStr);
      self.postMessage({ type: 'SOLUTION', solution });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err?.message ?? 'Solve failed' });
    }
  }
};
