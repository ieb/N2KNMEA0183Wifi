#ifndef LISTDEVICES_H
#define LISTDEVICES_H

#include <NMEA2000.h>
#include <N2kMessages.h>
#include <N2kDeviceList.h>


class ListDevices: public tN2kDeviceList {
    public:
        ListDevices(tNMEA2000 *_pNMEA2000, Stream *outputStream);
        void list(bool force = false);
        void output(Print *stream);

    private:
        Stream *OutputStream;
        void printUlongList(Print *stream, const char *prefix, const unsigned long * List);
        void printText(Print *stream, const char *Text, bool AddLineFeed=true);
        void printDevice(Print *stream, const tNMEA2000::tDevice *pDevice);

};

#endif