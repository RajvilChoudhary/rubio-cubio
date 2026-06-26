#pragma once
#include <string>

// Public API for the Rubik's Cube Solver
// Input: 54-character state string (e.g. UUUUUUUUURRRRRRRRRFFFFFFFFF...)
// Output: Space-separated solution moves (e.g. "U2 R L' F D2 ...")
extern "C" {
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
const char* solveCube(const char* state_str);
}
