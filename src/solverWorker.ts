import Cube from './cubeBundle.js';

// Let the main thread know we are initializing
postMessage({ type: 'INIT_START' });

try {
  // Initialize the Kociemba pruning tables. This takes ~1-3 seconds.
  Cube.initSolver();
  // Tell the main thread we are ready
  postMessage({ type: 'INIT_DONE' });
} catch (e: any) {
  postMessage({ type: 'ERROR', error: 'Init failed: ' + e.message });
}

self.onmessage = (e: MessageEvent) => {
  if (e.data.type === 'SOLVE') {
    const { stateStr } = e.data;
    
    // Quick check for already-solved cube to avoid algorithm returning a redundant identity sequence
    if (stateStr === 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB') {
      postMessage({ type: 'SOLUTION', solution: '' });
      return;
    }
    
    try {
      // Parse the 54-char string and solve
      const cube = Cube.fromString(stateStr);
      const solution = cube.solve();
      postMessage({ type: 'SOLUTION', solution });
    } catch (err: any) {
      postMessage({ type: 'ERROR', error: err.message || 'Failed to solve cube state.' });
    }
  }
};
