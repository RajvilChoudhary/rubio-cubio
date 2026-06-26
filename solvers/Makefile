# Compiler settings
CXX = g++
CXXFLAGS = -O3 -std=c++11 -Wall

# Targets
.PHONY: all test wasm clean run-test

all: test

test: test_solver.exe

test_solver.exe: test_solver.cpp solver.cpp solver.h cube.h
	$(CXX) $(CXXFLAGS) test_solver.cpp solver.cpp -o test_solver.exe

solver.exe: cli_solver.cpp solver.cpp solver.h cube.h
	$(CXX) $(CXXFLAGS) cli_solver.cpp solver.cpp -o solver.exe

run-test: test_solver.exe
	./test_solver.exe

# Compile to WebAssembly using Emscripten (requires emsdk)
# Emscripten compilation command:
wasm: solver.cpp solver.h cube.h
	emcc -O3 -std=c++11 solver.cpp -o ../public/solver.js \
		-s EXPORTED_FUNCTIONS="['_solveCube']" \
		-s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','stringToUTF8','UTF8ToString']" \
		-s SINGLE_FILE=1 \
		-s MODULARIZE=1 \
		-s EXPORT_NAME="createSolverModule"

clean:
	rm -f test_solver.exe test_solver.o solver.o
