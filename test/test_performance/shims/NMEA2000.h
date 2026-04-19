#pragma once

#include <math.h>
#include <stdint.h>
#include <stdio.h>

#ifndef PI
#define PI 3.14159265358979323846
#endif

#undef abs
#define abs(x) ((x) > 0 ? (x) : -(x))

extern "C" unsigned long millis(void);

class Print {
public:
    virtual ~Print() {}
    virtual void print(const char *s) = 0;
    virtual void print(float f) = 0;
    virtual void println(const char *s) = 0;
};
