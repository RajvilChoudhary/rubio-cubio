const fs = require('fs');

let c = fs.readFileSync('node_modules/cubejs/lib/cube.js', 'utf8');
let s = fs.readFileSync('node_modules/cubejs/lib/solve.js', 'utf8');

// --- Fix cube.js ---
// Replace the globals block (module.exports / this.Cube) with a simple assignment to __Cube
c = c.replace(
`  //# Globals
  if (typeof module !== "undefined" && module !== null) {
    module.exports = Cube;
  } else {
    this.Cube = Cube;
  }

}).call(this);`,
`  __Cube = Cube;
}).call({});`
);

// Replace all remaining .call(this) with .call({}) to avoid needing a global `this`
c = c.replace(/\}\)\.call\(this\);/g, '}).call({});');

// Prepend the shared variable declaration
c = `var __Cube;\n` + c;

// --- Fix solve.js ---
// Replace the require/this.Cube lookup with our local var
s = s.replace(
  `Cube = this.Cube || require('./cube');`,
  `Cube = __Cube;`
);
s = s.replace(/\}\)\.call\(this\);/g, '}).call({});');

// --- Combine into clean ES module ---
const out = c + '\n' + s + '\nexport default __Cube;\n';
fs.writeFileSync('src/cubeBundle.js', out);
console.log('Bundle created successfully!');

// Quick sanity check: make sure key strings are present
if (!out.includes('initSolver') || !out.includes('export default __Cube')) {
  console.error('ERROR: Bundle is missing expected content!');
  process.exit(1);
}
console.log('Sanity check passed: initSolver and export default found.');
