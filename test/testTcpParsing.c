#define __STDC_WANT_LIB_EXT1__ 1
#include <stdio.h>
#include <stddef.h>
#include <locale.h>
#include <string.h>
#include <stdlib.h>

// used in lib/network/tcpserver

#define MAXBUFFERLEN 512
int checkChecksum(const char *input) {
    uint8_t checkSum = 0;
    int i = 1;
    for (; i < MAXBUFFERLEN && input[i] != '*' && input[i] != '\0'; ++i) {
      checkSum^=input[i];
    }
    const char * asHex = "0123456789ABCDEF";

    if ( i < (MAXBUFFERLEN-3) && input[i] == '*' 
      && input[i+1] == asHex[(checkSum>>4)&0x0f] 
      && input[i+2] == asHex[(checkSum)&0x0f]
      && input[i+3] == '\0' ) {
      return 1;
    }
    return 0;
}

// must have a placeholder for the checksum, in the form of *XX
// input will be modified
int updateCheckSum(char *input) {
    uint8_t checkSum = 0;
    int i = 1;
    for (; i < MAXBUFFERLEN && input[i] != '*' && input[i] != '\0'; ++i) {
      checkSum^=input[i];
    }
    const char * asHex = "0123456789ABCDEF";
    if ( i < MAXBUFFERLEN-3 
      && input[i] == '*' 
      && input[i+1] != '\0' 
      && input[i+2] != '\0') {
      input[i+1] = asHex[(checkSum>>4)&0x0f];
      input[i+2] = asHex[(checkSum)&0x0f];
      return 1;
    }
    return 0;
}

int extractFields(const char *input, unsigned long *fields, int maxFields) {
    int nFields = 0;
    for(int i = 0, startField = 0; i < MAXBUFFERLEN && input[i] != '\0' && nFields < maxFields; i++) {
        if ( input[i] == ',' ) {
            fields[nFields++] = atoul(&input[i+1],NULL,10);
            printf("Field %d is %d \n",nFields-1, fields[nFields-1]);
        }
    }
    return nFields;
}
#define PGN_FILTER_SIZE 10
unsigned long pgnFilter[PGN_FILTER_SIZE] = { -1, -1, -1, -1, -1, -1, -1, -1, -1, -1 };

void dumpPgnFilter() {
  printf("PgnFilter");
  for (int i = 0; i < PGN_FILTER_SIZE; ++i){
    printf(" %d", pgnFilter[i]);
  }
  printf("\n");
}

/**
 * The sentence is $PCDIN,2134234,32423432,234234
 * The buffer must be passed in as 2134234,32423432,234234
 * The buffer must be writable under the covers to not produce a buserror.
 * The buffer will be left unmondified after the operation.
 * Pgns max is 0x1FFFF or 131071, the first 6 chars would be enough to consider
 * but we can consoder the first  
*/
int allowPgnInDCIN(const char * buf) {
  // p
  int pgn = -1;
  for (int i = 0; i < 20 && buf[i] != '\0'; i++) {
    if (buf[i] == ',') {
      pgn = atoi(&buf[i+1]);
      break;
    }
  }
  if ( pgn == -1 ) {
    return 1;
  }
  for(int i = 0; i < PGN_FILTER_SIZE; i++ ) {
    if ( pgnFilter[i] == pgn) {
      return 1;
    } else if ( pgnFilter[i] == -1 ) {
      return 0;
    }
  }
  return 0;
}

void updatePgnFilter(int *pgns, int npgns) {
  for(int i = 0; i < PGN_FILTER_SIZE; i++ ) {
    if ( i < npgns) {
      pgnFilter[i] = pgns[i];
    } else {
      pgnFilter[i] = -1;
    }
  }
  dumpPgnFilter();
}


void parseSentence(char * input ) {
    printf("parse %s \n",input);
    if ( checkChecksum(input)) {
      if ( strncmp("$PCDCM,", input, 7) == 0 ) {
          int command[10];
          int nFields = extractFields(input, &command[0], 10);
          printf("Got %d fields from  %s \n", nFields, input);
          for(int i = 0; i < nFields; i++ ) {
              printf(" %d,", command[i]);
          }
          printf("\n");
          if ( nFields > 0 ) {
            switch(command[0]) {
            case 1:
              updatePgnFilter(&command[1], nFields-1);
              break;
            default:
              printf("Command %d not recognised", command[0]);
            }
          }
          printf("\n");
      } else {
          printf("Sentence not recognised %s \n", input);
      }        
    } else {
      printf("Checksum Bad\n");
    }
}
 
int main(void) {
    // make sure that the input is not read only memory by putting it into a char[] rather than 
    // simply pointint to the read only memory.
    // failure to do this will result in a bus error when runniong on osx.
    char input[] = "$PCDCM,1,2,23245,412,523,6323,7323,8323,9323,10323,11323,12323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323,2323*22";
    printf("Sentence                   %s\n", input);
    if ( updateCheckSum(input)) {
      printf("Sentence with checksum now %s\n", input);
      parseSentence(&input[0]);
    } else {
      printf("Failed to update checksum \n");
    }
    if (allowPgnInDCIN("$PCDIN,1,2,23245,412,523,6323,")) {
      printf("Fail, should not allow 1\n");
    } else {
      printf("Correct for 1\n");
    }
    if (!allowPgnInDCIN("$PCDIN,9323,2,23245,412,523,6323,")) {
      printf("Fail should have allowed 9323\n");
    } else {
      printf("Correct for 9323\n");
    }
    if (!allowPgnInDCIN("$PCDIN9323223245412,523,6323,")) {
      printf("Fail should have allowed non sentence pattern \n");
    } else {
      printf("Correct for non sentence pattern\n");
    }


}