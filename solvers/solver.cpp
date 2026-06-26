#include "solver.h"
#include "cube.h"
#include <vector>
#include <array>
#include <algorithm>
#include <iostream>

// Factorial function
static inline int factorial(int n) {
    if (n <= 1) return 1;
    if (n == 2) return 2;
    if (n == 3) return 6;
    if (n == 4) return 24;
    if (n == 5) return 120;
    if (n == 6) return 720;
    if (n == 7) return 5040;
    return 40320;
}

// ----------------------------------------------------------------------
// Constants & Structures
// ----------------------------------------------------------------------
static const int cornerIndices[8][3] = {
    {6, 18, 38},  // C0: UFL (U6, F0, L2)
    {8, 9, 20},   // C1: UFR (U8, R0, F2)
    {0, 36, 47},  // C2: UBL (U0, L0, B2)
    {2, 45, 11},  // C3: UBR (U2, B0, R2)
    {27, 44, 24}, // C4: DFL (D0, L8, F6)
    {29, 26, 15}, // C5: DFR (D2, F8, R6)
    {33, 53, 42}, // C6: DBL (D6, B8, L6)
    {35, 17, 51}  // C7: DBR (D8, R8, B6)
};

static const int edgeIndices[12][2] = {
    {7, 19},  // E0: UF
    {5, 10},  // E1: UR
    {1, 46},  // E2: UB
    {3, 37},  // E3: UL
    {28, 25}, // E4: DF
    {32, 16}, // E5: DR
    {34, 52}, // E6: DB
    {30, 43}, // E7: DL
    {23, 12}, // E8: FR
    {21, 41}, // E9: FL
    {50, 39}, // E10: BL
    {48, 14}  // E11: BR
};

static const std::string moves[18] = {
    "U", "U'", "U2", "D", "D'", "D2",
    "R", "R'", "R2", "L", "L'", "L2",
    "F", "F'", "F2", "B", "B'", "B2"
};

static const int p2_moves[10] = {0, 1, 2, 3, 4, 5, 8, 11, 14, 17};

// ----------------------------------------------------------------------
// Lookups and Tables
// ----------------------------------------------------------------------
static std::vector<int> combinationTable;
static int combinationMap[4096];

// Phase 1 Transition Tables
static int co_transition[2187][18];
static int eo_transition[2048][18];
static int slice_transition[495][18];

// Joint Phase 1 Pruning Tables
static unsigned char dist_slice_eo[1013760];
static unsigned char dist_slice_co[1082565];

// Phase 2 Transition Tables
static int cp_transition[40320][10];
static int ep_transition[40320][10];
static int slice_perm_transition[24][10];

// Joint Phase 2 Pruning Tables
static unsigned char dist_cp_sp[967680];
static unsigned char dist_ep_sp[967680];

static bool is_solver_initialized = false;

// ----------------------------------------------------------------------
// Encoding and Decoding Functions
// ----------------------------------------------------------------------
static void initCombinationTable() {
    combinationTable.clear();
    std::fill(combinationMap, combinationMap + 4096, -1);
    for (int i = 0; i < 4096; i++) {
        int bits = 0;
        for (int j = 0; j < 12; j++) {
            if (i & (1 << j)) bits++;
        }
        if (bits == 4) {
            combinationMap[i] = combinationTable.size();
            combinationTable.push_back(i);
        }
    }
}

static inline int getCombinationIndex(int mask) {
    return combinationMap[mask];
}

static int getCornerId(char a, char b, char c) {
    std::string s = "";
    s += a; s += b; s += c;
    std::sort(s.begin(), s.end());
    if (s == "FLU") return 0;
    if (s == "FRU") return 1;
    if (s == "BLU") return 2;
    if (s == "BRU") return 3;
    if (s == "DFL") return 4;
    if (s == "DFR") return 5;
    if (s == "BDL") return 6;
    if (s == "BDR") return 7;
    return -1;
}

static int getEdgeId(char a, char b) {
    if (a > b) std::swap(a, b);
    std::string s = "";
    s += a; s += b;
    if (s == "FU") return 0;
    if (s == "RU") return 1;
    if (s == "BU") return 2;
    if (s == "LU") return 3;
    if (s == "DF") return 4;
    if (s == "DR") return 5;
    if (s == "BD") return 6;
    if (s == "DL") return 7;
    if (s == "FR") return 8;
    if (s == "FL") return 9;
    if (s == "BL") return 10;
    if (s == "BR") return 11;
    return -1;
}

static void normalizeState(const CubeState& s, char mapping[256]) {
    std::fill(mapping, mapping + 256, 0);
    mapping[(unsigned char)s.f[4]] = 'U';
    mapping[(unsigned char)s.f[13]] = 'R';
    mapping[(unsigned char)s.f[22]] = 'F';
    mapping[(unsigned char)s.f[31]] = 'D';
    mapping[(unsigned char)s.f[40]] = 'L';
    mapping[(unsigned char)s.f[49]] = 'B';
}

static int encodeCO(const CubeState& s) {
    char mapping[256];
    normalizeState(s, mapping);
    int co = 0;
    for (int i = 0; i < 7; i++) {
        char c0 = mapping[(unsigned char)s.f[cornerIndices[i][0]]];
        char c1 = mapping[(unsigned char)s.f[cornerIndices[i][1]]];
        char c2 = mapping[(unsigned char)s.f[cornerIndices[i][2]]];
        int ori = 0;
        if (c0 == 'U' || c0 == 'D') ori = 0;
        else if (c1 == 'U' || c1 == 'D') ori = 1;
        else ori = 2;
        co = co * 3 + ori;
    }
    return co;
}

static int encodeEO(const CubeState& s) {
    char mapping[256];
    normalizeState(s, mapping);
    int eo = 0;
    for (int i = 0; i < 11; i++) {
        char c1 = mapping[(unsigned char)s.f[edgeIndices[i][0]]];
        char c2 = mapping[(unsigned char)s.f[edgeIndices[i][1]]];
        bool is_ud_edge = (c1 == 'U' || c1 == 'D' || c2 == 'U' || c2 == 'D');
        char primary_color;
        if (is_ud_edge) {
            primary_color = (c1 == 'U' || c1 == 'D') ? c1 : c2;
        } else {
            primary_color = (c1 == 'F' || c1 == 'B') ? c1 : c2;
        }
        int ori = (c1 == primary_color) ? 0 : 1;
        eo = eo * 2 + ori;
    }
    return eo;
}

static int encodeSlice(const CubeState& s) {
    char mapping[256];
    normalizeState(s, mapping);
    int occupied = 0;
    for (int i = 0; i < 12; i++) {
        char c1 = mapping[(unsigned char)s.f[edgeIndices[i][0]]];
        char c2 = mapping[(unsigned char)s.f[edgeIndices[i][1]]];
        if (c1 != 'U' && c1 != 'D' && c2 != 'U' && c2 != 'D') {
            occupied |= (1 << i);
        }
    }
    return getCombinationIndex(occupied);
}

static int encodePerm8(const int p[8]) {
    int index = 0;
    for (int i = 0; i < 8; i++) {
        index *= (8 - i);
        for (int j = i + 1; j < 8; j++) {
            if (p[j] < p[i]) index++;
        }
    }
    return index;
}

static int encodePerm4(const int p[4]) {
    int index = 0;
    for (int i = 0; i < 4; i++) {
        index *= (4 - i);
        for (int j = i + 1; j < 4; j++) {
            if (p[j] < p[i]) index++;
        }
    }
    return index;
}

static void getCornerPerm(const CubeState& s, int p[8]) {
    char mapping[256];
    normalizeState(s, mapping);
    for (int i = 0; i < 8; i++) {
        char c0 = mapping[(unsigned char)s.f[cornerIndices[i][0]]];
        char c1 = mapping[(unsigned char)s.f[cornerIndices[i][1]]];
        char c2 = mapping[(unsigned char)s.f[cornerIndices[i][2]]];
        p[i] = getCornerId(c0, c1, c2);
    }
}

static void getUDEdgePerm(const CubeState& s, int p[8]) {
    char mapping[256];
    normalizeState(s, mapping);
    for (int i = 0; i < 8; i++) {
        char c1 = mapping[(unsigned char)s.f[edgeIndices[i][0]]];
        char c2 = mapping[(unsigned char)s.f[edgeIndices[i][1]]];
        p[i] = getEdgeId(c1, c2);
    }
}

static void getSliceEdgePerm(const CubeState& s, int p[4]) {
    char mapping[256];
    normalizeState(s, mapping);
    for (int i = 0; i < 4; i++) {
        char c1 = mapping[(unsigned char)s.f[edgeIndices[8 + i][0]]];
        char c2 = mapping[(unsigned char)s.f[edgeIndices[8 + i][1]]];
        p[i] = getEdgeId(c1, c2) - 8;
    }
}

// ----------------------------------------------------------------------
// Cube State Reconstructors (For transition table generation)
// ----------------------------------------------------------------------
static CubeState getCOState(int co) {
    CubeState s;
    int temp = co;
    int ori[8];
    int sum_ori = 0;
    for (int i = 6; i >= 0; i--) {
        ori[i] = temp % 3;
        sum_ori += ori[i];
        temp /= 3;
    }
    ori[7] = (24 - sum_ori) % 3;

    for (int i = 0; i < 8; i++) {
        int i0 = cornerIndices[i][0];
        int i1 = cornerIndices[i][1];
        int i2 = cornerIndices[i][2];
        char c0 = s.f[i0];
        char c1 = s.f[i1];
        char c2 = s.f[i2];
        if (ori[i] == 1) {
            s.f[i0] = c2;
            s.f[i1] = c0;
            s.f[i2] = c1;
        } else if (ori[i] == 2) {
            s.f[i0] = c1;
            s.f[i1] = c2;
            s.f[i2] = c0;
        }
    }
    return s;
}

static CubeState getEOState(int eo) {
    CubeState s;
    int temp = eo;
    int ori[12];
    int sum_ori = 0;
    for (int i = 10; i >= 0; i--) {
        ori[i] = temp % 2;
        sum_ori += ori[i];
        temp /= 2;
    }
    ori[11] = (24 - sum_ori) % 2;

    for (int i = 0; i < 12; i++) {
        int i0 = edgeIndices[i][0];
        int i1 = edgeIndices[i][1];
        char c0 = s.f[i0];
        char c1 = s.f[i1];
        if (ori[i] == 1) {
            s.f[i0] = c1;
            s.f[i1] = c0;
        }
    }
    return s;
}

static CubeState getSliceState(int comb_idx) {
    CubeState s;
    int mask = combinationTable[comb_idx];
    char orig_colors[12][2];
    for (int i = 0; i < 12; i++) {
        orig_colors[i][0] = s.f[edgeIndices[i][0]];
        orig_colors[i][1] = s.f[edgeIndices[i][1]];
    }
    int e_idx = 8;
    int ud_idx = 0;
    for (int i = 0; i < 12; i++) {
        int i0 = edgeIndices[i][0];
        int i1 = edgeIndices[i][1];
        if (mask & (1 << i)) {
            s.f[i0] = orig_colors[e_idx][0];
            s.f[i1] = orig_colors[e_idx][1];
            e_idx++;
        } else {
            s.f[i0] = orig_colors[ud_idx][0];
            s.f[i1] = orig_colors[ud_idx][1];
            ud_idx++;
        }
    }
    return s;
}

static CubeState getCPState(int cp) {
    CubeState s;
    int p[8];
    int temp = cp;
    std::vector<int> available = {0, 1, 2, 3, 4, 5, 6, 7};
    for (int i = 0; i < 8; i++) {
        int radix = 8 - i;
        int k = temp / factorial(radix - 1);
        temp %= factorial(radix - 1);
        p[i] = available[k];
        available.erase(available.begin() + k);
    }
    CubeState solved;
    for (int i = 0; i < 8; i++) {
        int src_piece = p[i];
        s.f[cornerIndices[i][0]] = solved.f[cornerIndices[src_piece][0]];
        s.f[cornerIndices[i][1]] = solved.f[cornerIndices[src_piece][1]];
        s.f[cornerIndices[i][2]] = solved.f[cornerIndices[src_piece][2]];
    }
    return s;
}

static CubeState getEPState(int ep) {
    CubeState s;
    int p[8];
    int temp = ep;
    std::vector<int> available = {0, 1, 2, 3, 4, 5, 6, 7};
    for (int i = 0; i < 8; i++) {
        int radix = 8 - i;
        int k = temp / factorial(radix - 1);
        temp %= factorial(radix - 1);
        p[i] = available[k];
        available.erase(available.begin() + k);
    }
    CubeState solved;
    for (int i = 0; i < 8; i++) {
        int src_piece = p[i];
        s.f[edgeIndices[i][0]] = solved.f[edgeIndices[src_piece][0]];
        s.f[edgeIndices[i][1]] = solved.f[edgeIndices[src_piece][1]];
    }
    return s;
}

static CubeState getSlicePermState(int sp) {
    CubeState s;
    int p[4];
    int temp = sp;
    std::vector<int> available = {0, 1, 2, 3};
    for (int i = 0; i < 4; i++) {
        int radix = 4 - i;
        int k = temp / factorial(radix - 1);
        temp %= factorial(radix - 1);
        p[i] = available[k];
        available.erase(available.begin() + k);
    }
    CubeState solved;
    for (int i = 0; i < 4; i++) {
        int src_piece = p[i] + 8;
        s.f[edgeIndices[8 + i][0]] = solved.f[edgeIndices[src_piece][0]];
        s.f[edgeIndices[8 + i][1]] = solved.f[edgeIndices[src_piece][1]];
    }
    return s;
}

// ----------------------------------------------------------------------
// Initialization of Tables
// ----------------------------------------------------------------------
static void initSolverTables() {
    if (is_solver_initialized) return;

    initCombinationTable();

    // 1. Phase 1 transition tables
    for (int co = 0; co < 2187; co++) {
        CubeState s = getCOState(co);
        for (int m = 0; m < 18; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[m]);
            co_transition[co][m] = encodeCO(next_s);
        }
    }

    for (int eo = 0; eo < 2048; eo++) {
        CubeState s = getEOState(eo);
        for (int m = 0; m < 18; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[m]);
            eo_transition[eo][m] = encodeEO(next_s);
        }
    }

    for (int slice = 0; slice < 495; slice++) {
        CubeState s = getSliceState(slice);
        for (int m = 0; m < 18; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[m]);
            slice_transition[slice][m] = encodeSlice(next_s);
        }
    }

    // 2. Phase 1 joint distance tables (BFS)
    std::fill(dist_slice_eo, dist_slice_eo + 1013760, 255);
    std::fill(dist_slice_co, dist_slice_co + 1082565, 255);

    // BFS Slice + Edge Orientation
    {
        std::vector<int> q;
        q.reserve(1015000);
        int solved_slice = getCombinationIndex(3840);
        int solved_eo = 0;
        int solved_joint = solved_slice * 2048 + solved_eo;

        q.push_back(solved_joint);
        dist_slice_eo[solved_joint] = 0;
        size_t head = 0;
        while (head < q.size()) {
            int curr = q[head++];
            int d = dist_slice_eo[curr];
            int curr_slice = curr / 2048;
            int curr_eo = curr % 2048;

            for (int m = 0; m < 18; m++) {
                int next_slice = slice_transition[curr_slice][m];
                int next_eo = eo_transition[curr_eo][m];
                int next_joint = next_slice * 2048 + next_eo;

                if (dist_slice_eo[next_joint] == 255) {
                    dist_slice_eo[next_joint] = d + 1;
                    q.push_back(next_joint);
                }
            }
        }
    }

    // BFS Slice + Corner Orientation
    {
        std::vector<int> q;
        q.reserve(1085000);
        int solved_slice = getCombinationIndex(3840);
        int solved_co = 0;
        int solved_joint = solved_slice * 2187 + solved_co;

        q.push_back(solved_joint);
        dist_slice_co[solved_joint] = 0;
        size_t head = 0;
        while (head < q.size()) {
            int curr = q[head++];
            int d = dist_slice_co[curr];
            int curr_slice = curr / 2187;
            int curr_co = curr % 2187;

            for (int m = 0; m < 18; m++) {
                int next_slice = slice_transition[curr_slice][m];
                int next_co = co_transition[curr_co][m];
                int next_joint = next_slice * 2187 + next_co;

                if (dist_slice_co[next_joint] == 255) {
                    dist_slice_co[next_joint] = d + 1;
                    q.push_back(next_joint);
                }
            }
        }
    }

    // 3. Phase 2 transition tables
    for (int cp = 0; cp < 40320; cp++) {
        CubeState s = getCPState(cp);
        for (int m = 0; m < 10; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[p2_moves[m]]);
            int next_p[8];
            getCornerPerm(next_s, next_p);
            cp_transition[cp][m] = encodePerm8(next_p);
        }
    }

    for (int ep = 0; ep < 40320; ep++) {
        CubeState s = getEPState(ep);
        for (int m = 0; m < 10; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[p2_moves[m]]);
            int next_p[8];
            getUDEdgePerm(next_s, next_p);
            ep_transition[ep][m] = encodePerm8(next_p);
        }
    }

    for (int sp = 0; sp < 24; sp++) {
        CubeState s = getSlicePermState(sp);
        for (int m = 0; m < 10; m++) {
            CubeState next_s = s;
            applyMove(next_s, moves[p2_moves[m]]);
            int next_p[4];
            getSliceEdgePerm(next_s, next_p);
            slice_perm_transition[sp][m] = encodePerm4(next_p);
        }
    }

    // 4. Phase 2 joint distance tables (BFS)
    std::fill(dist_cp_sp, dist_cp_sp + 967680, 255);
    std::fill(dist_ep_sp, dist_ep_sp + 967680, 255);

    // BFS Corner Permutation + Slice Permutation
    {
        std::vector<int> q;
        q.reserve(970000);
        q.push_back(0); // Solved joint is 0
        dist_cp_sp[0] = 0;
        size_t head = 0;
        while (head < q.size()) {
            int curr = q[head++];
            int d = dist_cp_sp[curr];
            int curr_cp = curr / 24;
            int curr_sp = curr % 24;

            for (int m = 0; m < 10; m++) {
                int next_cp = cp_transition[curr_cp][m];
                int next_sp = slice_perm_transition[curr_sp][m];
                int next_joint = next_cp * 24 + next_sp;

                if (dist_cp_sp[next_joint] == 255) {
                    dist_cp_sp[next_joint] = d + 1;
                    q.push_back(next_joint);
                }
            }
        }
    }

    // BFS U/D Edge Permutation + Slice Permutation
    {
        std::vector<int> q;
        q.reserve(970000);
        q.push_back(0); // Solved joint is 0
        dist_ep_sp[0] = 0;
        size_t head = 0;
        while (head < q.size()) {
            int curr = q[head++];
            int d = dist_ep_sp[curr];
            int curr_ep = curr / 24;
            int curr_sp = curr % 24;

            for (int m = 0; m < 10; m++) {
                int next_ep = ep_transition[curr_ep][m];
                int next_sp = slice_perm_transition[curr_sp][m];
                int next_joint = next_ep * 24 + next_sp;

                if (dist_ep_sp[next_joint] == 255) {
                    dist_ep_sp[next_joint] = d + 1;
                    q.push_back(next_joint);
                }
            }
        }
    }

    is_solver_initialized = true;
}

// ----------------------------------------------------------------------
// Redundancy / Symmetry checks
// ----------------------------------------------------------------------
static inline bool isRedundant(int last_m, int curr_m) {
    int last_face = last_m / 3;
    int curr_face = curr_m / 3;
    if (last_face == curr_face) return true;
    if (last_face / 2 == curr_face / 2 && last_face > curr_face) {
        return true;
    }
    return false;
}

// ----------------------------------------------------------------------
// Search Functions
// ----------------------------------------------------------------------
static inline int h1(int co, int eo, int slice) {
    return std::max(dist_slice_eo[slice * 2048 + eo], dist_slice_co[slice * 2187 + co]);
}

static inline int h2(int cp, int ep, int sp) {
    return std::max(dist_cp_sp[cp * 24 + sp], dist_ep_sp[ep * 24 + sp]);
}

static std::vector<int> best_solution;
static int min_total_length;

static bool search2(int cp, int ep, int sp, int depth, int max_depth, std::vector<int>& path2) {
    int h = h2(cp, ep, sp);
    if (h == 0) {
        return true;
    }
    if (depth + h > max_depth) return false;

    for (int m_idx = 0; m_idx < 10; m_idx++) {
        int m = p2_moves[m_idx];
        if (!path2.empty()) {
            if (isRedundant(path2.back(), m)) continue;
        }

        path2.push_back(m);
        int next_cp = cp_transition[cp][m_idx];
        int next_ep = ep_transition[ep][m_idx];
        int next_sp = slice_perm_transition[sp][m_idx];

        if (search2(next_cp, next_ep, next_sp, depth + 1, max_depth, path2)) {
            return true;
        }
        path2.pop_back();
    }
    return false;
}

static bool search1(int co, int eo, int slice, int depth, int max_depth, std::vector<int>& path, const CubeState& start_state) {
    int h = h1(co, eo, slice);
    if (h == 0) {
        // Phase 1 solved! Get G1 state.
        CubeState g1_state = start_state;
        for (int m : path) {
            applyMove(g1_state, moves[m]);
        }

        int cp_p[8], ep_p[8], sp_p[4];
        getCornerPerm(g1_state, cp_p);
        getUDEdgePerm(g1_state, ep_p);
        getSliceEdgePerm(g1_state, sp_p);

        int cp = encodePerm8(cp_p);
        int ep = encodePerm8(ep_p);
        int sp = encodePerm4(sp_p);

        int max_p2_depth = min_total_length - 1 - (int)path.size();
        if (max_p2_depth >= 0) {
            std::vector<int> path2;
            for (int limit = 0; limit <= max_p2_depth; limit++) {
                if (search2(cp, ep, sp, 0, limit, path2)) {
                    std::vector<int> total_path = path;
                    total_path.insert(total_path.end(), path2.begin(), path2.end());
                    best_solution = total_path;
                    min_total_length = (int)total_path.size();
                    break;
                }
            }
        }

        if (min_total_length <= 20) {
            return true;
        }
        return false;
    }

    if (depth + h > max_depth) return false;

    for (int m = 0; m < 18; m++) {
        if (!path.empty()) {
            if (isRedundant(path.back(), m)) continue;
        }

        path.push_back(m);
        int next_co = co_transition[co][m];
        int next_eo = eo_transition[eo][m];
        int next_slice = slice_transition[slice][m];

        if (search1(next_co, next_eo, next_slice, depth + 1, max_depth, path, start_state)) {
            return true;
        }
        path.pop_back();
    }
    return false;
}

// ----------------------------------------------------------------------
// Exported API implementation
// ----------------------------------------------------------------------
static std::string global_solution_str;

extern "C" {
EMSCRIPTEN_KEEPALIVE
const char* solveCube(const char* state_str) {
    initSolverTables();

    CubeState start_state(state_str);
    if (start_state.isSolved()) {
        global_solution_str = "";
        return global_solution_str.c_str();
    }

    int co = encodeCO(start_state);
    int eo = encodeEO(start_state);
    int slice = encodeSlice(start_state);

    best_solution.clear();
    min_total_length = 999;

    std::vector<int> path;
    for (int limit = 0; limit <= 12; limit++) {
        if (search1(co, eo, slice, 0, limit, path, start_state)) {
            break;
        }
    }

    global_solution_str = "";
    for (size_t i = 0; i < best_solution.size(); i++) {
        if (i > 0) global_solution_str += " ";
        global_solution_str += moves[best_solution[i]];
    }

    return global_solution_str.c_str();
}
}
