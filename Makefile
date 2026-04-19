# Root-level Makefile for native regression tests.
#
#   make test    -> build and run every self-contained native test
#   make clean   -> remove the test binaries
#
# Each native test lives under test/ in its own directory and is
# driven from here. Tests must exit 0 on success.
#
# Note: test/testTcpParsing.c is a pre-existing stub that does not
# build cleanly (missing atoul) and is intentionally not listed.

.PHONY: test clean test-performance test-engine-ble

test: test-performance test-engine-ble
	@echo ""
	@echo "All native tests passed."

test-performance:
	@echo "=== test_performance ==="
	$(MAKE) -C test/test_performance test

test-engine-ble:
	@echo "=== test_engine_ble ==="
	cd test/test_engine_ble && \
	    gcc test_engine_ble.c -I../../lib/bluetooth -o run && \
	    ./run

clean:
	$(MAKE) -C test/test_performance clean
	rm -f test/test_engine_ble/run
