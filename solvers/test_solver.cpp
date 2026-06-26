#include "solver.h"
#include "cube.h"
#include <iostream>
#include <cassert>
#include <chrono>

void testSolved() {
    std::cout << "[Test] Solved cube... " << std::flush;
    CubeState solved;
    const char* solution = solveCube(solved.str().c_str());
    assert(std::string(solution) == "");
    std::cout << "PASSED" << std::endl;
}

void testSingleMove() {
    std::cout << "[Test] Single move (R)... " << std::flush;
    CubeState s;
    applyMove(s, "R");
    const char* solution = solveCube(s.str().c_str());
    std::cout << "Solution: \"" << solution << "\" ... " << std::flush;
    applySequence(s, solution);
    assert(s.isSolved());
    std::cout << "PASSED" << std::endl;
}

void testSequence(const std::string& seq) {
    std::cout << "[Test] Sequence: \"" << seq << "\"... " << std::flush;
    CubeState s;
    applySequence(s, seq);
    auto t1 = std::chrono::high_resolution_clock::now();
    const char* solution = solveCube(s.str().c_str());
    auto t2 = std::chrono::high_resolution_clock::now();
    std::chrono::duration<double, std::milli> ms = t2 - t1;
    std::cout << "Solution: \"" << solution << "\" (" << ms.count() << " ms) ... " << std::flush;
    applySequence(s, solution);
    assert(s.isSolved());
    std::cout << "PASSED" << std::endl;
}

int main() {
    std::cout << "Running Rubik's Cube Solver Tests..." << std::endl;
    
    // Solved
    testSolved();
    
    // Single move
    testSingleMove();
    
    // Simple sequences
    testSequence("R U R' U'");
    testSequence("F R U R' U' F'");
    testSequence("R2 U2 R2 U2 R2 U2");
    
    // Complex scrambles
    testSequence("R U2 R' U' R U' R' L R2 D R' U R D' R' U' R' U' L'");
    testSequence("D2 F2 D2 B2 R2 D2 F2 L2 F2 U' L D2 B' D F' R B D2 R2 B'");
    testSequence("F2 L' B2 R F2 D2 R' U2 R2 D2 L' D2 B' R2 B2 U L2 R U2 F'");
    testSequence("B2 D2 L2 U2 F2 R2 B2 D F2 U L2 R U' B D' B2 L F' D U'");
    
    std::cout << "All tests passed successfully!" << std::endl;
    return 0;
}
