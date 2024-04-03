/*
N2kDataToNMEA0183.cpp

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

#include "N2KToN183.h"
#include <N2kMessages.h>
#include <NMEA0183Messages.h>
#include <math.h>


const double radToDeg=180.0/M_PI;

//*****************************************************************************
void tN2kDataToNMEA0183::HandleMsg(const tN2kMsg &N2kMsg) {
  switch (N2kMsg.PGN) {
    case 127250UL: HandleHeading(N2kMsg);
    case 127258UL: HandleVariation(N2kMsg);
    case 128259UL: HandleBoatSpeed(N2kMsg);
    case 128267UL: HandleDepth(N2kMsg);
    case 129025UL: HandlePosition(N2kMsg);
    case 129026UL: HandleCOGSOG(N2kMsg);
    case 129029UL: HandleGNSS(N2kMsg);
    case 130306UL: HandleWind(N2kMsg);
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::Update() {
  SendRMC();
  unsigned long now = millis();
  if ( now-LastHeadingTime > 2000 ) Heading=N2kDoubleNA;
  if ( now-LastCOGSOGTime > 2000 ) { COG=N2kDoubleNA; SOG=N2kDoubleNA; }
  if ( now-LastPositionTime > 4000 ) { Latitude=N2kDoubleNA; Longitude=N2kDoubleNA; }
  if ( now-LastWindTime > 2000 ) { WindSpeed=N2kDoubleNA; WindAngle=N2kDoubleNA; }
}

//*****************************************************************************
void tN2kDataToNMEA0183::SendMessage(const tNMEA0183Msg &NMEA0183Msg) {
  if ( pNMEA0183!=0 ) pNMEA0183->SendMessage(NMEA0183Msg);
  if ( SendNMEA0183MessageCallback!=0 ) SendNMEA0183MessageCallback(NMEA0183Msg);
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleHeading(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference ref;
  double _Deviation=0;
  double _Variation;
  tNMEA0183Msg NMEA0183Msg;

  if ( ParseN2kHeading(N2kMsg, SID, Heading, _Deviation, _Variation, ref) ) {
    if ( ref==N2khr_magnetic ) {
      if ( !N2kIsNA(_Variation) ) Variation=_Variation; // Update Variation
      if ( !N2kIsNA(Heading) && !N2kIsNA(Variation) ) Heading-=Variation;
    }
    unsigned long now = millis();
    LastHeadingTime=now;
    if ( NMEA0183SetHDG(NMEA0183Msg,Heading,_Deviation,Variation) ) {
      if ( now-LastHeadingSend > 1000 ) {
        LastHeadingSend = now;
        SendMessage(NMEA0183Msg);
      }
    }
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleVariation(const tN2kMsg &N2kMsg) {
unsigned char SID;
tN2kMagneticVariation Source;

  ParseN2kMagneticVariation(N2kMsg,SID,Source,DaysSince1970,Variation);
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleBoatSpeed(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double WaterReferenced;
  double GroundReferenced;
  tN2kSpeedWaterReferenceType SWRT;

  if ( ParseN2kBoatSpeed(N2kMsg,SID,WaterReferenced,GroundReferenced,SWRT) ) {
    tNMEA0183Msg NMEA0183Msg;
    double MagneticHeading=( !N2kIsNA(Heading) && !N2kIsNA(Variation)?Heading+Variation: NMEA0183DoubleNA);
    if ( NMEA0183SetVHW(NMEA0183Msg,Heading,MagneticHeading,WaterReferenced) ) {
      unsigned long now = millis();
      if ( now-LastBoatSpeedSend > 1000 ) {
        LastBoatSpeedSend = now;
        SendMessage(NMEA0183Msg);
      }
    }
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleDepth(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double DepthBelowTransducer;
  double Offset;
  double Range;

  if ( ParseN2kWaterDepth(N2kMsg,SID,DepthBelowTransducer,Offset,Range) ) {
      tNMEA0183Msg NMEA0183Msg;
      unsigned long now = millis();
      if ( now-LastDepthSend > 1000 ) {
        LastDepthSend = now;
        if ( NMEA0183SetDPT(NMEA0183Msg,DepthBelowTransducer,Offset) ) {
          SendMessage(NMEA0183Msg);
        }
        if ( NMEA0183SetDBx(NMEA0183Msg,DepthBelowTransducer,Offset) ) {
          SendMessage(NMEA0183Msg);
        }
      }
  }
}


//*****************************************************************************
void tN2kDataToNMEA0183::HandlePosition(const tN2kMsg &N2kMsg) {

  if ( ParseN2kPGN129025(N2kMsg, Latitude, Longitude) ) {
    LastPositionTime=millis();
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleCOGSOG(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference HeadingReference;
  tNMEA0183Msg NMEA0183Msg;

  if ( ParseN2kCOGSOGRapid(N2kMsg,SID,HeadingReference,COG,SOG) ) {
    LastCOGSOGTime=millis();
    double MCOG=( !N2kIsNA(COG) && !N2kIsNA(Variation)?COG-Variation:NMEA0183DoubleNA );
    if ( HeadingReference==N2khr_magnetic ) {
      MCOG=COG;
      if ( !N2kIsNA(Variation) ) COG-=Variation;
    }
    if ( NMEA0183SetVTG(NMEA0183Msg,COG,MCOG,SOG) ) {
      unsigned long now = millis();
      if ( now-LastCOGSOGSend > 1000 ) {
        LastCOGSOGSend = now;
        SendMessage(NMEA0183Msg);
      }
    }
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleGNSS(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kGNSStype GNSStype;
  tN2kGNSSmethod GNSSmethod;
  unsigned char nSatellites;
  double HDOP;
  double PDOP;
  double GeoidalSeparation;
  unsigned char nReferenceStations;
  tN2kGNSStype ReferenceStationType;
  uint16_t ReferenceSationID;
  double AgeOfCorrection;

  if ( ParseN2kGNSS(N2kMsg,SID,DaysSince1970,SecondsSinceMidnight,Latitude,Longitude,Altitude,GNSStype,GNSSmethod,
                    nSatellites,HDOP,PDOP,GeoidalSeparation,
                    nReferenceStations,ReferenceStationType,ReferenceSationID,AgeOfCorrection) ) {
    LastPositionTime=millis();
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::HandleWind(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kWindReference WindReference;
  tNMEA0183WindReference NMEA0183Reference=NMEA0183Wind_True;

  if ( ParseN2kWindSpeed(N2kMsg,SID,WindSpeed,WindAngle,WindReference) ) {
    tNMEA0183Msg NMEA0183Msg;
    LastWindTime=millis();
    if ( WindReference==N2kWind_Apparent ) NMEA0183Reference=NMEA0183Wind_Apparent;

    if ( NMEA0183SetMWV(NMEA0183Msg, WindAngle*radToDeg, NMEA0183Reference , WindSpeed) ) {
      unsigned long now = millis();
      if ( now-LastWindSend > 1000 ) {
        LastWindSend = now;
        SendMessage(NMEA0183Msg);
      }
    }
  }
}

//*****************************************************************************
void tN2kDataToNMEA0183::SendRMC() {
    if ( !N2kIsNA(Latitude) ) {
      tNMEA0183Msg NMEA0183Msg;
      if (NMEA0183SetGLL(NMEA0183Msg, SecondsSinceMidnight, Latitude, Longitude)) {
        unsigned long now = millis();
        if ( now-LastPositionSend > 1000 ) {
          LastPositionSend = now;
          SendMessage(NMEA0183Msg);
        }
      }

//      if ( NMEA0183SetRMC(NMEA0183Msg,SecondsSinceMidnight,Latitude,Longitude,COG,SOG,DaysSince1970,Variation) ) {
//        SendMessage(NMEA0183Msg);
//      }
    }
}



void NMEA0183N2KHandler::handle(const tN2kMsg &N2kMsg) {
  switch (N2kMsg.PGN) {
    case 127250UL: handleHeading(N2kMsg); break;
    case 127257UL: handleAttitude(N2kMsg); break;
  }
}

void NMEA0183N2KHandler::handleHeading(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference ref;
  double _Deviation=0;
  double _Variation;
  double _Heading = 0;
  tNMEA0183Msg NMEA0183Msg;

  if ( ParseN2kHeading(N2kMsg, SID, _Heading, _Deviation, _Variation, ref) ) {
    if ( ref==N2khr_magnetic ) {
      if ( doSend(SEND_HEADING) ) {
        encoder.start("$IIHDG");
        encoder.appendBearing(_Heading);
        encoder.appendRelativeAngle((_Deviation>=0)?_Deviation,-_Deviation);
        encoder.append((_Deviation>=0)?"E":"W");
        encoder.appendRelativeAngle((_Variation>=0)?_Variation,-_Variation);
        encoder.append((_Variation>=0)?"E":"W");
        send(encoder.end());
        encoder.start("$IIHDM");
        encoder.appendBearing(_Heading);
        encoder.append("M");
        send(encoder.end());
      }
    }
  }
}

bool NMEA0183N2KHandler::doSend(uint8_t n) {
  unsigned long now = millis();
  if ( now-lastSend[n] > minPeriods[n] ) {
    lastSend[n]=now;
    return true;
  }
  return false;
}

void NMEA0183N2KHandler::handleAttitude(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference ref;
  double _Deviation=0;
  double _Variation;
  double _Heading = 0;
  tNMEA0183Msg NMEA0183Msg;

  if ( ParseN2kAttitude(N2kMsg, SID, _Heading, _Deviation, _Variation, ref) ) {
    if ( ref==N2khr_magnetic ) {
      if ( doSend(SEND_ATTITUDE) ) {
        encoder.start("$IIXDR");
        encoder.append("A");
        encoder.appendRelativeAngle(_Roll);
        encoder.append("D");
        encoder.append("ROLL");
        send(encoder.end());
      }
    }
  }
}
