#include "NMEA0183N2KMessages.h"

#include "esp_log.h"

#define TAG "nmea0183"


// send periods.
#define SEND_HDG lastSendHDG, 1000
#define SEND_HDM lastSendHDM, 1000
#define SEND_HDT lastSendHDT, 1000
#define SEND_XDR_ROLL lastSendXDR_roll, 1000
#define SEND_VHW lastSendVHW, 1000
#define SEND_DBT lastSendDBT, 1000
#define SEND_DPT lastSendDPT, 1000
#define SEND_VLW lastSendVLW, 1000
#define SEND_GGA lastSendGGA, 1000
#define SEND_GLL lastSendGGL, 1000
#define SEND_ZDA lastSendZDA, 1000
#define SEND_RMC lastSendRMC, 1000
#define SEND_VTG lastSendVTG, 1000
#define SEND_XTE lastSendXTE, 1000
#define SEND_VWR lastSendVWR, 1000
#define SEND_MWVR lastSendMWVR, 5000
#define SEND_VWT lastSendVWT, 5000
#define SEND_MWVT lastSendMVWT, 5000
#define SEND_MTW lastSendMWT, 5000
#define SEND_XDR_TEMP_AIR lastSendXDR_air, 5000
#define SEND_MTA lastSendMTA, 5000
#define SEND_XDR_BAROMETER lastSendXDR_baro, 5000
#define SEND_RSA lastSendRSA, 1000




/**
NKE
Heading magnetic:
$IIHDG,x.x,,,,*hh
 I_Heading magnetic
*/
void NMEA0183N2KMessages::sendHDG( double heading, double deviation, double variation) {
  if ( doSend(SEND_HDG) ) {
      start("$IIHDG");
      appendBearing(heading);
      appendRelativeAngle(deviation,"E","W");
      appendRelativeAngle(variation,"E","W");
      send();
  }
}

/**
 * $IIHDM,x.x,M*hh
 *        I__I_Heading magnetic 
 */
void NMEA0183N2KMessages::sendHDM(double heading) {
  if ( doSend(SEND_HDM) ) {
    start("$IIHDM");
    appendBearing(heading);
    append("M");
    send();
  }  
}

/**
 * 
 * Heading true:
 * $IIHDT,x.x,T*hh
 * I__I_Heading true 
 */
void NMEA0183N2KMessages::sendHDT(double heading) {
  if ( doSend(SEND_HDT) ) {
    start("$IIHDT");
    appendBearing(heading);
    append("T");
    send();
  }
}

void NMEA0183N2KMessages::sendXDR_roll(double roll) {
  if ( doSend(SEND_XDR_ROLL) ) {
    start("$IIXDR");
    append("A");
    appendRelativeSignedAngle(roll);
    append("D");
    append("ROLL");
    send();
  }
}

/*NKE definition
$IIVHW,x .x,T,x.x,M,x.x,N,x.x,K*hh
          | |   | |   | |   |-|_Surface speed in kph
          | |   | |   |-|-Surface speed in knots
          | |   |-|-Magnetic compass heading
          |-|-True compass heading
*/
void NMEA0183N2KMessages::sendVHW( double headingTrue, double headingMagnetic, double waterSpeed) {

  if ( doSend(SEND_VHW) ) {
    start("$IIVHW");
    appendBearing(headingTrue);
    append("T");
    appendBearing(headingMagnetic);
    append("M");
    append(waterSpeed,1.94384617179,2);
    append("N");
    append(waterSpeed,3.6,2);
    append("K");
    send();
  }
}

/*
NKE definitions
$IIDPT,x.x,x.x,,*hh
         I   I_Sensor offset, >0 = surface transducer distance, >0 = keel transducer distance.
         I_Bottom transducer distance
$IIDBT,x.x,f,x.x,M,,*hh
         I I  I__I_Depth in metres
         I_I_Depth in feet 

         Looks ok.
 */
void NMEA0183N2KMessages::sendDBT( double depthBelowTransducer) {
    if ( doSend(SEND_DBT) ) { //depth
      start("$IIDBT");
      append(depthBelowTransducer,3.28084,1);
      append("f");
      append(depthBelowTransducer,1.0,1);
      append("M");
      append(depthBelowTransducer,0.546807,1);
      append("F");
      send();
    }
}
/*
NKE definitions
$IIDBT,x.x,f,x.x,M,,*hh
         I I  I__I_Depth in metres
         I_I_Depth in feet 

         Looks ok.
 */
void NMEA0183N2KMessages::sendDPT(double depthBelowTransducer, double offset) {
  if ( doSend(SEND_DPT) ) { //depth
    start("$IIDPT");
    append(depthBelowTransducer,1.0,2);
    append(offset,1.0,2);
    send();
  }
}


/*
  NKE definition
  Total log and daily log:
  $IIVLW,x.x,N,x.x,N*hh
   I I I__I_Daily log in miles
   I__I_Total log in miles 
  */

void NMEA0183N2KMessages::sendVLW(double log, double tripLog) {
  if ( doSend(SEND_VLW) ) { // log
    start("$IIVLW");
    append(log,0.000539957,2);
    append("N");
    append(tripLog,0.000539957,2);
    append("N");
    send();
  }
}

void NMEA0183N2KMessages::sendGGA(double fixSecondsSinceMidnight, 
      double latitude, double longitude,
      uint8_t GNSSmethod, uint8_t nSatellites, 
      double HDOP, double  altitude, double geoidalSeparation) {
  if ( doSend(SEND_GGA) ) { // possition
    start("$IIGGA");
    appendTimeUTC(fixSecondsSinceMidnight);
    appendLatitude(latitude);
    appendLongitude(longitude);
    append(GNSSmethod);
    append(nSatellites);
    append(HDOP,1.0,2);
    append(altitude,1.0,0);
    append("M");
    append(geoidalSeparation,1.0,0);
    append("M");
    append("");
    append("");
    send();
  }
}


/*
NKE
Geographical position, latitude and longitude:
$IIGLL,IIII.II,a,yyyyy.yy,a,hhmmss.ss,A,A*hh
             I I        I I         I I_Statut, A= valid data, V= non valid data
             I I        I I         I_UTC time
             I I        I_I_Longitude, E/W
             I_I_Latidude, N/S                  

// not sure about AA at the end. A works with the NKE app.     
*/
void NMEA0183N2KMessages::sendGLL(double secondsSinceMidnight, 
      double latitude, double longitude, const char * faaValid) {
  if ( doSend(SEND_GLL) ) {
    start("$IIGLL");
    appendLatitude(latitude);
    appendLongitude(longitude);
    appendTimeUTC(secondsSinceMidnight);
    append(faaValid);
    append(faaValid);
    send();
  }
}

/*
NKE
UTC time and date:
$IIZDA,hhmmss.ss,xx,xx,xxxx,,*hh
 I I I I_Year
 I I I_Month
 I I_Day
 I_Time
*/
void NMEA0183N2KMessages::sendZDA( double secondsSinceMidnight, uint16_t daysSince1970) {
  if ( doSend(SEND_ZDA) ) {
    start("$IIZDA");
    appendTimeUTC(secondsSinceMidnight);
    appendDMY(daysSince1970);
    append("0");
    append("0");
    send();
  }
}

// {"updates":[{"source":{"sentence":"RMC","talker":"II","type":"NMEA0183"},
// "timestamp":"2016-03-04T07:47:18.000Z",
// "values":[{"path":"navigation.position","value":{"longitude":1.276295,"latitude":51.95897}},
// {"path":"navigation.courseOverGroundTrue","value":null},
// {"path":"navigation.speedOverGround","value":0.010288891495408068},
// {"path":"navigation.magneticVariation","value":0.013962634019142718},
// {"path":"navigation.magneticVariationAgeOfService","value":1457077638},
// {"path":"navigation.datetime","value":"2016-03-04T07:47:18.000Z"}]}]}

// $IIRMC,074717.00,V,5157.53810,N,00116.57780,E,0.02,,110782,0.8,E,V*3B



void NMEA0183N2KMessages::sendRMC(double secondsSinceMidnight, 
    double latitude, double longitude, double sog, double cogt, uint16_t daysSince1970,
    double variation, const char * faaValid ) {
  if ( doSend(SEND_RMC) ) {
    start("$IIRMC");
    appendTimeUTC(secondsSinceMidnight);
    append(faaValid);
    appendLatitude(latitude);
    appendLongitude(longitude);
    append(sog,1.94384617179,2);
    appendBearing(cogt);
    appendDate(daysSince1970);
    appendRelativeAngle(variation,"E","W");
    append(faaValid);      
    send();
  }
}

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
void NMEA0183N2KMessages::sendVTG(double cogt, double cogm, double sog, const char * faaValid) {
  if ( doSend(SEND_VTG) ) {
    // use the stored values to account for update timeouts.
    start("$IIVTG");
    appendBearing(cogt);
    append("T");
    appendBearing(cogm);
    append("M");
    append(sog, 1.94384617179, 2);
    append("N");
    append(sog, 3.6, 2);
    append("K");
    append(faaValid);
    send();
  }
}


/*
NKE
 Cross-track error:
 $IIXTE,A,A,x.x,a,N,A*hh
 I_Cross-track error in miles, L= left, R= right 
 Appears to work with A
*/
void NMEA0183N2KMessages::sendXTE(double xte,const char * faaValid) {
  if ( doSend(SEND_XTE) ) {
    const char * dir = "R";
    if ( xte < 0 ) {
      dir = "L";
      xte = -xte;
    }
    start("$IIXTE");
    append("A");
    append("A");
    append(xte, 0.000539957, 3);
    append(dir);
    append("N");
    append(faaValid);
    send();
  }
}



/*
NKE definitions.
Apparent wind angle and speed:
$IIVWR,x.x,a,x.x,N,x.x,M,x.x,K*hh
         I I   I I   I I   I_I_Wind speed in kph
         I I   I I   I_I_Wind speed in m/s
         I I   I_I_Wind speed in knots
         I_I_Apparent wind angle from 0° to 180°, L=port, R=starboard 



*/
void NMEA0183N2KMessages::sendVWR( double windAngle, double windSpeed ) {
  if ( doSend(SEND_VWR) ) {
    start("$IIVWR");
    appendRelativeAngle(windAngle, "R", "L", 1);
    append(windSpeed,1.94384617179,1);
    append("N");
    append(windSpeed,1.0,1);
    append("M");
    append(windSpeed,3.6,1);
    append("K");
    send();
  }
}
void NMEA0183N2KMessages::sendMVR( double windAngle, double windSpeed ) {
  if ( doSend(SEND_MWVR) ) {
    start("$IIMWV");
    appendRelativeSignedAngle(windAngle, 1);
    append("R");
    append(windSpeed,1.94384617179,1);
    append("N");
    append("A");
    send();
  }
}
/**
$IIVWT,x.x,a,x.x,N,x.x,M,x.x,K*hh
         | |   | |   | |   | |  Wind speed in kph
         | |   | |   | |------- Wind speed in m/s
         | |   | |------------- I_Wind speed in knots
         | |------------------- True wind angle from 0° to 180°, L=port, R=starboard 
*/
void NMEA0183N2KMessages::sendVWT( double windAngle, double windSpeed) {
  if ( doSend(SEND_VWT) ) {
    start("$IIVWT");
    appendRelativeAngle(windAngle, "R", "L", 1);
    append(windSpeed,1.94384617179,1);
    append("N");
    append(windSpeed,1.0,1);
    append("M");
    append(windSpeed,3.6,1);
    append("K");
    send();
  }
}
/**
Also need MWV sentence

$IIMWV,x.x,a,x.x,N,a*hh
         | |   | | |-------- Valid A, V = invalid. 
         | |   | |---------- Wind speed In knots
         | |---------------- Reference, R = Relative, T = True
         |------------------ Wind Angle, 0 to 359 degrees
 */
void NMEA0183N2KMessages::sendMVT( double windAngle, double windSpeed) {
  if ( doSend(SEND_MWVT) ) {
    start("$IIMWV");
    appendRelativeSignedAngle(windAngle, 1);
    append("T");
    append(windSpeed,1.94384617179,1);
    append("N");
    append("A");
    send();
  }
}

void NMEA0183N2KMessages::sendMTW(double temperature) {
  if ( doSend(SEND_MTW) ) {
    start("$IIMTW");
    append(temperature-273.15,1.0,2);
    append("C");
    send();
  }
}

void NMEA0183N2KMessages::sendXDR_airtemp(double temperature) {
  if ( doSend(SEND_XDR_TEMP_AIR) ) {
    start("$IIXDR");
    append("C");
    append(temperature-273.15,1.0,2);
    append("C");
    append("TempAir");
    send();
  }
}
void NMEA0183N2KMessages::sendMTA(double temperature) {
  if ( doSend(SEND_MTA) ) {
    start("$IIMTA");
    append(temperature-273.15,1.0,2);
    append("C");
    send();
  }
}

void NMEA0183N2KMessages::sendXDR_barometer(double pressure) {
  if ( doSend(SEND_XDR_BAROMETER) ) {
    start("$IIXDR");
    append("P");
    append(pressure,1.0E-6,5);
    append("B");
    append("Barometer");
    send();
  }
}

void NMEA0183N2KMessages::sendRSA(double rudderPosition) {
  if ( doSend(SEND_RSA) ) {
    start("$IIRSA");
    appendRelativeSignedAngle(rudderPosition,1);
    append("A");
    append("");
    append("");
    send();
  }
}



void NMEA0183N2KMessages::send() {
  sendCallback(end());
}
