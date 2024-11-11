"use strict;"


class BaseEncoder {
	constructor() {
	}
	checksum(data) {
		let checkSum = 0;
		for (let i = 1; i < data.length; i++) {
			checkSum^=data.charCodeAt(i);
		}
		return "*"+checkSum.toString(16).padStart(2,'0');
	}
	crc16(array, length ) {
		let crc = 0xffff;
		for (let j = 0; j < length; j++) {
	        let data = array.getUint8(j);
	        data = (((data & 0xAA) >> 1) | ((data & 0x55) << 1)&0xffff);
	        data = (((data & 0xCC) >> 2) | ((data & 0x33) << 2)&0xffff);
	        data =          ((data >> 4) | (data << 4)&0xffff);
	        crc ^= ((data) << 8)&0xffff;
	        for (let i = 8; i > 0; i--) {
		        if (crc & (1 << 15)) {
		            crc = (crc<<1)&0xffff;
		            crc ^= 0x8005;
		        } else {
		            crc = (crc<<1)&0xffff;
		        }
	        }
	    }
	    return crc;
	}
	addUInt8(v) {
		if (v == 0xff) {
			return ",";
		} else {
			return ","+v.toFixed(0);
		}
	}
	addInt8(v) {
		if (v == 0x7f) {
			return ",";
		} else {
			return ","+v.toFixed(0);
		}
	}
	addUInt16(v) {
		if (v == 0xffff) {
			return ",";
		} else {
			return ","+v.toFixed(0);
		}
	}
	addDouble(v, f, p) {
		if (v == -1e9) {
			return ",";
		} else {
			return ","+(v*f).toFixed(p);
		}
	}

	addRelativeSignedAngle(angle) {
		if ( angle == -1e9) {
			return ",";
		}
		angle = angle * 180/Math.PI;
		if ( angle < -180 ) {
			angle = angle + 360;
		} else if (angle > 180 ) {
			angle = angle - 360;
		}
		return ","+angle.toFixed(1);
	} 
	addBearing(bearing) {
		if ( bearing == -1e9) {
			return ",";
		}
		bearing = bearing * 180/Math.PI;
		if ( bearing < 0 ) {
			bearing = bearing + 360;
		} else if (bearing > 360 ) {
			bearing = bearing - 360;
		}
		return ","+bearing.toFixed(1);
	} 
	addRelativeAngle(bearing) {
		if ( bearing == -1e9) {
			return ",,";
		}
		bearing = bearing * 180/Math.PI;
		if ( bearing < -180 ) {
			bearing = bearing + 360;
		} else if (bearing > 180 ) {
			bearing = bearing - 360;
		}
		if ( bearing < 0) {
			return ","+(-bearing).toFixed(1)+","+e;
		} else {
			return ","+(bearing).toFixed(1)+","+w;
		}
	} 
   	addLatitude(latitude) {
   		if ( latitude < 0 ) {
   			return ","+(-latitude).toFixed(8)+",S";
   		} else {
   			return ","+(latitude).toFixed(8)+",N";
   		}
   	}
   	addLongitude(longitude) {
   		if ( longitude < 0 ) {
   			return ","+(-longitude).toFixed(8)+",W";
   		} else {
   			return ","+(longitude).toFixed(8)+",E";
   		}
   	}



   	addTimeUTC(secondsSinceMidnight) {
		const hh = Math.trunc(secondsSinceMidnight/3600.0);
		const mm = Math.trunc((secondsSinceMidnight-(hh*3600.0))/60.0);
		const ss = secondsSinceMidnight-(hh*3600.0)-(mm*60.0);
		return `${hh.toFixed(0).padStart('0',2)}${mm.toFixed(0).padStart(2,'0')}${ss.toFixed(2).padStart(5,'0')}`;
   	}


   	addDMY(daysSince1970) {
   		const d = new Date(daysSince1970*3600000*24)
   		const day = String(d.getUTCDate()).padStart(2,'0');
   		const month = String(d.getUTCMonth()+1).padStart(2,'0');
   		const year = String(d.getUTCFullYear());
   		return `${day},${month},${year}`;
   	}
   	addDate(daysSince1970) {
   		const d = new Date(daysSince1970*3600000*24)
   		const day = String(d.getUTCDate()).padStart(2,'0');
   		const month = String(d.getUTCMonth()+1).padStart(2,'0');
   		const year = String(d.getUTCFullYear()).slice(2);
   		return `${day}${month}${year}`;

   	}

}

class N2KEncoder extends BaseEncoder {
	constructor() {
		super();
	}

/**
 * Form the buffer to allow encodeing rawp PGNs.
 */ 
	encodePGN(N2kMsg) {
		let data = `$IIPGR,${N2kMsg.PGN},${N2kMsg.Source},${N2kMsg.DataLen},`;
		for (let i = 0; i < N2kMsg.DataLen; i++) {
			data += N2kMsg.Data[i].toString(16).padStart(2,'0');
		}
		data += this.checksum(data);
		return data;
	}
	encodeBinarPGN(N2kMsg) {
		let data = new DataView(new ArrayBuffer(N2kMsg.DataLen+10));
		data.setUint8(0, '^');
		data.setUint8(1, 1);
		data.setUint32(2, N2kMsg.PGN, true);
		data.setUint8(6, N2kMsg.Source);
		data.setUint16(7, N2kMsg.DataLen, true);
		for (let i = 0; i < N2kMsg.DataLen; i++) {
			data.setUint8(8+i, N2kMsg.Data[i]);
		}
		data.setUint16(8+N2kMsg.DataLen, this.crc16(data,8+N2kMsg.DataLen));
		return data;
	}

	


	encode127258(  _source, _daysSince1970, _variation) {
		let data = '$IIPGN,127258';
		data += this.addUInt8(_source);
		data += this.addUInt16(_daysSince1970);
		data += this.addDouble(_variation,1.0,3);
		data += this.checksum(data);
		return data;
	}
	encode127250( SID, _source, _deviation, _variation, ref) {
		let data = '$IIPGN,127258';
		data += this.addUInt8(SID);
		data += this.addUInt8(_source);
		data += this.addDouble(_deviation,1.0,3);
		data += this.addDouble(_variation,1.0,3);
		data += this.addUInt8(ref);
		data += this.checksum(data);
		return data;
	}
	encode127257( SID, _yaw, _pitch, _roll) {
		let data = '$IIPGN,127257';
		data += this.addUInt8(SID);
		data += this.addDouble(_yaw,1.0,3);
		data += this.addDouble(_pitch,1.0,3);
		data += this.addDouble(_roll,1.0,3);
		data += this.checksum(data);
		return data;
	}
	encode128259( SID, _waterSpeed, _groundSpeed, SWRT) {
		let data = '$IIPGN,128259';
		data += this.addUInt8(SID);
		data += this.addDouble(_waterSpeed,1.0,3);
		data += this.addDouble(_groundSpeed,1.0,3);
		data += this.addUInt8(SWRT);
		data += this.checksum(data);
		return data;
	}
	encode128267(SID, _depthBelowTransducer, _offset, _range) {
		let data = '$IIPGN,128267';
		data += this.addUInt8(SID);
		data += this.addDouble(_depthBelowTransducer,1.0,3);
		data += this.addDouble(_offset,1.0,3);
		data += this.addDouble(_range,1.0,3);
		data += this.checksum(data);
		return data;
	}
	encode128275( _daysSince1970, _secondsSinceMidnight, _log, _tripLog ) {
		let data = '$IIPGN,128275';
		data += this.addUInt8(SID);
		data += this.addUInt16(_daysSince1970);
		data += this.addDouble(_secondsSinceMidnight,1.0,3);
		data += this.addDouble(_log,1.0,5);
		data += this.addDouble(_tripLog,1.0,5);
		data += this.checksum(data);
		return data;
	}
	encode129029(  SID, _daysSince1970, _secondsSinceMidnight, 
                               _latitude, _longitude, _altitude,
                         _GNSStype, _GNSSmethod,
                        _nSatellites, _HDOP, _PDOP, _geoidalSeparation,
                     _nReferenceStations, _referenceStationType, _referenceSationID,
                     _ageOfCorrection, _integrety) {
		let data = '$IIPGN,129029';
		data += this.addUInt8(SID);
		data += this.addUInt16(_daysSince1970);
		data += this.addDouble(_secondsSinceMidnight,1.0,3);
		data += this.addDouble(_latitude,1.0,8);
		data += this.addDouble(_longitude,1.0,8);
		data += this.addDouble(_latitude,1.0,8);
		data += this.addDouble(_altitude,1.0,2);
		data += this.addUInt8(_GNSStype);
		data += this.addUInt8(_GNSSmethod);
		data += this.addUInt8(_nSatellites);
		data += this.addDouble(_HDOP,1.0,2);
		data += this.addDouble(_PDOP,1.0,2);
		data += this.addDouble(_geoidalSeparation,1.0,2);
		data += this.addUInt8(_nReferenceStations);
		data += this.addUInt8(_referenceStationType);
		data += this.addUInt16(_referenceSationID);
		data += this.addDouble(_ageOfCorrection,1.0,2);
		data += this.addUInt8(_integrety);
		data += this.checksum(data);
		return data;
	}

	encode129026(  SID, _ref, _cog, _sog) {
		let data = '$IIPGN,129026';
		data += this.addUInt8(SID);
		data += this.addUInt8(_ref);
		data += this.addDouble(_cog,1.0,3);
		data += this.addDouble(_sog,1.0,5);
		data += this.checksum(data);
		return data;
	}
	encode129283( SID,  _XTEMode,  _navigationTerminated, _xte) {
		let data = '$IIPGN,129283';
		data += this.addUInt8(SID);
		data += this.addUInt8(_XTEMode);
		data += this.addUInt8(_navigationTerminated);
		data += this.addDouble(_xte,1.0,5);
		data += this.checksum(data);
		return data;
	}
	encode130306( SID, _windSpeed, _windAngle, _windReference) {
		let data = '$IIPGN,130306';
		data += this.addUInt8(SID);
		data += this.addDouble(_windSpeed,1.0,2);
		data += this.addDouble(_windAngle,1.0,2);
		data += this.addUInt8(_windReference);
		data += this.checksum(data);
		return data;
	}
	encode130312( SID, _tempInstance, _tempSource,
                  _actualTemperature, _setTemperature) {
		let data = '$IIPGN,130312';
		data += this.addUInt8(SID);
		data += this.addUInt8(_tempInstance);
		data += this.addUInt8(_tempSource);
		data += this.addDouble(_actualTemperature,1.0,2);
		data += this.addDouble(_setTemperature,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode130316( SID, _tempInstance, _tempSource,
                  _actualTemperature, _setTemperature) {
		let data = '$IIPGN,130316';
		data += this.addUInt8(SID);
		data += this.addUInt8(_tempInstance);
		data += this.addUInt8(_tempSource);
		data += this.addDouble(_actualTemperature,1.0,2);
		data += this.addDouble(_setTemperature,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode130314( SID, _pressureInstance,
                  _pressureSource, _pressure) {
		let data = '$IIPGN,130314';
		data += this.addUInt8(SID);
		data += this.addUInt8(_pressureInstance);
		data += this.addUInt8(_pressureSource);
		data += this.addDouble(_pressure,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode127488( _engineInstance, _engineSpeed,
                  _engineBoostPressure, _engineTiltTrim) {
		let data = '$IIPGN,130314';
		data += this.addUInt8(_engineInstance);
		data += this.addDouble(_engineSpeed,1.0,1);
		data += this.addDouble(_engineBoostPressure,1.0,2);
		data += this.addDouble(_engineTiltTrim,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode127489( _engineInstance, _engineOilPress,
                  _engineOilTemp, _engineCoolantTemp, _altenatorVoltage,
                  _fuelRate, _engineHours, _engineCoolantPress, _engineFuelPress,
                  _engineLoad, _engineTorque,
                  _status1, _status2) {
		let data = '$IIPGN,130314';
		data += this.addUInt8(_engineInstance);
		data += this.addDouble(_engineOilPress,1.0,1);
		data += this.addDouble(_engineOilTemp,1.0,2);
		data += this.addDouble(_engineCoolantTemp,1.0,2);
		data += this.addDouble(_altenatorVoltage,1.0,2);
		data += this.addDouble(_fuelRate,1.0,2);
		data += this.addDouble(_engineHours,1.0,2);
		data += this.addDouble(_engineCoolantPress,1.0,2);
		data += this.addDouble(_engineFuelPress,1.0,2);
		data += this.addInt8(_engineLoad,1.0,2);
		data += this.addInt8(_engineTorque,1.0,2);
		data += this.addUInt16(_status1,1.0,2);
		data += this.addUInt16(_status2,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode127505(  _instance, _fluidType, _level, _capacity ) {
		let data = '$IIPGN,127505';
		data += this.addUInt8(_instance);
		data += this.addUInt8(_fluidType);
		data += this.addDouble(_level,1.0,3);
		data += this.addDouble(_capacity,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode127508( SID,  _batteryInstance,  _batteryVoltage,  _batteryCurrent,
                   _batteryTemperature) {
		let data = '$IIPGN,127505';
		data += this.addUInt8(SID);
		data += this.addUInt8(_batteryInstance);
		data += this.addDouble(_batteryVoltage,1.0,3);
		data += this.addDouble(_batteryCurrent,1.0,2);
		data += this.addDouble(_batteryTemperature,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode128000( SID, _leeway) {
		let data = '$IIPGN,128000';
		data += this.addUInt8(SID);
		data += this.addDouble(_leeway,1.0,3);
		data += this.checksum(data);
		return data;
	}
	encode129025( _latitude, _longitude) {
		let data = '$IIPGN,129025';
		data += this.addDouble(_latitude,1.0,8);
		data += this.addDouble(_latitude,1.0,8);
		data += this.checksum(data);
		return data;
	}
	encode130310( SID,  _waterTemperature,
                    _outsideAmbientAirTemperature,  _atmosphericPressure) {
		let data = '$IIPGN,130310';
		data += this.addUInt8(SID);
		data += this.addDouble(_waterTemperature,1.0,3);
		data += this.addDouble(_outsideAmbientAirTemperature,1.0,2);
		data += this.addDouble(_atmosphericPressure,1.0,2);
		data += this.checksum(data);
		return data;
	}
	encode130311( SID, _tempSource, _temperature,
                     _humiditySource, _humidity, _atmosphericPressure) {
		let data = '$IIPGN,130311';
		data += this.addUInt8(SID);
		data += this.addUInt8(_tempSource);
		data += this.addDouble(_temperature,1.0,3);
		data += this.addUInt8(_humiditySource);
		data += this.addDouble(_humidity,1.0,3);
		data += this.addDouble(_atmosphericPressure,1.0,3);
		data += this.checksum(data);
		return data;
	}
	encode130313(  SID,  _humidityInstance,
                        _humiditySource,  _actualHumidity,  _setHumidity) {
		let data = '$IIPGN,130313';
		data += this.addUInt8(SID);
		data += this.addUInt8(_humidityInstance);
		data += this.addUInt8(_humiditySource);
		data += this.addDouble(_actualHumidity,1.0,3);
		data += this.addDouble(_setHumidity,1.0,3);
		data += this.checksum(data);
		return data;
	}

	encode127245( _rudderPosition,  _instance,
                      _rudderDirectionOrder,  _angleOrder) {
		let data = '$IIPGN,127245';
		data += this.addUInt8(SID);
		data += this.addDouble(_rudderPosition,1.0,3);
		data += this.addUInt8(_instance);
		data += this.addUInt8(_rudderDirectionOrder);
		data += this.addUInt8(_angleOrder);
		data += this.checksum(data);
		return data;
	}
}

class NMEA0183Encoder extends BaseEncoder {
	constructor() {
		super();
	}


	encodeHDG( heading, deviation, variation) {
  	  let data = "$IIHDG";
      data += this.addBearing(heading);
      data += this.addRelativeAngle(deviation,"E","W");
      data += this.addRelativeAngle(variation,"E","W");
      data += this.checksum(data);
	  return data;
	}

	/**
	 * $IIHDM,x.x,M*hh
	 *        I__I_Heading magnetic 
	 */
	encodeHDM(heading) {
  	  let data = "$IIHDM";
	  data += this.addBearing(heading);
	  data += ",M";
      data += this.checksum(data);
	  return data;
	}

	/**
	 * 
	 * Heading true:
	 * $IIHDT,x.x,T*hh
	 * I__I_Heading true 
	 */
	encodeHDT(heading) {
		let data = "$IIHDT";
	    data += this.addBearing(heading);
	    data += ",T";
	    data += this.checksum(data);
		return data;
	}
	encodeXDR_roll(roll) {
		let data = "$IIXDR";
	    data += ",A";
	    data += this.addRelativeSignedAngle(roll);
	    data += ",D,ROLL";
	    data += this.checksum(data);
		return data;
	}



	/*NKE definition
	$IIVHW,x .x,T,x.x,M,x.x,N,x.x,K*hh
	          | |   | |   | |   |-|_Surface speed in kph
	          | |   | |   |-|-Surface speed in knots
	          | |   |-|-Magnetic compass heading
	          |-|-True compass heading
	*/
	encodeVHW( headingTrue, headingMagnetic, waterSpeed) {
		let data = "$IIVHW";
		data +=	addBearing(headingTrue);
	    data += ",T";
		data +=	addBearing(headingMagnetic);
	    data += ",M";
	    data += this.addDouble(waterSpeed,1.94384617179,2);
	    data += ",N";
	    data += this.addDouble(waterSpeed,3.6,2);
	    data += ",K";
	    data += this.checksum(data);
		return data;
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
	encodeDBT( depthBelowTransducer) {
		let data = "$IIDBT";
	    data += this.addDouble(depthBelowTransducer,3.28084,1);
	    data += ",f";
	    data += this.addDouble(depthBelowTransducer,1.0,1);
	    data += ",M";
	    data += this.addDouble(depthBelowTransducer,0.546807,1);
	    data += ",F";
	    data += this.checksum(data);
		return data;
	}
	/*
	NKE definitions
	$IIDBT,x.x,f,x.x,M,,*hh
	         I I  I__I_Depth in metres
	         I_I_Depth in feet 

	         Looks ok.
	 */
	encodeDPT(depthBelowTransducer, offset) {
		let data = "$IIDPT";
	    data += this.addDouble(depthBelowTransducer,1.0,1);
	    data += this.addDouble(offset,1.0,1);
	    data += this.checksum(data);
		return data;
	}


	/*
	  NKE definition
	  Total log and daily log:
	  $IIVLW,x.x,N,x.x,N*hh
	   I I I__I_Daily log in miles
	   I__I_Total log in miles 
	  */

	encodeVLW(log, tripLog) {
		let data = "$IIVLW";
	    data += this.addDouble(log,0.000539957,2);
	    data += ",N"
	    data += this.addDouble(tripLog,0.000539957,2);
	    data += ",N"
	    data += this.checksum(data);
		return data;
	}


	encodeGGA(fixSecondsSinceMidnight, 
      latitude, longitude,
      GNSSmethod, nSatellites, 
      HDOP, altitude, geoidalSeparation) {
      	let data = "$IIGGA";
    	data += this.addTimeUTC(fixSecondsSinceMidnight);
    	data += this.addLatitude(latitude);
    	data += this.addLongitude(longitude);
    	data += this.addUint8(GNSSmethod);
    	data += this.addUint8(nSatellites);
    	data += this.addDouble(HDOP,1.0,2);
    	data += this.addDouble(altitude,1.0,0);
    	data += ",M";
    	data += this.addDouble(geoidalSeparation,1.0,0);
    	data += ",M,,"
	    data += this.checksum(data);
		return data;
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
	encodeGLL(secondsSinceMidnight, 
	      latitude, longitude, faaValid) {
      	let data = "$IIGLL";
    	data += this.addLatitude(latitude);
    	data += this.addLongitude(longitude);
    	data += this.addTimeUTC(secondsSinceMidnight);
    	data += `,${faaValid},${faaValid}`;
	    data += this.checksum(data);
		return data;
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
	encodeZDA( secondsSinceMidnight, daysSince1970) {
      	let data = "$IIZDA";
    	data += this.addTimeUTC(secondsSinceMidnight);
    	data += this.addDMY(daysSince1970);
    	data += ",0,0";
	    data += this.checksum(data);
		return data;
	}

	encodeRMC(secondsSinceMidnight, 
	    latitude, longitude, sog, cogt, daysSince1970,
	    variation, faaValid ) {
      	let data = "$IIRMC";
		data += this.addTimeUTC(secondsSinceMidnight);
	    data += `,${faaValid}`;
	    data += this.addLatitude(latitude);
	    data += this.addLongitude(longitude);
	    data += this.addDouble(sog,1.94384617179,2);
	    data += this.addBearing(cogt);
	    data += this.addDate(daysSince1970);
	    data += this.addRelativeAngle(variation,"E","W");
	    data += `,${faaValid}`;
    	data += this.checksum(data);
		return data;
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
	encodeVTG(cogt, cogm, sog, faaValid) {
      	let data = "$IIVTG";
	    data += this.addBearing(cogt);
	    data += ",T";
	    data += this.addBearing(cogm);
	    data += ",M";
	    data += this.addDouble(sog, 1.94384617179, 2);
	    data += ",N";
	    data += this.addDouble(sog, 3.6, 2);
	    data += `,K,${faaValid}`;
    	data += this.checksum(data);
		return data;
	}


	/*
	NKE
	 Cross-track error:
	 $IIXTE,A,A,x.x,a,N,A*hh
	 I_Cross-track error in miles, L= left, R= right 
	 Appears to work with A
	*/
	encodeXTE(xte,faaValid) {
	    let dir = "R";
	    if ( xte < 0 ) {
	      dir = "L";
	      xte = -xte;
	    }
	  	let data = "$IIXTE,A,A";
	    data += this.addDouble(xte, 0.000539957, 3);
	    data += `,${dir},N,${faaValid}`;
		data += this.checksum(data);
		return data;
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

	encodeVWR( windAngle, windSpeed ) {
	    let data = "$IIVWR";
	    data += this.addRelativeAngle(windAngle, "R", "L", 1);
	    data += this.addDouble(windSpeed,1.94384617179,1);
	    data += ",N";
	    data += this.addDouble(windSpeed,1.0,1);
	    data += ",M";
	    data += this.addDouble(windSpeed,3.6,1);
	    data += ",K";
		data += this.checksum(data);
		return data;
	}
	encodeMVR(  windAngle,  windSpeed ) {
	    let data = "$IIMWV";
    	data += this.addRelativeSignedAngle(windAngle, 1);
		data += ",R";
    	data += this.addDouble(windSpeed,1.94384617179,1);
		data += ",N,A";
		data += this.checksum(data);
		return data;
	}
	/**
	$IIVWT,x.x,a,x.x,N,x.x,M,x.x,K*hh
	         | |   | |   | |   | |  Wind speed in kph
	         | |   | |   | |------- Wind speed in m/s
	         | |   | |------------- I_Wind speed in knots
	         | |------------------- True wind angle from 0° to 180°, L=port, R=starboard 
	*/
	encodeVWT( windAngle, windSpeed) {
	    let data = "$IIVWT";
		data += appendRelativeAngle(windAngle, 1);
		data += this.addDouble(windSpeed,1.94384617179,1);
		data += ",N";
		data += this.addDouble(windSpeed,1.0,1);
		data += ",M";
		data += this.addDouble(windSpeed,3.6,1);
		data += ",K";
		data += this.checksum(data);
		return data;
	}
	/**
	Also need MWV sentence

	$IIMWV,x.x,a,x.x,N,a*hh
	         | |   | | |-------- Valid A, V = invalid. 
	         | |   | |---------- Wind speed In knots
	         | |---------------- Reference, R = Relative, T = True
	         |------------------ Wind Angle, 0 to 359 degrees
	 */
	encodeMVT( windAngle, windSpeed) {
	    let data = "$IIMWV";
		data += appendRelativeAngle(windAngle, 1);
		data += ",T";
		data += this.addDouble(windSpeed,1.94384617179,1);
		data += ",N,A";
		data += this.checksum(data);
		return data;
	}
	encodeMTW(temperature) {
	    let data = "$IIMTW";
		data += this.addDouble(temperature-273.15,1.0,2);
		data += ",C";
		data += this.checksum(data);
		return data;
	}

	encodeXDR_airtemp(temperature) {
	    let data = "$IIXDR";
		data += ",C";
		data += this.addDouble(temperature-273.15,1.0,2);
		data += ",C,TempAir";
		data += this.checksum(data);
		return data;
	}
	encodeMTA(temperature) {
	    let data = "$IIMTA";
		data += this.addDouble(temperature-273.15,1.0,2);
		data += ",C";
		data += this.checksum(data);
		return data;
	}

	encodeXDR_barometer(pressure) {
	    let data = "$IIXDR";
		data += ",B";
		data += this.addDouble(pressure,1.0E-6,5);
		data += ",B,Barometer";
		data += this.checksum(data);
		return data;
	}

	encodeRSA( rudderPosition) {
	    let data = "$IIRSA";
		data += ",B";
		data += this.addRelativeSignedAngle(rudderPosition,1);
		data += ",A,,";
		data += this.checksum(data);
		return data;
	}
}

module.exports = {
	N2KEncoder,
	NMEA0183Encoder
};