
#include <math.h>
#include "performance.h"

#include "pogo1250polar.h"


#define SEND_KEP01 lastSendKEP01, 1000
#define SEND_KEP02 lastSendKEP02, 1000
#define SEND_KEP03 lastSendKEP03, 1000
#define SEND_KEP99 lastSendKEP99, 1000
#define SEND_MWV_true lastSendNWVTrue, 1000
#define MIN_CALCULATION_PERIOD 500

/**
 * NB: Float on a ESP32 uses hardware trig functions. 
 * double uses software and is significantly slower using more CPU.
 * Hence this class uses float throughout.
 * The lookup take is in int for storage and since storage is an issue
 * a pre-calculated fine version is not created.
 */ 



#define RadToDeg(x) ((x) * 57.2957795131)
#define DegToRad(x) ((x) * 0.01745329252) 
#define Deg90 1.5707963268
#define msToKnots(x) ((x) * 1.9438452)
#define KnotsToms(x) ((x) * 0.514444257)
#define Knots30 15.433327715602045
 
void Performance::update(float awa, float aws, float stw, float roll, float hdm, float variation ) {

    unsigned long now = millis();
    if ( now-lastCaculation < MIN_CALCULATION_PERIOD ) {
        return;
    }

    lastCaculation=now;
    // calculate leeway
    this->leeway = 0;
    if ( awa != -1e9 
        && stw != -1e9 
        && roll != -1e9 
        && abs(awa) < Deg90 
        && aws < Knots30
        && stw > 0.5 ) {
        // This comes from Pedrick see http://www.sname.org/HigherLogic/System/DownloadDocumentFile.ashx?DocumentFileKey=5d932796-f926-4262-88f4-aaca17789bb0
        // for aws < 30 and awa < 90. UK  =15 for masthead and 5 for fractional
        this->leeway  = 5 * roll / (stw * stw);
    }


    // reset everything that is calculated
    this->twa = -1e9;
    this->twa = -1e9;
    this->windDirectionMagnetic = -1e9;
    this->oppositeTrackHeadingMagnetic = -1e9;
    this->oppositeTrackMagnetic = -1e9;
    this->windDirectionTrue = -1e9;
    this->oppositeTrackHeadingTrue = -1e9;
    this->oppositeTrackTrue = -1e9;
    this->polarSpeed = -1e9;
    this->polarSpeedRatio = -1e9;
    this->polarVmg = -1e9;
    this->vmg = -1e9;
    this->targetVmg = -1e9;
    this->targetVmg = -1e9;
    this->targetTwa = -1e9;
    this->targetStw = -1e9;
    this->targetTwa = -1e9;
    this->polarVmgRatio = -1e9;

    // calculate true wind.
    if ( awa != -1e9 && stw != -1e9 ) {
        double aparentX = cos(awa) * aws;
        double aparentY = sin(awa) * aws;
        this->twa =  atan2(aparentY, -stw + aparentX);
        this->tws = sqrt(pow(aparentY, 2) + pow(-stw + aparentX, 2));




        // calculate polar speed
        float abs_twa = this->twa;
        if ( abs_twa < 0 ) abs_twa = -abs_twa;
        this->polarSpeed = calcPolarSpeed(this->tws, abs_twa);
        if ( this->polarSpeed > 1E-8) {
            this->polarSpeedRatio = stw/this->polarSpeed;
        }
        // calculate vmgs
        float cos_twa = cos(abs_twa);
        this->polarVmg = polarSpeed * cos_twa;
        this->vmg = stw * cos_twa;

        //calculate optimal vmg angles, use degrees to iterate
        int twal = 0, twah = 180, twa = RadToDeg(abs_twa);
        if ( twa < 90) {
            // upwind
            twah = 90;
        } else {
            // downwind.
            twal = 90;
        }
        float tws_kn = msToKnots(this->tws);
        for (int ttwa = twal; ttwa <= twah; ttwa++) {
            float tstw = calcPolarSpeed(tws_kn, ttwa, false);
            float tvmg = tstw*cos(DegToRad(ttwa));
            if ( abs(tvmg) > abs(this->targetVmg) ) {
                this->targetVmg = tvmg;
                this->targetTwa = ttwa;
                this->targetStw = tstw;
            }
        }
        if ( this->twa < 0) {
            this->targetTwa = -DegToRad(this->targetTwa);
        } else {
            this->targetTwa = DegToRad(this->targetTwa);
        }

        // calculate the polar vmg Ratio
        if ( abs(this->targetVmg) > 1.0E-8 ) {
            this->polarVmgRatio = this->vmg/this->targetVmg;
        }

        if ( hdm != -1e9 ) {
            // calculate other track, depending on what the heading is
            this->windDirectionMagnetic = correctBearing(hdm+this->twa);
            this->oppositeTrackHeadingMagnetic = correctBearing(this->windDirectionTrue + this->targetTwa);
            if (this->twa > 0 ) {
                this->oppositeTrackMagnetic = correctBearing(this->oppositeTrackHeadingMagnetic + this->leeway*2);
            } else {
                this->oppositeTrackMagnetic = correctBearing(this->oppositeTrackHeadingMagnetic - this->leeway*2);
            }

            if ( variation != -1e-9 ) {
                this->windDirectionTrue = correctBearing(this->windDirectionMagnetic - variation);
                this->oppositeTrackHeadingTrue = correctBearing(this->oppositeTrackHeadingTrue - variation);                
                this->oppositeTrackTrue = correctBearing(this->oppositeTrackMagnetic - variation);
            }
        }
    }

/*

$PNKEP,01,15.16,N,28.07,K*66
$PNKEP,02,-56295778396.97*76
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ error
$PNKEP,03,999999610.21,0.00,103.10*5A
^^^^^^^^^^^^^^^^^^^^^^^^^^ error
$PNKEP,99,-109.45,5.11,-109.45,17.99,15.63,15.16,1.031*5C
*/


    if ( messageEncoder->doSend(SEND_KEP01)) {
        messageEncoder->start("$PNKEP");
        messageEncoder->append("01");
        messageEncoder->append(polarSpeed, 1.9438452, 2);
        messageEncoder->append("N");
        messageEncoder->append(polarSpeed, 3.6, 2);
        messageEncoder->append("K");
        messageEncoder->send();
    }


    if ( messageEncoder->doSend(SEND_KEP02)) {
        messageEncoder->start("$PNKEP");
        messageEncoder->append("02");
        messageEncoder->appendRelativeSignedAngle(oppositeTrackMagnetic, 2);
        messageEncoder->send();
    }


    if ( messageEncoder->doSend(SEND_KEP03)) {
        messageEncoder->start("$PNKEP");
        messageEncoder->append("03");
        messageEncoder->appendRelativeSignedAngle(targetTwa, 2);
        messageEncoder->append(polarVmgRatio, 100.0, 2);
        messageEncoder->append(polarSpeedRatio, 100.0, 2);
        messageEncoder->send();
    }

    if ( messageEncoder->doSend(SEND_KEP99)) {
        messageEncoder->start("$PNKEP");
        messageEncoder->append("99");
        messageEncoder->appendRelativeSignedAngle(awa, 2);
        messageEncoder->append(aws, 1.9438452, 2);
        messageEncoder->appendRelativeSignedAngle(awa, 2);
        messageEncoder->append(tws, 1.9438452, 2);
        messageEncoder->append(stw, 1.9438452, 2);
        messageEncoder->append(polarSpeed, 1.9438452, 2);
        messageEncoder->append(polarSpeedRatio, 1.0, 3);
        messageEncoder->send();
    }

    if ( messageEncoder->doSend(SEND_MWV_true)) {
        messageEncoder->start("$IIMWV");
        messageEncoder->appendRelativeSignedAngle(twa, 2);
        messageEncoder->append("T");
        messageEncoder->append(tws, 1.9438452, 2);
        messageEncoder->append("N");
        messageEncoder->append("A");
        messageEncoder->send();
    }




}


/**
 *  Calculate the polar speed by patch interpolation.
 *  input is in ms and radians unless nmea2000Units is false, in which case deg an kn.
 *  output is in ms/s
 */ 
float Performance::calcPolarSpeed(float twsv, float twav, bool nmea2000Units) {
    // polar Data is in KN and deg
    if ( nmea2000Units ) {
        twsv = msToKnots(twsv);
        twav = RadToDeg(twav);
    }

    updateTWSIdx(twsv);
    updateTWAIdx(twav);

    float twa[] = {
        (float)1.0*polar_twa[this->twaidx[0]],
        (float)1.0*polar_twa[this->twaidx[1]]
    };
    float tws[] = {
        (float)1.0*polar_tws[this->twsidx[0]],
        (float)1.0*polar_tws[this->twsidx[1]]
    };
    // polar is stored in 1/10th of a knot.
    float stw[] = {
        (float)0.1*polar_map[POLAR_MAP_LOOKUP(this->twsidx[0], this->twaidx[0])],
        (float)0.1*polar_map[POLAR_MAP_LOOKUP(this->twsidx[1], this->twaidx[0])],
        (float)0.1*polar_map[POLAR_MAP_LOOKUP(this->twsidx[0], this->twaidx[1])],
        (float)0.1*polar_map[POLAR_MAP_LOOKUP(this->twsidx[1], this->twaidx[1])]
    };
    // perform a very simple linear patch interpolation.
    // interpolate a stw low value for a given tws and range
    float stwl = interpolateForY(twav, twa[0], twa[1], stw[0], stw[2]);
    // interpolate a stw high value for a given tws and range
    float stwh = interpolateForY(twav, twa[0], twa[1], stw[1], stw[3]);

    // interpolate a stw final value for a given tws and range using the high an low values for twa.
    return KnotsToms(interpolateForY(twsv, tws[0], tws[1], stwl, stwh)); // in m/s

}

void Performance::updateTWSIdx(float tws) {
    uint8_t v = (uint8_t)(tws);
    if ( v != this->lastTWSV) {
        findIndexes(v,  polar_tws, POLAR_NTWS, this->twsidx);
        this->lastTWSV = v;
    }
}

void Performance::updateTWAIdx(float twa) {
    uint8_t v = (uint8_t)(twa);
    if ( v != this->lastTWAV) {
        findIndexes(v,  polar_twa, POLAR_NTWA, this->twaidx);
        this->lastTWAV = v;
    }
}

void Performance::findIndexes(uint8_t v, const uint8_t *a, uint8_t al, int8_t *idx  ) {
    for (int i = 0; i < al; i++) {
        if ( a[i] > v ) {
            if ( i == 0 ) {
                idx[0] = 0;
                idx[1] = 0;
                return;
            } else {
                idx[0] = i-1;
                idx[1] = i;
                return;
            }
        }
    }
    idx[0] = al-1;
    idx[1] = al-1;
}


float Performance::interpolateForY(float x, float xl, float xh, float yl, float yh) {
    if ( x >= xh ) {
       return yh;
    } else if ( x <= xl ) {
       return yl;
    } else if ( abs(xh-xl) < 1.0E-4 ) { // could happen on stw interpolation.
       return (yl+yh)/2;
    } else {
       return yl+(yh-yl)*((x-xl)/(xh-xl));
    }
}


float Performance::correctBearing(float b) {
    if ( b > (2*PI) ) {
        return b-2*PI;
    } else if ( b < 0 ) {
        return b+2*PI;
    } else {
        return b;
    }
}