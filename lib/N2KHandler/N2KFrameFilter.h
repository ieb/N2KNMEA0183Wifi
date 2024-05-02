#pragma once

#include <stdint.h>

#define MAX_FILTERS 20
class N2KFrameFilter {
  public:
    N2KFrameFilter() {}
    void begin(const char * configurationFile = "/config.txt");
    bool isPgnFiltered(unsigned long pgn);
    bool isSrcFiltered(unsigned char src);
    bool isFiltered(unsigned long pgn, unsigned char src);
  private:
    uint8_t endFilters = MAX_FILTERS;
    unsigned long frameFilter[MAX_FILTERS];
};

