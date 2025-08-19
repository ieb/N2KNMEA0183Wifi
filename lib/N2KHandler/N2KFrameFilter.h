#pragma once

#include <stdint.h>

#define MAX_FILTERS 30
class N2KFrameFilter {
  public:
    N2KFrameFilter() {}
    void begin(const char * filterConfigName, const char * configurationFile = "/config.txt");
    bool isPgnFiltered(unsigned long pgn);
    bool isSrcFiltered(unsigned char src);
    bool isFiltered(unsigned long pgn, unsigned char src);

  private:
    uint8_t endFilters = MAX_FILTERS;
    // todo, perhaps convert to a list
    unsigned long frameFilter[MAX_FILTERS];
};

