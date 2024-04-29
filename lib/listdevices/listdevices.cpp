#include "listdevices.h"
#include "network.h"


ListDevices::ListDevices(tNMEA2000 *_pNMEA2000, Stream *outputStream) : 
        tN2kDeviceList(_pNMEA2000),
        OutputStream{outputStream} {

}


void ListDevices::output(Print *stream) {
  for (uint8_t i = 0; i < N2kMaxBusDevices; i++) printDevice(stream, FindDeviceBySource(i));
}

void ListDevices::printUlongList(Print * stream, const char *prefix, const unsigned long * List) {
  uint8_t i;
  if ( List!=0 ) {
    stream->print(prefix);
    for (i=0; List[i]!=0; i++) { 
      if (i>0) stream->print(", ");
      stream->print(List[i]);
    }
    stream->println();
  }
}


//*****************************************************************************
void ListDevices::printText(Print * stream,  const char *Text, bool AddLineFeed) {
  if ( Text!=0 ) stream->print(Text);
  if ( AddLineFeed ) stream->println();   
}



//*****************************************************************************
void ListDevices::printDevice(Print *stream, const tNMEA2000::tDevice *pDevice) {
  if ( pDevice == 0 ) return;
  stream->println("----------------------------------------------------------------------");
  stream->println(pDevice->GetModelID());
  stream->print("  Source: "); stream->println(pDevice->GetSource());
  stream->print("  Manufacturer code:        "); stream->println(pDevice->GetManufacturerCode());
  stream->print("  Unique number:            "); stream->println(pDevice->GetUniqueNumber());
  stream->print("  Software version:         "); stream->println(pDevice->GetSwCode());
  stream->print("  Model version:            "); stream->println(pDevice->GetModelVersion());
  stream->print("  Manufacturer Information: "); printText(stream, pDevice->GetManufacturerInformation());
  stream->print("  Installation description1: "); printText(stream, pDevice->GetInstallationDescription1());
  stream->print("  Installation description2: "); printText(stream, pDevice->GetInstallationDescription2());
  printUlongList(stream, "  Transmit PGNs :",pDevice->GetTransmitPGNs());
  printUlongList(stream, "  Receive PGNs  :",pDevice->GetReceivePGNs());
  stream->println();
}

#define START_DELAY_IN_S 8
//*****************************************************************************
void ListDevices::list(bool force) {
  static bool StartDelayDone=false;
  static int StartDelayCount=0;
  static unsigned long NextStartDelay=0;
  if ( !StartDelayDone ) { // We let system first collect data to avoid printing all changes
    if ( millis()>NextStartDelay ) {
      if ( StartDelayCount==0 ) {
        OutputStream->print("Reading device information from bus ");
        NextStartDelay=millis();
      }
      OutputStream->print(".");
      NextStartDelay+=1000;
      StartDelayCount++;
      if ( StartDelayCount>START_DELAY_IN_S ) {
        StartDelayDone=true;
        OutputStream->println();
      }
    }
    return;
  }
  if ( !force && !ReadResetIsListUpdated() ) return;

  OutputStream->println();
  OutputStream->println("**********************************************************************");
  for (uint8_t i = 0; i < N2kMaxBusDevices; i++) printDevice(OutputStream,FindDeviceBySource(i));
}
