# Native (macOS) regression test for lib/performance.
#
#   make            -> build ./test_performance
#   make test       -> verify against reference_output.csv (regression test)
#   make generate   -> regenerate reference_output.csv (commit after algo changes)
#   make clean      -> remove the binary

CXX      ?= clang++
CXXFLAGS ?= -std=c++14 -O2 -Wall -Wno-unknown-pragmas

PERF_DIR := ../../lib/performance
SHIMS    := shims

INCLUDES := -I$(SHIMS) -I$(PERF_DIR)

SRCS := test_performance.cpp $(PERF_DIR)/performance.cpp
BIN  := test_performance
REF  := reference_output.csv

all: $(BIN)

$(BIN): $(SRCS) $(PERF_DIR)/performance.h $(PERF_DIR)/pogo1250polar.h \
        $(SHIMS)/NMEA2000.h $(SHIMS)/N2kMessages.h $(SHIMS)/NMEA0183N2KMessages.h
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(BIN) $(SRCS)

test: $(BIN)
	./$(BIN) verify $(REF)

generate: $(BIN)
	./$(BIN) generate 42 1000 $(REF)
	@echo "wrote $(REF)"

clean:
	rm -f $(BIN)

.PHONY: all test generate clean
