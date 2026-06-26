declare module '*/cube.js' {
  export default class Cube {
    static initSolver(): void;
    static fromString(state: string): Cube;
    solve(): string;
    randomize(): void;
    asString(): string;
    move(moves: string): void;
  }
}
