#include "solver.h"
#include <iostream>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: solver <state_string>" << std::endl;
        return 1;
    }
    const char* solution = solveCube(argv[1]);
    std::cout << solution << std::endl;
    return 0;
}
