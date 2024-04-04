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
    case 127250UL: handle127250(N2kMsg); break; // heading
    case 127257UL: handle127257(N2kMsg); break; // attitude
    case 128259UL: handle128259(N2kMsg); break; // water speed
    case 128267UL: handle128267(N2kMsg); break; // depth
  }
}

bool NMEA0183N2KHandler::doSend(uint8_t n, unsigned long minPeriod) {
  unsigned long now = millis();
  if ( now-lastSend[n] > period ) {
    lastSend[n]=now;
    return true;
  }
  return false;
}

// heading
void NMEA0183N2KHandler::handle127250(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference ref;
  double _deviation=0;
  double _variation;
  double _heading = 0;
  if ( ParseN2kPGN127250(N2kMsg, SID, _heading, _deviation, _variation, ref) ) {
    if ( ref==N2khr_magnetic ) {
      if ( doSend(SEND_HDG) ) {
        encoder.start("$IIHDG");
        encoder.appendBearing(_Heading);
        encoder.appendRelativeAngle(_Deviation,"E","W");
        encoder.appendRelativeAngle(_Variation,"E":"W");
        send(encoder.end());
      }
      if ( doSend(SEND_HDM) ) {
        encoder.start("$IIHDM");
        encoder.appendBearing(_Heading);
        encoder.append("M");
        send(encoder.end());
      }
    }
  }
}


void NMEA0183N2KHandler::handle127257(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _yaw=0;
  double _pitch=0;
  double _roll=0;
  if ( ParseN2kPGN127257(N2kMsg, SID, _yaw, _pitch, _roll) ) {
    if ( ref==N2khr_magnetic ) {
      if ( doSend(SEND_XDR_ROLL) ) {
        encoder.start("$IIXDR");
        encoder.append("A");
        encoder.appendRelativeAngle(_roll);
        encoder.append("D");
        encoder.append("ROLL");
        send(encoder.end());
      }
    }
  }
}

void NMEA0183N2KHandler::handle128259(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _waterSpeed;
  double _groundSpeed;
  tN2kSpeedWaterReferenceType SWRT;

  if ( ParseN2kPGN128259(N2kMsg,SID,_waterSpeed,_groundSpeed,SWRT) ) {
    if ( doSend(SEND_VHW) ) {
      encoder.start("$IIVHW");
      encoder.appendBearing(getHeadingTrue());
      encoder.append("T");
      encoder.appendBearing(getHeadingMagnetic());
      encoder.append("M");
      encoder.append(_speed,1.94384617179,2);
      encoder.append("N");
      encoder.append(_speed,3.6,2);
      encoder.append("K");
      send(encoder.end());
    }
  }
}

void NMEA0183N2KHandler::handle128267(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _depthBelowTransducer;
  double _offset;
  double _range;

  if ( ParseN2kPGN128267(N2kMsg,SID,_depthBelowTransducer,_offset,_range) ) {
    if ( doSend(SEND_DBT) ) { //depth
      encoder.start("$IIDBT");
      encoder.append(_depthBelowTransducer,3.28084,1);
      encoder.append("f");
      encoder.append(_depthBelowTransducer,1.0,1);
      encoder.append("M");
      encoder.append(_depthBelowTransducer,0.546807,1);
      encoder.append("F");
      send(encoder.end());
    }
    if ( doSend(SEND_DPT) ) { //depth
      encoder.start("$IIDPT");
      encoder.append(_depthBelowTransducer,1.0,2);
      encoder.append(_offset,1.0,2);
      send(encoder.end());
    }
  }
}

void NMEA0183N2KHandler::handle128275(const tN2kMsg &N2kMsg) {
  uint16_t _daysSince1970;
  double _secondsSinceMidnight  
  uint32_t _log;
  uint32_t _tripLog

  if ( ParseN2kPGN128275(N2kMsg, _daysSince1970, _secondsSinceMidnight, _log, _tripLog) ) {
    if ( doSend(SEND_VLW) ) { // log
      encoder.start("$IIVLW");
      encoder.append((double)_log,0.000539957,2);
      encoder.append("N");
      encoder.append((double)_tripLog,0.000539957,2);
      encoder.append("N");
      send(encoder.end());
    }
  }
}


void NMEA0183N2KHandler::handle129029(const tN2kMsg &N2kMsg) {
  unsigned char SID, 
  uint16_t _daysSince1970;
  double _secondsSinceMidnight;
  double _latitude;
  double _longitude;
  double _altitude;
  tN2kGNSStype _GNSStype;
  tN2kGNSSmethod _GNSSmethod;
  unsigned char _nSatellites; 
  double _HDOP;
  double _PDOP;
  double _geoidalSeparation;
  unsigned char _nReferenceStations;
  tN2kGNSStype _referenceStationType;
  uint16_t _referenceSationID;
  double _ageOfCorrection;


  if( ParseN2kPGN129029(N2kMsg, SID, _daysSince1970, _secondsSinceMidnight,
                     _latitude, _longitude, _altitude,
                     _GNSStype, _GNSSmethod,
                     _nSatellites, _HDOP, _PDOP, _geoidalSeparation,
                     _nReferenceStations, _referenceStationType, _referenceSationID,
                     _ageOfCorrection
                     ) ) {
    if ( doSend(SEND_GGA) ) { // possition
      encoder.start("$IIGGA");
      encoder.appendTimeUTC(_secondsSinceMidnight);
      encoder.appendLatitude(_latitude);
      encoder.appendLongitude(_longitude);
      encoder.append(_GNSSmethodId);
      encoder.append(_nSatellites,1.0,0);
      encoder.append(_HDOP,1.0,2);
      encoder.append(_altitude,1.0,0);
      encoder.append("M");
      encoder.append(_geoidalSeparation,1.0,0);
      encoder.append("M");
      encoder.append("");
      encoder.append("");
      send(encoder.end());
    }
    if ( doSend(SEND_GGL) ) {
      encoder.start("$IIGLL");
      encoder.appendLatitude(_latitude);
      encoder.appendLongitude(_longitude);
      encoder.appendTimeUTC(_secondsSinceMidnight);
      encoder.append(getFaaValid());
      encoder.append(getFaaValid());
      send(encoder.end());
    }
    if ( doSend(SEND_ZDA) ) {
      encoder.start("$IIZDA");
      encoder.appendTimeUTC(_secondsSinceMidnight);
      encoder.appendDay(_daysSince1970);
      encoder.appendMonth(_daysSince1970);
      encoder.appendYear(_daysSince1970);
      encoder.append("0");
      encoder.append("0");
      send(encoder.end());
    }
    if ( doSend(SEND_RMC) ) {
      encoder.start("$IIRMC");
      encoder.appendTimeUTC(_secondsSinceMidnight);
      encoder.append(getFaaValid());
      encoder.appendLatitude(_latitude);
      encoder.appendLongitude(_longitude);
      encoder.append(getSog(),1.94384617179,2);
      encoder.appendBearing(getCogt());
      encoder.appendDate(_daysSince1970);
      encoder.appendRelativeAngle(getVariation(),"E","W");
      send(encoder.end());
    }
  }
}


void NMEA0183N2KHandler::handle129026(const tN2kMsg &N2kMsg) {

bool ParseN2kPGN129026(const tN2kMsg &N2kMsg, 
  unsigned char SID, 
  tN2kHeadingReference _ref, 
  double _cog, 
  double _sog);


  if ( ParseN2kPGN129026(N2kMsg, SID, _ref, _cog, _sog);
    double _cogm = -1e9;
    double _cogt = -1e9;_
    if ( _ref == N2khr_magnetic) {

    } else {

    }


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

    if ( _ref e.ref.name === "True" ) {
    if ( doSend(SEND_VTG) ) {
      encoder.start("$IIVTG");
      encoder.appendBearing(_cogt);
      encoder.append("T");
      encoder.appendBearing(_cogm);
      encoder.append("M");
      encoder.append(_sog, 1.94384617179, 2);
      encoder.append("N");
      encoder.append(_sog, 3.6, 2);
      encoder.append("K");
      encoder.append(getFaaValid());
      send(encoder.end());
    }

}



                case 129026: // sog cog rapid

                    if ( message.ref.name === "True" ) {

/*
NKE
Ground heading and speed:
$IIVTG,x.x,T,x.x,M,x.x,N,x.x,K,A*hh
         I I   I I   I I   I_I_Bottom speed in kph
         I I   I I   I_I_Bottom speed in knots
         I I   I_I_Magnetic bottom heading
         I_I_True bottom heading 

seems to work ok without the additional A (probably the FAA field)
*/
                        // cog is true
                        this.setStore("cogt",this.limitDegrees(message.cog*180/Math.PI,0,360), 1);
                        this.setStore("cogm",this.limitDegrees((message.cog+this.variation)*180/Math.PI,0,360), 1);
                        this.setStore("sog", (message.sog*1.94384617179), 2);
                        nmea0183Handler.updateSentence('IIVTG', ['$IIVTG',
                            this.storeSentenceValues.cogt ,
                            'T',
                            this.storeSentenceValues.cogm,
                            'M',
                            this.storeSentenceValues.sog,
                            'N',
                            this.toFixed((message.sog*3.6), 2),
                            'K',
                            this.storeSentenceValues.faaValid || 'V']);
                    }
                    break;
                case 129283: // XTE
/*
NKE
 Cross-track error:
 $IIXTE,A,A,x.x,a,N,A*hh
 I_Cross-track error in miles, L= left, R= right 
 Appears to work with A
*/
                    nmea0183Handler.updateSentence('IIXTE', ['$IIXTE',
                        'A','A',
                        this.toFixed((message.xte*0.000539957), 3),
                        message.xte>=0?"L":"R",
                        'N',
                        this.storeSentenceValues.faaValid || 'V']);
                    break;
                case 130306: // wind

/*
NKE definitions.
Apparent wind angle and speed:
$IIVWR,x.x,a,x.x,N,x.x,M,x.x,K*hh
         I I   I I   I I   I_I_Wind speed in kph
         I I   I I   I_I_Wind speed in m/s
         I I   I_I_Wind speed in knots
         I_I_Apparent wind angle from 0° to 180°, L=port, R=starboard 


$IIVWT,x.x,a,x.x,N,x.x,M,x.x,K*hh
         | |   | |   | |   | |  Wind speed in kph
         | |   | |   | |------- Wind speed in m/s
         | |   | |------------- I_Wind speed in knots
         | |------------------- True wind angle from 0° to 180°, L=port, R=starboard 

Also need MWV sentence

$IIMWV,x.x,a,x.x,N,a*hh
         | |   | | |-------- Valid A, V = invalid. 
         | |   | |---------- Wind speed In knots
         | |---------------- Reference, R = Relative, T = True
         |------------------ Wind Angle, 0 to 359 degrees

*/

                    var relativeAngle = this.limitDegrees(message.windAngle*180/Math.PI, -180, 180);
                    var dir = "R";
                    if ( relativeAngle < 0 ) {
                        relativeAngle = -relativeAngle;
                        dir = "L";
                    }


                    if (message.windReference.name === "Apparent" ) {
                        nmea0183Handler.updateSentence('IIVWR', ['$IIVWR',
                            this.toFixed(relativeAngle, 1),
                            dir,
                            this.toFixed((message.windSpeed*1.94384617179), 1),
                            'N',
                            this.toFixed((message.windSpeed), 1),
                            'M',
                            this.toFixed((message.windSpeed*3.6), 1),
                            'K']);
                        nmea0183Handler.updateSentence('IIMWVA', ['$IIMWV',
                            this.toFixed(message.windAngle*180/Math.PI, 1),
                            'R',
                            this.toFixed((message.windSpeed*1.94384617179), 1),
                            'N',
                            'A']);
                    } else if (message.windReference.name === "True" ) {

                        nmea0183Handler.updateSentence('IIVWT', ['$IIVWT',
                            this.toFixed(relativeAngle, 1),
                            dir,
                            this.toFixed((message.windSpeed*1.94384617179), 1),
                            'N',
                            this.toFixed((message.windSpeed), 1),
                            'M',
                            this.toFixed((message.windSpeed*3.6), 1),
                            'K']);
                        nmea0183Handler.updateSentence('IIMWVA', ['$IIMWV',
                            this.toFixed(relativeAngle, 1),
                            'T',
                            this.toFixed((message.windSpeed*1.94384617179), 1),
                            'N',
                            'A']);
                    }
                    break;
                case 127506: // DC Status
                    // ignore for now, may be able to get from LifePO4 BT adapter
                    break;
                case 127508: // DC Bat status
                    break;
                case 130312:

                    if ( message.source && message.source.id === 0) {
                        nmea0183Handler.updateSentence('IIMTW', ['$IIMTW',
                            (message.actualTemperature-273.15).toFixed(2),
                            'C']);
                    }
                    break;
                case 130316:
                    if ( message.tempSource && message.tempSource.id == 4 ) {
                        nmea0183Handler.updateSentence('IIXDRC', ['$IIXDR',
                            'C',
                            (message.actualTemperature-273.15).toFixed(2),
                            'C',
                            'TempAir']);
                        nmea0183Handler.updateSentence('IIMTA', ['$IIMTA',
                            (message.actualTemperature-273.15).toFixed(2),
                            'C']);
                    }
                    break;
                case 127505: // fluid level
                    break;
                case 127489: // Engine Dynamic params
                    break;
                case 127488: // Engine Rapiod
                    break;
                case 130314: // pressure
                    if ( message.pressureSource && message.pressureSource.id === 0 ) {
                        nmea0183Handler.updateSentence('IIXDRP', ['$IIXDR',
                            'P',
                            (message.actualPressure/100000).toFixed(5),
                            'B',
                            'Barometer']);
                    }
                    break;
                case 127245: // rudder

                    nmea0183Handler.updateSentence('IIRSA', ['$IIRSA',
                        this.toFixed((message.rudderPosition*180/Math.PI), 1),
                        'A',
                        '',
                        '']);
                    break;
            }