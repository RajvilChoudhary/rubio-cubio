#pragma once
#include <string>
#include <vector>
#include <array>
#include <sstream>
#include <cstring>

// ============================================================
//  54-sticker Rubik's Cube representation
//  Index layout (Kociemba standard):
//
//              U0  U1  U2
//              U3  U4  U5
//              U6  U7  U8
//  L0  L1  L2  F0  F1  F2  R0  R1  R2  B0  B1  B2
//  L3  L4  L5  F3  F4  F5  R3  R4  R5  B3  B4  B5
//  L6  L7  L8  F6  F7  F8  R6  R7  R8  B6  B7  B8
//              D0  D1  D2
//              D3  D4  D5
//              D6  D7  D8
//
//  Absolute indices: U=0..8  R=9..17  F=18..26  D=27..35  L=36..44  B=45..53
// ============================================================

struct CubeState {
    char f[54];

    CubeState() {
        const char* faces = "URFDLB";
        for (int i = 0; i < 6; i++)
            for (int j = 0; j < 9; j++)
                f[i * 9 + j] = faces[i];
    }

    CubeState(const std::string& s) {
        for (int i = 0; i < 54 && i < (int)s.size(); i++)
            f[i] = s[i];
    }

    std::string str() const { return std::string(f, 54); }

    bool isSolved() const {
        const char* faces = "URFDLB";
        for (int i = 0; i < 6; i++)
            for (int j = 0; j < 9; j++)
                if (f[i * 9 + j] != faces[i]) return false;
        return true;
    }

    bool operator==(const CubeState& o) const { return memcmp(f, o.f, 54) == 0; }
    bool operator!=(const CubeState& o) const { return !(*this == o); }
};

// Permutations as "is carried to" mappings: new_state[perm[i]] = old_state[i]
const int PERM_U[54] = {
    2, 5, 8, 1, 4, 7, 0, 3, 6, 18, 19, 20, 12, 13, 14, 15, 16, 17, 36, 37, 38, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 45, 46, 47, 39, 40, 41, 42, 43, 44, 9, 10, 11, 48, 49, 50, 51, 52, 53
};
const int PERM_R[54] = {
    0, 1, 51, 3, 4, 48, 6, 7, 45, 11, 14, 17, 10, 13, 16, 9, 12, 15, 18, 19, 2, 21, 22, 5, 24, 25, 8, 27, 28, 20, 30, 31, 23, 33, 34, 26, 36, 37, 38, 39, 40, 41, 42, 43, 44, 35, 46, 47, 32, 49, 50, 29, 52, 53
};
const int PERM_F[54] = {
    0, 1, 2, 3, 4, 5, 9, 12, 15, 29, 10, 11, 28, 13, 14, 27, 16, 17, 20, 23, 26, 19, 22, 25, 18, 21, 24, 38, 41, 44, 30, 31, 32, 33, 34, 35, 36, 37, 8, 39, 40, 7, 42, 43, 6, 45, 46, 47, 48, 49, 50, 51, 52, 53
};
const int PERM_D[54] = {
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 51, 52, 53, 18, 19, 20, 21, 22, 23, 15, 16, 17, 29, 32, 35, 28, 31, 34, 27, 30, 33, 36, 37, 38, 39, 40, 41, 24, 25, 26, 45, 46, 47, 48, 49, 50, 42, 43, 44
};
const int PERM_L[54] = {
    18, 1, 2, 21, 4, 5, 24, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 27, 19, 20, 30, 22, 23, 33, 25, 26, 53, 28, 29, 50, 31, 32, 47, 34, 35, 38, 41, 44, 37, 40, 43, 36, 39, 42, 45, 46, 6, 48, 49, 3, 51, 52, 0
};
const int PERM_B[54] = {
    42, 39, 36, 3, 4, 5, 6, 7, 8, 9, 10, 0, 12, 13, 1, 15, 16, 2, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 17, 14, 11, 33, 37, 38, 34, 40, 41, 35, 43, 44, 47, 50, 53, 46, 49, 52, 45, 48, 51
};

inline CubeState applyPerm(const CubeState& s, const int perm[54]) {
    CubeState next_state;
    for (int i = 0; i < 54; i++) {
        next_state.f[perm[i]] = s.f[i];
    }
    return next_state;
}

inline void moveU(CubeState& s) { s = applyPerm(s, PERM_U); }
inline void moveR(CubeState& s) { s = applyPerm(s, PERM_R); }
inline void moveF(CubeState& s) { s = applyPerm(s, PERM_F); }
inline void moveD(CubeState& s) { s = applyPerm(s, PERM_D); }
inline void moveL(CubeState& s) { s = applyPerm(s, PERM_L); }
inline void moveB(CubeState& s) { s = applyPerm(s, PERM_B); }

inline void applyMove(CubeState& s, const std::string& m) {
    if (m == "U")  { moveU(s); }
    else if (m == "U'") { moveU(s); moveU(s); moveU(s); }
    else if (m == "U2") { moveU(s); moveU(s); }
    else if (m == "D")  { moveD(s); }
    else if (m == "D'") { moveD(s); moveD(s); moveD(s); }
    else if (m == "D2") { moveD(s); moveD(s); }
    else if (m == "R")  { moveR(s); }
    else if (m == "R'") { moveR(s); moveR(s); moveR(s); }
    else if (m == "R2") { moveR(s); moveR(s); }
    else if (m == "L")  { moveL(s); }
    else if (m == "L'") { moveL(s); moveL(s); moveL(s); }
    else if (m == "L2") { moveL(s); moveL(s); }
    else if (m == "F")  { moveF(s); }
    else if (m == "F'") { moveF(s); moveF(s); moveF(s); }
    else if (m == "F2") { moveF(s); moveF(s); }
    else if (m == "B")  { moveB(s); }
    else if (m == "B'") { moveB(s); moveB(s); moveB(s); }
    else if (m == "B2") { moveB(s); moveB(s); }
}

inline void applySequence(CubeState& s, const std::string& seq) {
    std::istringstream iss(seq);
    std::string m;
    while (iss >> m) applyMove(s, m);
}

inline std::vector<std::string> parseMoves(const std::string& seq) {
    std::vector<std::string> moves;
    std::istringstream iss(seq);
    std::string m;
    while (iss >> m) moves.push_back(m);
    return moves;
}
