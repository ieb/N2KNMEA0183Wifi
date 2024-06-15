

class DisplayUtils {
  static calMinMax(data) {
    if (data && data.length > 1) {
      let minV = data[0];
      let maxV = data[0];
      for (let i = 0; i < data.length; i++) {
        if (minV > data[i]) {
          minV = data[i];
        }
        if (maxV < data[i]) {
          maxV = data[i];
        }
      }
      return { minV, maxV };
    }
    return undefined;
  }

  // calculate x drawing co-ordinate based on the number of samples and the width of the viewport
  // min
  static x(i, range, hwidth) {
    const width = hwidth || 320;
    return (i * (width / range.nsamples));
  }

  // calculate the y drawing co-ordinate based on the min and max and the height of the viewport
  static y(v, range, hheight) {
    const height = hheight || 180;
    return height - (((v - range.minV) * height) / (range.maxV - range.minV));
  }
}

class RelativeAngle {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '--';
    }
    return `${(v * (180 / Math.PI)).toFixed(0)}`;
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'deg'; }

  static get type() { return 'relativeAngle'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * (180 / Math.PI));
  }

  static range(h) {
    // h is in display units, converted by caller.
    const range = DisplayUtils.calMinMax(h);
    if (!range) {
      return undefined;
    }
    // adjust min max in system units (radians)
    if (range.minV > -60 && range.maxV < 60) {
      range.minV = -60;
      range.maxV = 60;
    } else if (range.minV > -90 && range.maxV < 90) {
      range.minV = -90;
      range.maxV = 90;
    } else {
      range.minV = -180;
      range.maxV = 180;
    }
    range.nsamples = h.length;
    return range;
  }
}

class RelativeAnglePS extends RelativeAngle {
  static get type() { return 'relativePS'; }

  static display(v) {
    if (v === undefined || v === -1E9) {
      return '--';
    }

    if (v < 0) {
      return `P${(-v * (180 / Math.PI)).toFixed(0)}`;
    }
    return `S${(v * (180 / Math.PI)).toFixed(0)}`;
  }

  static cssClass(v) {
    if (v === undefined) {
      return 'undef';
    }
    if (v < 0) {
      return 'port';
    }
    return 'starboard';
  }
}

class RelativeBearing {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '--';
    }
    if (v < 0) {
      return `W${(-v * (180 / Math.PI)).toFixed(0)}`;
    }
    return `E${(v * (180 / Math.PI)).toFixed(0)}`;
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'deg'; }

  static get type() { return 'relativeBearing'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * (180 / Math.PI));
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    if (minMax.minV > -60 && minMax.maxV < 60) {
      minMax.minV = -60;
      minMax.maxV = 60;
    } else if (minMax.minV > -90 && minMax.maxV < 90) {
      minMax.minV = -90;
      minMax.maxV = 90;
    } else {
      minMax.minV = -180;
      minMax.maxV = 180;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}
class WindSpeed {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v * 1.9438452).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'kn'; }

  static get type() { return 'speed'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * 1.9438452);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 10) {
      minMax.maxV = 10;
    } else if (minMax.maxV < 20) {
      minMax.maxV = 20;
    } else if (minMax.maxV < 30) {
      minMax.maxV = 30;
    } else if (minMax.maxV < 40) {
      minMax.maxV = 40;
    } else if (minMax.maxV < 50) {
      minMax.maxV = 50;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}
class Speed {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v * 1.9438452).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'kn'; }

  static get type() { return 'speed'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * 1.9438452);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 10) {
      minMax.maxV = 10;
    } else if (minMax.maxV < 15) {
      minMax.maxV = 15;
    } else if (minMax.maxV < 20) {
      minMax.maxV = 20;
    } else if (minMax.maxV < 30) {
      minMax.maxV = 30;
    } else if (minMax.maxV < 40) {
      minMax.maxV = 40;
    } else if (minMax.maxV < 50) {
      minMax.maxV = 50;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Distance {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v * 0.000539957).toFixed(2);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'Nm'; }

  static get type() { return 'distance'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * 0.000539957);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class AtmosphericPressure {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    // convery Pascale or mbar
    return (v * 0.01).toFixed(0);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'mBar'; }

  static get type() { return 'pressure'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * 0.01);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }

    minMax.minV = Math.floor(minMax.minV / 10) * 10;
    minMax.maxV = (Math.floor(minMax.maxV / 10) + 1) * 10;
    minMax.nsamples = h.length;
    return minMax;
  }
}




class Bearing {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v * (180 / Math.PI)).toFixed(0);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'deg'; }

  static get type() { return 'bearing'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * (180 / Math.PI));
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    minMax.maxV = 360;
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Latitude {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }

    let ns = 'N';
    let vd = v;
    if (vd < 0) {
      ns = 'S';
      vd = -vd;
    }
    const dd = Math.trunc(vd);
    const mm = (vd - dd) * 60;
    return `${(`000${dd.toFixed(0)}`).slice(-2)}°${(`00${mm.toFixed(3)}`).slice(-6)}′${ns}`;
  }


  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'lat'; }

  static get type() { return 'position'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }
}

class Longitude {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }

    let ew = 'E';
    let vd = v;
    if (vd < 0) {
      ew = 'W';
      vd = -vd;
    }
    const dd = Math.trunc(v);
    const mm = (vd - dd) * 60;
    return `${(`000${dd.toFixed(0)}`).slice(-3)}°${(`00${mm.toFixed(3)}`).slice(-6)}′${ew}`;
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'lon'; }

  static get type() { return 'position'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }
}




class Percent {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v * 100).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return '%'; }

  static get type() { return 'ratio'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v * 100);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 0.10) {
      minMax.maxV = 0.10;
    } else if (minMax.maxV < 0.20) {
      minMax.maxV = 0.20;
    } else if (minMax.maxV < 0.50) {
      minMax.maxV = 0.50;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Ratio {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return '%'; }

  static get type() { return 'ratio'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 0.10) {
      minMax.maxV = 0.10;
    } else if (minMax.maxV < 0.20) {
      minMax.maxV = 0.20;
    } else if (minMax.maxV < 0.50) {
      minMax.maxV = 0.50;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Capacity {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'l'; }

  static get type() { return 'capacity'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 10) {
      minMax.maxV = 10;
    } else if (minMax.maxV < 20) {
      minMax.maxV = 20;
    } else if (minMax.maxV < 50) {
      minMax.maxV = 50;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Depth {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'm'; }

  static get type() { return 'depth'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 10) {
      minMax.maxV = 10;
    } else if (minMax.maxV < 20) {
      minMax.maxV = 20;
    } else if (minMax.maxV < 50) {
      minMax.maxV = 50;
    } else if (minMax.maxV < 200) {
      minMax.maxV = 200;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Rpm {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v).toFixed(0);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'rpm'; }

  static get type() { return 'rpm'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = 0;
    if (minMax.maxV < 1000) {
      minMax.maxV = 1000;
    } else if (minMax.maxV < 2000) {
      minMax.maxV = 2000;
    } else if (minMax.maxV < 5000) {
      minMax.maxV = 5000;
    }
    minMax.nsamples = h.length;
    return minMax;
  }
}
class Temperature {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v - 273.15).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'C'; }

  static get type() { return 'temperature'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v - 273.15);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = Math.floor(minMax.minV / 10) * 10;
    minMax.maxV = (Math.floor(minMax.maxV / 10) + 1) * 10;
    minMax.nsamples = h.length;
    return minMax;
  }
}

class Voltage {
  static display(v) {
    if (v === undefined || v === -1E9 || v.toFixed === undefined) {
      return '-.-';
    }
    return (v).toFixed(2);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'V'; }

  static get type() { return 'voltage'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = Math.floor(minMax.minV / 10) * 10;
    minMax.maxV = (Math.floor(minMax.maxV / 10) + 1) * 10;
    minMax.nsamples = h.length;
    return minMax;
  }
}
class Current {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    return (v).toFixed(1);
  }

  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return true; }

  static get units() { return 'A'; }

  static get type() { return 'current'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return (v);
  }

  static range(h) {
    // h is in display units, converted by caller.
    const minMax = DisplayUtils.calMinMax(h);
    if (!minMax) {
      return undefined;
    }
    minMax.minV = Math.floor(minMax.minV / 10) * 10;
    minMax.maxV = (Math.floor(minMax.maxV / 10) + 1) * 10;
    minMax.nsamples = h.length;
    return minMax;
  }
}

class TimeStamp {
  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'age S'; }

  static get type() { return 'time'; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    return ((Date.now() - v) / 1000);
  }

  static display(v) {
    if (v === undefined) {
      return '-.-';
    }
    return ((Date.now() - v) / 1000).toFixed(0);
  }
}


class GPSDate {
  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'date'; }

  static get type() { return ''; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return 0;
    }
    const d = new Date(v * 3600000 * 24);
    return `${(`00${(d.getDate()).toFixed(0)}`).slice(-2)}:${(`00${(d.getMonth() + 1).toFixed(0)}`).slice(-2)}:${(d.getYear() + 1900).toFixed(0)}`;
  }

  static display(v) {
    if (v === undefined) {
      return '-.-';
    }
    const d = new Date(v * 3600000 * 24);
    return `${(`00${(d.getDate()).toFixed(0)}`).slice(-2)}/${(`00${(d.getMonth() + 1).toFixed(0)}`).slice(-2)}/${(d.getYear() + 1900).toFixed(0)}`;
  }
}

class GPSTime {
  static get tl() { return ''; }

  static get tr() { return ''; }

  static get withHistory() { return false; }

  static get units() { return 'time'; }

  static get type() { return ''; }

  static toDisplayUnits(v) {
    if (v === undefined || v === -1E9) {
      return '--';
    }
    // perhaps not right, perhaps this shoud be a Time object and not a string.
    // hh:mm:ss.ss
    const hh = Math.trunc(v / 3600);
    const mm = Math.trunc((v - (hh * 3600)) / 60);
    const ss = v - (hh * 3600) - (mm * 60);
    return `${(`00${(hh).toFixed(0)}`).slice(-2)}:${(`00${(mm).toFixed(0)}`).slice(-2)}:${(`00${(ss).toFixed(2)}`).slice(-5)}`;
  }

  static display(v) {
    if (v === undefined) {
      return '-.-';
    }
    // hh:mm:ss.ss
    const hh = Math.trunc(v / 3600);
    const mm = Math.trunc((v - (hh * 3600)) / 60);
    const ss = v - (hh * 3600) - (mm * 60);
    return `${(`00${(hh).toFixed(0)}`).slice(-2)}:${(`00${(mm).toFixed(0)}`).slice(-2)}:${(`00${(ss).toFixed(2)}`).slice(-5)}`;
  }
}

class DefaultDataType {
  static display(v) {
    if (v === undefined || v === -1E9) {
      return '-.-';
    }
    if (v.name !== undefined) {
      return v.name;
    }
    try {
      return (v).toFixed(1);
    } catch (e) {
      return v;
    }
  }
}





class DataTypes {
  static get dataTypes() {
    return {
      aws: WindSpeed,
      tws: WindSpeed,
      awa: RelativeAnglePS,
      twa: RelativeAnglePS,
      roll: RelativeAnglePS,
      yaw: RelativeAngle,
      pitch: RelativeAngle,
      leeway: RelativeAnglePS,
      cogt: Bearing,
      hdt: Bearing,
      gwdt: Bearing,
      gwdm: Bearing,
      hdm: Bearing,
      cogm: Bearing,
      variation: RelativeBearing,
      polarSpeed: Speed,
      polarSpeedRatio: Percent,
      polarVmg: Speed,
      vmg: Speed,
      targetVmg: Speed,
      targetStw: Speed,
      targetTwa: RelativeAnglePS,
      targetAwa: RelativeAnglePS,
      targetAws: Speed,
      polarVmgRatio: Percent,
      oppHeadingTrue: Bearing,
      oppTrackTrue: Bearing,
      oppTrackMagnetic: Bearing,
      oppHeadingMagnetic: Bearing,
      sog: Speed,
      stw: Speed,
      lastUpdate: TimeStamp,
      lastChange: TimeStamp,
      lastCalc: TimeStamp,
      lastOutput: TimeStamp,
      deviation: RelativeBearing,
      log: Distance,
      tripLog: Distance,
      atmosphericPressure: AtmosphericPressure,
      latitude: Latitude,
      longitude: Longitude,
      fuelLevel: Ratio,
      fuelCapacity: Capacity,
      dbt: Depth,
      depthOffset: Depth,
      rudderPosition: RelativeAnglePS,
      engineSpeed: Rpm,
      engineCoolantTemperature: Temperature,
      temperature: Temperature,
      alternatorVoltage: Voltage,
      voltage: Voltage,
      current: Current,
      gpsDaysSince1970: GPSDate,
      gpsSecondsSinceMidnight: GPSTime,
      seaTemperature: Temperature,
      variationdaysSince1970: GPSDate,
      speedGroundReferenced: Speed,
      gnssLastUpdate: TimeStamp,
      setM: Bearing,
      setT: Bearing,
      drift: Speed,
      engineRoomTemperature: Temperature,
      mainCabinTemperature: Temperature,
      exhaustTemperature: Temperature,
      alternatorTemperature: Temperature,
      alternatorTemperature_0: Temperature,
    };
  }

  static get displayNames() {
    return {
      engineCoolantTemperature: 'coolant',
      atmosphericPressure: 'pressure',
    };
  }

  static getDisplayName(field) {
    if (DataTypes.displayNames[field]) {
      return DataTypes.displayNames[field];
    }
    if (field.length > 15) {
      return `${field.substring(0, 13)}...`;
    }
    return field;
  }

  static getDataType(field) {
    const fieldKey = field.split('_')[0];
    if (DataTypes.dataTypes[fieldKey]) {
      return DataTypes.dataTypes[fieldKey];
    }
    return DefaultDataType;
  }
}

export { DataTypes, DisplayUtils };
