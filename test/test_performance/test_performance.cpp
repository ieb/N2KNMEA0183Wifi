// Native macOS harness for lib/performance.
//
// Two modes:
//
//   generate [seed [n [out]]]   -> write a CSV of random inputs + derived
//                                  values. Used to (re)build the checked-in
//                                  reference_output.csv after an intentional
//                                  algorithm change.
//
//   verify <ref.csv>            -> regression test. Reads the reference file,
//                                  re-runs Performance::update for each row's
//                                  inputs, and compares the recomputed derived
//                                  values against the stored ones.
//
// Inputs are the fields emitted by the NMEABridge Nav Service (see
// docs/ble-transport.md): awa, aws, stw, heading (hdm), variation. Roll is
// not emitted by the nav service, so it is pinned at the "not available"
// sentinel (-1e9).
//
// `make test` runs verify against reference_output.csv.
// `make generate` rebuilds the reference.

// STL first so the Arduino-style `abs` macro in the shims does not pollute
// standard headers parsed later in the translation unit.
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <random>
#include <string>
#include <vector>

#include "performance.h"

static unsigned long g_millis = 0;
extern "C" unsigned long millis(void) { return g_millis; }

class FilePrint : public Print {
public:
    explicit FilePrint(FILE *f) : out(f) {}
    void print(const char *s) override { std::fprintf(out, "%s", s); }
    void print(float f) override { std::fprintf(out, "%.6f", f); }
    void println(const char *s) override { std::fprintf(out, "%s\n", s); }
private:
    FILE *out;
};

class BufferPrint : public Print {
public:
    std::string buf;
    void print(const char *s) override { buf += s; }
    void print(float f) override {
        char tmp[32];
        std::snprintf(tmp, sizeof(tmp), "%.6f", f);
        buf += tmp;
    }
    void println(const char *s) override { buf += s; buf += '\n'; }
};

static const int NUM_DERIVED = 17;
static const char *CSV_HEADER =
    "iter,awa,aws,stw,roll,hdm,variation,"
    "tag,tws,twa,leeway,polarSpeed,polarSpeedRatio,polarVmg,vmg,"
    "targetTwa,targetVmg,targetStw,polarVmgRatio,"
    "windDirectionTrue,windDirectionMagnetic,"
    "oppositeTrackHeadingTrue,oppositeTrackHeadingMagnetic,"
    "oppositeTrackTrue,oppositeTrackMagnetic";

static const char *DERIVED_NAMES[NUM_DERIVED] = {
    "tws", "twa", "leeway", "polarSpeed", "polarSpeedRatio", "polarVmg", "vmg",
    "targetTwa", "targetVmg", "targetStw", "polarVmgRatio",
    "windDirectionTrue", "windDirectionMagnetic",
    "oppositeTrackHeadingTrue", "oppositeTrackHeadingMagnetic",
    "oppositeTrackTrue", "oppositeTrackMagnetic"
};

static void splitCsv(const std::string &line, std::vector<std::string> &out) {
    out.clear();
    std::string cur;
    for (char c : line) {
        if (c == ',') { out.push_back(cur); cur.clear(); }
        else cur.push_back(c);
    }
    out.push_back(cur);
}

// Invert the forward equations in Performance::update to turn a desired
// (tws, twa, stw) into the (awa, aws) that would produce it. Used by the
// grid sweep so we can target specific polar cells.
//
// Forward (from performance.cpp):
//   apparentX = cos(awa) * aws
//   apparentY = sin(awa) * aws
//   tws = sqrt(apparentY^2 + (apparentX - stw)^2)
//   twa = atan2(apparentY, apparentX - stw)
// Inverse:
//   apparent_vec = true_vec + (stw, 0)
//   aws = |apparent_vec|;  awa = atan2(apparent_vec.y, apparent_vec.x)
static void invertToApparent(float tws_ms, float twa, float stw,
                             float &awa, float &aws) {
    float trueX = tws_ms * std::cos(twa);
    float trueY = tws_ms * std::sin(twa);
    float appX  = trueX + stw;
    float appY  = trueY;
    aws = std::sqrt(appX * appX + appY * appY);
    awa = std::atan2(appY, appX);
}

// Deterministic sweep over the midpoint of every polar cell (TWS 0..30 kn x
// full TWA, both tacks). Ensures every cell of the polar interpolator is
// exercised at least once. Iter counter is advanced in place.
static int emitGrid(FILE *out, Performance &perf, FilePrint &printer, int iter) {
    // Midpoints of the polar_tws cells up to 30 kn.
    // Polar breakpoints: 0, 4, 6, 8, 10, 12, 14, 16, 20, 25, 30 (kn)
    const float tws_mids_kn[] = {
        2.f, 5.f, 7.f, 9.f, 11.f, 13.f, 15.f, 18.f, 22.5f, 27.5f
    };
    // Midpoints of the polar_twa cells.
    // Polar breakpoints: 0, 5, 10, 15, 20, 25, 32, 36, 40, 45, 52, 60, 70, 80,
    //                    90, 100, 110, 120, 130, 140, 150, 160, 170, 180 (deg)
    const float twa_mids_deg[] = {
        2.5f, 7.5f, 12.5f, 17.5f, 22.5f, 28.5f, 34.f, 38.f, 42.5f, 48.5f,
        56.f, 65.f, 75.f, 85.f, 95.f, 105.f, 115.f, 125.f, 135.f, 145.f,
        155.f, 165.f, 175.f
    };
    const int n_tws = (int)(sizeof(tws_mids_kn) / sizeof(tws_mids_kn[0]));
    const int n_twa = (int)(sizeof(twa_mids_deg) / sizeof(twa_mids_deg[0]));

    const float MS_PER_KN = 0.514444257f;
    const float DEG_TO_RAD = (float)(M_PI / 180.0);
    const float ROLL_NA = -1e9f;

    // Fixed boat speed + orientation for the grid. stw chosen so apparent
    // wind stays well-defined for every cell; hdm and variation are arbitrary
    // but fixed so the wind-direction / opposite-track outputs are reproducible.
    const float stw = 2.5f;   // m/s (~4.9 kn)
    const float hdm = 1.0f;   // rad
    const float var = 0.1f;   // rad

    for (int ti = 0; ti < n_tws; ti++) {
        float tws_ms = tws_mids_kn[ti] * MS_PER_KN;
        for (int ai = 0; ai < n_twa; ai++) {
            for (int sign = 1; sign >= -1; sign -= 2) {
                float twa = (float)sign * twa_mids_deg[ai] * DEG_TO_RAD;
                float awa, aws;
                invertToApparent(tws_ms, twa, stw, awa, aws);

                g_millis += 1000;
                std::fprintf(out, "%d,%.9f,%.9f,%.9f,%.1f,%.9f,%.9f,",
                             iter, awa, aws, stw, ROLL_NA, hdm, var);
                perf.update(awa, aws, stw, ROLL_NA, hdm, var);
                perf.output(&printer);
                iter++;
            }
        }
    }
    return iter;
}

static int generate(unsigned seed, int n_random, const char *out_path) {
    FILE *out = stdout;
    if (out_path) {
        out = std::fopen(out_path, "w");
        if (!out) {
            std::fprintf(stderr, "cannot open %s for writing\n", out_path);
            return 1;
        }
    }

    // Grid rows are deterministic; random rows use the seed. Keep both numbers
    // in the header comment so the file is self-describing.
    // Grid dimensions: 10 TWS * 23 TWA * 2 tacks = 460 rows.
    const int n_grid = 10 * 23 * 2;
    std::fprintf(out, "# seed=%u grid_rows=%d random_rows=%d\n",
                 seed, n_grid, n_random);
    std::fprintf(out, "%s\n", CSV_HEADER);

    NMEA0183N2KMessages encoder;
    Performance perf(&encoder);
    FilePrint printer(out);
    g_millis = 0;

    int iter = 0;
    iter = emitGrid(out, perf, printer, iter);

    std::mt19937 rng(seed);
    // Input ranges from docs/ble-transport.md NMEABridge Nav Service (0xFF01).
    // Wind / water speed ranges are clipped to physically meaningful marine
    // values (the BLE field supports up to 655.34 m/s but that is never
    // realistic). Adjust if you want to exercise extreme encoder edges.
    const float PI_F = (float)M_PI;
    std::uniform_real_distribution<float> awaDist(0.0f, 2.0f * PI_F);
    std::uniform_real_distribution<float> awsDist(0.0f, 25.0f);
    std::uniform_real_distribution<float> stwDist(0.0f, 12.0f);
    std::uniform_real_distribution<float> hdmDist(0.0f, 2.0f * PI_F);
    std::uniform_real_distribution<float> varDist(-PI_F, PI_F);

    const float ROLL_NA = -1e9f;

    for (int i = 0; i < n_random; i++) {
        g_millis += 1000;  // step past MIN_CALCULATION_PERIOD (500 ms)
        float awa = awaDist(rng);
        float aws = awsDist(rng);
        float stw = stwDist(rng);
        float hdm = hdmDist(rng);
        float var = varDist(rng);

        std::fprintf(out, "%d,%.9f,%.9f,%.9f,%.1f,%.9f,%.9f,",
                     iter, awa, aws, stw, ROLL_NA, hdm, var);

        perf.update(awa, aws, stw, ROLL_NA, hdm, var);
        // output() writes: "P,<17 derived fields separated by commas>,\n".
        // Sentinel values (-1e9) are rendered as empty fields.
        perf.output(&printer);
        iter++;
    }

    if (out_path) std::fclose(out);
    return 0;
}

// Returns true if the two float fields match. Empty string represents the
// -1e9 "not available" sentinel; empty must match empty exactly.
static bool fieldsMatch(const std::string &expected, const std::string &got,
                        float absTol, float relTol,
                        float &expVal, float &gotVal, bool &expSentinel, bool &gotSentinel) {
    expSentinel = expected.empty();
    gotSentinel = got.empty();
    expVal = 0.0f; gotVal = 0.0f;
    if (expSentinel || gotSentinel) return expSentinel == gotSentinel;

    expVal = std::strtof(expected.c_str(), nullptr);
    gotVal = std::strtof(got.c_str(), nullptr);
    if (expVal == gotVal) return true;
    float diff = std::fabs(expVal - gotVal);
    if (diff <= absTol) return true;
    float mag = std::fmax(std::fabs(expVal), std::fabs(gotVal));
    return diff <= relTol * mag;
}

static int verify(const char *path) {
    FILE *f = std::fopen(path, "r");
    if (!f) { std::fprintf(stderr, "cannot open %s\n", path); return 2; }

    NMEA0183N2KMessages encoder;
    Performance perf(&encoder);

    // Tolerance chosen well above CSV round-trip rounding (6 decimals, ~5e-7)
    // and well below magnitudes that would indicate a real algorithm change.
    const float ABS_TOL = 1e-5f;
    const float REL_TOL = 1e-5f;

    char raw[4096];
    int rowsChecked = 0;
    int rowMismatches = 0;
    int fieldMismatches = 0;
    const int MAX_REPORT = 20;
    int reported = 0;

    g_millis = 0;
    while (std::fgets(raw, sizeof(raw), f)) {
        size_t len = std::strlen(raw);
        while (len > 0 && (raw[len-1] == '\n' || raw[len-1] == '\r')) raw[--len] = '\0';
        if (len == 0) continue;
        if (raw[0] == '#') continue;
        // header row starts with "iter"
        if (raw[0] == 'i') continue;

        std::string line(raw);
        std::vector<std::string> toks;
        splitCsv(line, toks);

        // Expected layout: 7 input fields, "P" tag, 17 derived fields, and
        // output() emits a trailing comma -> one empty token at the end.
        if ((int)toks.size() < 7 + 1 + NUM_DERIVED) {
            std::fprintf(stderr, "row %d: malformed (%zu fields)\n", rowsChecked, toks.size());
            return 2;
        }

        int iter = std::atoi(toks[0].c_str());
        float awa  = std::strtof(toks[1].c_str(), nullptr);
        float aws  = std::strtof(toks[2].c_str(), nullptr);
        float stw  = std::strtof(toks[3].c_str(), nullptr);
        float roll = std::strtof(toks[4].c_str(), nullptr);
        float hdm  = std::strtof(toks[5].c_str(), nullptr);
        float var  = std::strtof(toks[6].c_str(), nullptr);
        // toks[7] should be "P"

        g_millis += 1000;
        perf.update(awa, aws, stw, roll, hdm, var);

        BufferPrint bp;
        perf.output(&bp);
        // bp.buf -> "P,v1,v2,...,v17,\n"
        std::string got = bp.buf;
        if (!got.empty() && got.back() == '\n') got.pop_back();
        std::vector<std::string> gotToks;
        splitCsv(got, gotToks);

        bool rowHasMismatch = false;
        for (int j = 0; j < NUM_DERIVED; j++) {
            const std::string &exp = toks[8 + j];
            const std::string &g   = (int)gotToks.size() > 1 + j ? gotToks[1 + j] : std::string();
            float ev, gv;
            bool eS, gS;
            if (!fieldsMatch(exp, g, ABS_TOL, REL_TOL, ev, gv, eS, gS)) {
                fieldMismatches++;
                rowHasMismatch = true;
                if (reported < MAX_REPORT) {
                    std::fprintf(stderr,
                        "row iter=%d field=%s expected=%s got=%s (diff=%g)\n",
                        iter, DERIVED_NAMES[j],
                        eS ? "<NA>" : exp.c_str(),
                        gS ? "<NA>" : g.c_str(),
                        (eS || gS) ? 0.0 : (double)std::fabs(ev - gv));
                    reported++;
                }
            }
        }
        if (rowHasMismatch) rowMismatches++;
        rowsChecked++;
    }
    std::fclose(f);

    std::fprintf(stderr,
        "checked %d rows; %d rows with mismatches; %d field mismatches total\n",
        rowsChecked, rowMismatches, fieldMismatches);
    if (reported == MAX_REPORT && fieldMismatches > MAX_REPORT) {
        std::fprintf(stderr, "(further mismatches suppressed)\n");
    }
    return fieldMismatches == 0 ? 0 : 1;
}

static int usage() {
    std::fprintf(stderr,
        "usage:\n"
        "  test_performance generate [seed [n [out.csv]]]\n"
        "  test_performance verify <ref.csv>\n");
    return 2;
}

int main(int argc, char **argv) {
    if (argc < 2) return usage();
    std::string mode = argv[1];
    if (mode == "generate") {
        unsigned seed = 42;
        int n = 1000;
        const char *out = nullptr;
        if (argc > 2) seed = (unsigned)std::strtoul(argv[2], nullptr, 10);
        if (argc > 3) n = std::atoi(argv[3]);
        if (argc > 4) out = argv[4];
        return generate(seed, n, out);
    }
    if (mode == "verify") {
        if (argc < 3) return usage();
        return verify(argv[2]);
    }
    return usage();
}
