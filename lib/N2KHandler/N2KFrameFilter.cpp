#include <Arduino.h>
#include "N2KFrameFilter.h"
#include "config.h"

void N2KFrameFilter::begin(const char * configurationFile) {
  String frameFilterCfg;
  if ( ConfigurationFile::get(configurationFile, "n2k.filter", frameFilterCfg)) {
    // frame filter a space seperated sequence of numbers.
    //    30 means drop everything from 30
    //    12322 means drop all pgns == 12322
    // sources are < 255, pgns are > 255
    char * pEnd = (char *) frameFilterCfg.c_str();
    endFilters = MAX_FILTERS;
    for(int i = 0; i < MAX_FILTERS; i++) {
      frameFilter[i] = strtoul(pEnd,&pEnd,10);
      if ( pEnd == NULL || *pEnd == '\0' ) {
        endFilters = i+1;
        break;
      }
    }
  } else {
    // no filters defined.
    endFilters = 0;
  }
  Serial.print("N2K Filtering Config n:");
  Serial.print(endFilters);
  Serial.print(" filters:");
  for(int i = 0; i < endFilters; i++) {
    Serial.print("  ");
    Serial.print(frameFilter[i],DEC);
  }
  Serial.println("  ");
}

bool N2KFrameFilter::isFiltered(unsigned long pgn, unsigned char src) {
  for ( int i = 0; i < endFilters; i++ ) {
    if ( frameFilter[i] == pgn || frameFilter[i] == src ) {
      return true;
    }
  }
  return false;
}
bool N2KFrameFilter::isPgnFiltered(unsigned long pgn) {
  for ( int i = 0; i < endFilters; i++ ) {
    if ( frameFilter[i] == pgn ) {
      return true;
    }
  }
  return false;
}
bool N2KFrameFilter::isSrcFiltered(unsigned char src) {
  for ( int i = 0; i < endFilters; i++ ) {
    if ( frameFilter[i] == src ) {
      return true;
    }
  }
  return false;
}
