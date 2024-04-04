/*
N2kDataToNMEA0183.h

Copyright (c) 2015-2018 Timo Lappalainen, Kave Oy, www.kave.fi

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

#include <NMEA0183.h>
#include <NMEA2000.h>
#include <time.h>

//------------------------------------------------------------------------------
class tN2kDataToNMEA0183 : public tNMEA2000::tMsgHandler {
public:
  using tSendNMEA0183MessageCallback=void (*)(const tNMEA0183Msg &NMEA0183Msg);
    
protected:
  static const unsigned long RMCPeriod=1000;
  double Latitude;
  double Longitude;
  double Altitude;
  double Variation;
  double Heading;
  double COG;
  double SOG;
  double WindSpeed;
  double WindAngle;
  unsigned long LastHeadingTime;
  unsigned long LastCOGSOGTime;
  unsigned long LastPositionTime;
  unsigned long LastPosSend;
  unsigned long LastWindTime;
  unsigned long LastHeadingSend;
  unsigned long LastBoatSpeedSend;
  unsigned long LastDepthSend;
  unsigned long LastCOGSOGSend;
  unsigned long LastPositionSend;
  unsigned long LastWindSend;

  uint16_t DaysSince1970;
  double SecondsSinceMidnight;
  unsigned long NextRMCSend;

  tNMEA0183 *pNMEA0183;
  tSendNMEA0183MessageCallback SendNMEA0183MessageCallback;

protected:
  void HandleHeading(const tN2kMsg &N2kMsg); // 127250
  void HandleVariation(const tN2kMsg &N2kMsg); // 127258
  void HandleBoatSpeed(const tN2kMsg &N2kMsg); // 128259
  void HandleDepth(const tN2kMsg &N2kMsg); // 128267
  void HandlePosition(const tN2kMsg &N2kMsg); // 129025
  void HandleCOGSOG(const tN2kMsg &N2kMsg); // 129026
  void HandleGNSS(const tN2kMsg &N2kMsg); // 129029
  void HandleWind(const tN2kMsg &N2kMsg); // 130306
  void SendRMC();
  void SendMessage(const tNMEA0183Msg &NMEA0183Msg);

public:
  tN2kDataToNMEA0183(tNMEA2000 *_pNMEA2000, tNMEA0183 *_pNMEA0183) : tNMEA2000::tMsgHandler(0,_pNMEA2000) {
    SendNMEA0183MessageCallback=0;
    pNMEA0183=_pNMEA0183;
    Latitude=N2kDoubleNA; Longitude=N2kDoubleNA; Altitude=N2kDoubleNA;
    Variation=N2kDoubleNA; Heading=N2kDoubleNA; COG=N2kDoubleNA; SOG=N2kDoubleNA;
    SecondsSinceMidnight=N2kDoubleNA; DaysSince1970=N2kUInt16NA;
    LastPosSend=0;
    NextRMCSend=millis()+RMCPeriod;
    LastHeadingTime=0;
    LastCOGSOGTime=0;
    LastPositionTime=0;
    LastWindTime=0;
  }
  void HandleMsg(const tN2kMsg &N2kMsg);
  void SetSendNMEA0183MessageCallback(tSendNMEA0183MessageCallback _SendNMEA0183MessageCallback) {
    SendNMEA0183MessageCallback=_SendNMEA0183MessageCallback;
  }
  void Update();
};



class NMEA0183Encoder {
public:
  NMEA0183Encoder() {}
  void start(const char * key) {
    p = 0;
    while(key[p] != '\0') {
      buffer[p] = key[p];
      p++;
    }
    buffer[p] = '\0';
  }
  void append(const char *field) {
    buffer[p++] = ',';
    int n = 0;
    while(field[n] != '\0') {
      buffer[p++] = field[n++]; 
    }
    buffer[p] = '\0';
  }
  append(double value, double factor=1.0, uint8_t fixed=1) {
    // 0.0 to 360.0
    if ( value == -1E9 ) {
      append("");
    } else {
      value = value * factor;
      String v = String(value, fixed);
      append(v.c_str());
    }
  }

  appendBearing(double bearing, uint8_t fixed=1) {
    // 0.0 to 360.0
    if ( bearing == -1E9 ) {
      append("");
    } else {
      bearing = bearing * 180.0/PI;
      if (bearing < 0 ) bearing = bearing + 360.0;
      else if (bearing > 360 ) bearing = bearing - 360;
      String v = String(bearing, fixed);
      append(v.c_str());
    }
  }
  appendRelativeAngle(double angle, const char * pos, const char * neg, uint8_t fixed=1) {
    if ( bearing == -1E9 ) {
      append("");
      append("");
    } else {
      bearing = bearing * 180.0/PI;
      if (bearing > 180) {
        bearing = -(360-bearing);
      }
      String v = String(bearing, fixed);
      append(v.c_str());
      if ( bearing >= 0 ) {
        append(pos);
      } else {
        append(neg);
      }          
    }
  }

  appendTimeUTC(double secondsSinceMidnight) {
    int hh = (int)(secondsSinceMidnight/3600.0);
    int mm = (int)((secondsSinceMidnight-(hh*3600.0))/60.0);
    double ss = secondsSinceMidnight-(hh*3600.0)-(mm*60.0);
    char buffer[10];
    sprintf(buffer, "%02d%02d%02.5f", hh, mm, ss);
    append(buffer);
  }

  appendLatitude(double latitude) {
      //ddmm.mmmmm
      char ns = 'N';
      if ( latitude < 0 ) {
        ns = 'S';
        latitude = -latitude;
      }
      int dd = (int)latitude;
      double mm = (latitude - dd)*60.0;
      char buffer[11];
      sprintf(buffer, "%02d%02.9f", hh, mm, ss);
      append(buffer);
      append(ns);
  }
  appendLongitude(double longitude) {
      // dddmm.mmmmm
      char ew = 'E';
      if ( longitude < 0 ) {
        ew = 'W';
        longitude = -longitude;
      }
      int dd = (int)longitude;
      double mm = (longitude - dd)*60.0;
      char buffer[12];
      sprintf(buffer, "%03d%02.9f", hh, mm, ss);
      append(buffer);
      append(ns);
  }

  appendDay(uint16_t daysSince1970) {
    time_t d = (daysSince1970*3600000*24);
    struct tm * tmd = gmtime(&d);
    char buffer[3];
    sprintf(buffer, "%02d",tmd->tm_mday);
    append(buffer);
  }
  appendMonth(uint16_t daysSince1970) {
    time_t d = (daysSince1970*3600000*24);
    struct tm * tmd = gmtime(&d);
    char buffer[3];
    sprintf(buffer, "%02d",tmd->tm_mon+1);
    append(buffer);
  }
  appendYear(uint16_t daysSince1970) {
    time_t d = (daysSince1970*3600000*24);
    struct tm * tmd = gmtime(&d);
    char buffer[5];
    sprintf(buffer, "%04d",tmd->tm_year+1900);
    append(buffer);
  }
  appendDate(uint16_t daysSince1970) {
    time_t d = (daysSince1970*3600000*24);
    struct tm * tmd = gmtime(&d);
    char buffer[7];
    sprintf(buffer, "%02d%02d%02d",tmd->tm_mday,tmd->tm_mon+1,tmd->tm_year%100);
    append(buffer);
  }

  const char * end() {
    checkSum = 0;
    int n = 0;
    for (int i = 0; i < p; i++) {
      checkSum^=buffer[i];
    }
    buffer[p++] = '*';
    buffer[p++] = NMEA0183Encoder::asHex[(checkSum>>4)&0x0f];
    buffer[p++] = NMEA0183Encoder::asHex[(checkSum)&0x0f];
    buffer[p] = '\0';
    return &buffer[0];
  }
private:
  uint8_t p = 0;
  const char buffer[255];
  static const char *asHex = "0123456789ABCDEF";
}

class NMEA0183N2KHandler  {
public:
  NMEA0183N2KHandler() {};
  void handle(const tN2kMsg &N2kMsg);


}