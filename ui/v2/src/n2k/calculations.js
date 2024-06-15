/* eslint-disable max-classes-per-file, no-underscore-dangle */

// units are degrees and kn.
const pogo1250Polar = {
  name: 'pogo1250',
  tws: [0, 4, 6, 8, 10, 12, 14, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  twa: [0, 5, 10, 15, 20, 25, 32, 36, 40, 45, 52, 60, 70, 80, 90, 100, 110,
    120, 130, 140, 150, 160, 170, 180],
  stw: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0.4, 0.6, 0.8, 0.9, 1, 1, 1, 1.1, 1.1, 1.1, 1.1, 0.1, 0.1, 0.1, 0, 0],
    [0, 0.8, 1.2, 1.6, 1.8, 2, 2, 2.1, 2.1, 2.2, 2.2, 2.2, 0.5, 0.2, 0.2, 0, 0],
    [0, 1.2, 1.8, 2.4, 2.7, 2.9, 3, 3.1, 3.2, 3.3, 3.3, 3.3, 1.2, 0.5, 0.3, 0, 0],
    [0, 1.4, 2.1, 2.7, 3.1, 3.4, 3.5, 3.6, 3.6, 3.7, 3.8, 3.7, 1.7, 0.7, 0.4, 0, 0],
    [0, 1.7, 2.5, 3.2, 3.7, 4, 4.1, 4.3, 4.3, 4.4, 4.5, 4.4, 2.6, 1.1, 0.4, 0, 0],
    [0, 2.8, 4.2, 5.4, 6.2, 6.7, 6.9, 7.1, 7.2, 7.4, 7.5, 7.4, 5.6, 2.2, 0.7, 0, 0],
    [0, 3.1, 4.7, 5.9, 6.7, 7, 7.2, 7.4, 7.6, 7.8, 7.9, 7.9, 6.5, 2.6, 0.8, 0, 0],
    [0, 3.5, 5.1, 6.3, 7, 7.3, 7.5, 7.7, 7.9, 8.1, 8.2, 8.3, 7.4, 2.9, 1.2, 0, 0],
    [0, 3.8, 5.6, 6.7, 7.3, 7.6, 7.8, 8, 8.2, 8.4, 8.5, 8.6, 8.2, 3, 1.3, 0, 0],
    [0, 4.2, 6, 7, 7.7, 8, 8.2, 8.3, 8.6, 8.9, 9, 9.1, 8.9, 3.2, 1.4, 0, 0],
    [0, 4.6, 6.3, 7.3, 8, 8.3, 8.5, 8.7, 9, 9.3, 9.5, 9.6, 9.6, 3.8, 1.9, 0, 0],
    [0, 4.8, 6.6, 7.5, 8.2, 8.6, 8.9, 9.1, 9.5, 9.8, 10.1, 10.4, 10.4, 4.2, 2.1, 0, 0],
    [0, 5, 6.9, 7.9, 8.3, 8.8, 9.2, 9.4, 9.9, 10.4, 10.9, 11.3, 11.3, 4.5, 2.3, 0, 0],
    [0, 5.3, 7.1, 8.1, 8.6, 8.9, 9.3, 9.7, 10.4, 11.1, 11.8, 12.5, 12.5, 5.6, 3.1, 0.6, 0.6],
    [0, 5.4, 7.1, 8.2, 8.8, 9.2, 9.5, 9.9, 10.9, 11.9, 12.8, 14.1, 14.1, 7.1, 4.2, 0.7, 0.7],
    [0, 5.3, 7, 8.1, 8.8, 9.4, 9.8, 10.3, 11.2, 12.7, 14.3, 15, 15, 8.3, 5.3, 1.5, 1.5],
    [0, 5, 6.8, 7.8, 8.6, 9.4, 10, 10.6, 11.8, 13.2, 14.9, 15.7, 15.7, 9.4, 6.3, 1.6, 1.6],
    [0, 4.5, 6.3, 7.4, 8.3, 9, 9.8, 10.6, 12.3, 14.4, 15.6, 16.6, 16.6, 10.8, 7.5, 2.5, 2.5],
    [0, 3.8, 5.6, 6.9, 7.8, 8.5, 9.2, 10, 12.2, 15, 16.3, 17.6, 17.6, 13.2, 9.7, 3.5, 2.6],
    [0, 3.2, 4.8, 6.1, 7.1, 7.9, 8.6, 9.3, 10.9, 14.4, 16.8, 18.6, 18.6, 14.9, 11.2, 3.7, 3.7],
    [0, 2.7, 4.1, 5.3, 6.4, 7.3, 8, 8.7, 10, 12.4, 15.4, 17.9, 17.9, 15.2, 11.6, 4.5, 3.6],
    [0, 2.4, 3.6, 4.8, 5.9, 6.8, 7.6, 8.2, 9.4, 11.4, 14.3, 16.6, 16.6, 15.8, 12.5, 5, 4.2],
    [0, 2.2, 3.3, 4.4, 5.5, 6.4, 7.2, 7.9, 9, 10.6, 12.8, 15.4, 15.4, 15.4, 12.3, 4.6, 3.9],
  ],
};

class Performance {
  constructor() {
    this.polarTable = this._finishLoad(pogo1250Polar);
    // polarTable is a fine polarTable with lookups in
    // radians and m/s result in m/s
  }

  /**
     All inputs outputs are SI, rad and m/s.
     */

  calcPerformance(state) {
    let absTwa = state.twa;
    if (state.twa < 0) absTwa = -state.twa;
    const twsi = Performance._findIndexes(this.polarTable.tws, state.tws);
    let twai = Performance._findIndexes(this.polarTable.twa, absTwa);
    state.polarSpeed = this.polarTable.stw[twai[1]][twsi[1]];
    if (state.polarSpeed !== 0) {
      state.polarSpeedRatio = state.stw / state.polarSpeed;
    } else {
      state.polarSpeedRatio = 0;
    }
    state.polarVmg = state.polarSpeed * Math.cos(absTwa);
    state.vmg = state.stw * Math.cos(absTwa);

    // calculate the optimal VMG angles
    let twal = 0;
    let twah = Math.PI;
    if (absTwa < Math.PI / 2) {
      twah = Math.PI / 2;
    } else {
      twal = Math.PI / 2;
      // downwind scan from 90 - 180
    }
    state.targetVmg = 0;
    state.targetTwa = 0;
    state.targetStw = 0;
    for (let ttwa = twal; ttwa <= twah; ttwa += Math.PI / 180) {
      twai = Performance._findIndexes(this.polarTable.twa, ttwa);
      const tswt = this.polarTable.stw[twai[1]][twsi[1]];
      const tvmg = tswt * Math.cos(ttwa);
      if (Math.abs(tvmg) > Math.abs(state.targetVmg)) {
        state.targetVmg = tvmg;
        state.targetTwa = ttwa;
        state.targetStw = tswt;
      }
    }
    if (state.twa < 0) {
      state.targetTwa = -state.targetTwa;
    }

    const apparent = Performance.calcAparentWind(state.targetTwa, state.tws, state.targetStw);
    // give an indicator of sail selection, and is easier to steer to upwind.
    state.targetAwa = apparent.awa;
    state.targetAws = apparent.aws;

    if (Math.abs(state.targetVmg) > 1.0E-8) {
      state.polarVmgRatio = state.vmg / state.targetVmg;
    } else {
      state.polarVmgRatio = 0;
    }

    // calculate other track
    state.leeway = state.leeway || 0;

    state.gwdt = Performance._fixDirection(state.hdt + state.twa);
    state.oppHeadingTrue = Performance._fixDirection(state.gwdt + state.targetTwa);
    if (state.twa > 0) {
      state.oppTrackTrue = state.oppHeadingTrue + state.leeway * 2;
    } else {
      state.oppTrackTrue = state.oppHeadingTrue - state.leeway * 2;
    }
    if (state.variation !== undefined) {
      state.gwdm = Performance._fixDirection(state.gwdt + state.variation);
      state.oppTrackMagnetic = state.oppTrackTrue + state.variation;
      state.oppHeadingMagnetic = Performance._fixDirection(state.oppHeadingTrue + state.variation);
    }
  }

  _finishLoad(polar) {
    if (polar.twa.length !== polar.stw.length) {
      throw Error(`Polar STW does not have enough rows for the TWA array. Expected:${polar.twa.length} Found:${polar.stw.length}`);
    }
    for (let i = 0; i < polar.stw.length; i++) {
      if (polar.tws.length !== polar.stw[i].length) {
        throw Error(`Polar STW row ${i} does not ave enough columns Expected:${polar.tws.length} Found:${polar.stw.length}`);
      }
    }
    for (let i = 1; i < polar.twa.length; i++) {
      if (polar.twa[i] < polar.twa[i - 1]) {
        throw Error('Polar TWA must be in ascending order and match the columns of stw.');
      }
    }
    for (let i = 1; i < polar.tws.length; i++) {
      if (polar.tws[i] < polar.tws[i - 1]) {
        throw Error('Polar TWA must be in ascending order and match the rows of stw.');
      }
    }
    // Optimisation.
    return this._buildFinePolarTable(polar);
  }

  /*

    The best way of thinking about these conversions is to decompose the wind speed and angle
    into components of x and y with x being in the direction of the boat. Then subtract boat
    speed from x to get from apparent to true, and add boat speed to x to get from true to
    apparent.

    Then convert the x and y components back to an angle and length (speed), using atan and
    pythagorus. Cos takes care of any sign issue, since when it becomes > 90 it is < 0 hence
    the value of x in all cases is correct.
    atan2 takes care of x == 0.
    */

  static calcTrueWind(awa, aws, stw) {
    const apparentX = Math.cos(awa) * aws;
    const apparentY = Math.sin(awa) * aws;
    const x = apparentX - stw;
    const twa = Math.atan2(apparentY, x);
    const tws = Math.sqrt(apparentY ** 2 + x ** 2);
    // console.log(`Calc TRue awa:${awa} aws:${aws} stw:${stw} twa:${twa} tws:${tws}`);
    return {
      twa,
      tws,
    };
  }

  static calcAparentWind(twa, tws, stw) {
    const trueX = Math.cos(twa) * tws;
    const trueY = Math.sin(twa) * tws;
    const x = trueX + stw;
    const awa = Math.atan2(trueY, x);
    const aws = Math.sqrt(trueY ** 2 + x ** 2);
    // console.log(`Calc Aparent twa:${twa} tws:${tws} stw:${stw} awa:${awa} aws:${aws}`);
    return {
      awa,
      aws,
    };
  }

  /**
     * Input is in degrees and knots,
     * finePolar should contain radians and m/s
     */
  _buildFinePolarTable(polarInput) {
    const finePolar = {
      lookup: true,
      siunits: true,
      twsstep: 0.1, // 600 0 - 60Kn
      twastep: 1, //  180 0 - 180 deg
      tws: [],
      twa: [],
      stw: [], // 108000 elements
    };
    const startFineBuild = Date.now();
    // build the twa lookup in radians
    for (let twa = 0; twa < polarInput.twa[polarInput.twa.length - 1]; twa += 1) {
      finePolar.twa.push(twa * (Math.PI / 180));
      finePolar.stw.push([]);
    }
    // build fine polar in m/s
    for (let tws = 0; tws < polarInput.tws[polarInput.tws.length - 1]; tws += 0.1) {
      finePolar.tws.push(tws / 1.9438444924);
    }
    for (let ia = 0; ia < finePolar.twa.length; ia++) {
      for (let is = 0; is < finePolar.tws.length; is++) {
        finePolar.stw[ia][is] = Performance._calcPolarSpeed(
          polarInput,
          finePolar.tws[is],
          finePolar.twa[ia],
        );
      }
    }
    this.fineBuildTime = Date.now() - startFineBuild;
    return finePolar;
  }

  static _findIndexes(a, v) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] > v) {
        if (i === 0) {
          return [0, 0];
        }
        return [i - 1, i];
      }
    }
    return [a.length - 1, a.length - 1];
  }

  /**
     * find y between yl and yh in the same ratio of x between xl, xh
     * simple straight line interpolation.
     */
  static _interpolate(x, xl, xh, yl, yh) {
    let r = 0;
    if (x >= xh) {
      r = yh;
    } else if (x <= xl) {
      r = yl;
    } else if ((xh - xl) < 1.0E-8) {
      r = yl + (yh - yl) * ((x - xl) / 1.0E-8);
    } else {
      r = yl + (yh - yl) * ((x - xl) / (xh - xl));
    }
    return r;
  }

  static _fixDirection(d) {
    let ret = d;
    if (ret > Math.PI * 2) ret -= Math.PI * 2;
    if (ret < 0) ret += Math.PI * 2;
    return ret;
  }

  /**
     * returns the calculated polar speed in m/s
     * Polar table is in kn and deg
     * tws is in m/s
     * twa is in rad
     */
  static _calcPolarSpeed(polarInput, twsr, twar) {
    // polar Data is in KN and deg
    const tws = twsr * 1.9438444924;
    const twa = twar * (180 / Math.PI);
    // after here in Deg and Kn
    const twsi = Performance._findIndexes(polarInput.tws, tws);
    const twai = Performance._findIndexes(polarInput.twa, twa);
    const stwl = Performance._interpolate(
      twa,
      polarInput.twa[twai[0]],
      polarInput.twa[twai[1]],
      polarInput.stw[twai[0]][twsi[0]],
      polarInput.stw[twai[1]][twsi[0]],
    );
    // interpolate a stw high value for a given tws and range
    const stwh = Performance._interpolate(
      twa,
      polarInput.twa[twai[0]],
      polarInput.twa[twai[1]],
      polarInput.stw[twai[0]][twsi[1]],
      polarInput.stw[twai[1]][twsi[1]],
    );
    // interpolate a stw final value for a given tws and range using the high an low values for twa.
    // return in m/s
    return Performance._interpolate(
      tws,
      polarInput.tws[twsi[0]],
      polarInput.tws[twsi[1]],
      stwl,
      stwh,
    ) / 1.9438444924;
  }
}


class Calculations {
  constructor() {
    this.performance = new Performance({});
    this.state = {
      lastCalc: 0,
      lastChange: 0,
    };
  }

  static fixBearing(v) {
    let ret = v;
    if (ret > 2 * Math.PI) {
      ret -= 2 * Math.PI;
    } else if (ret < 0) {
      ret += 2 * Math.PI;
    }
    return ret;
  }

  update(store) {
    if (store.state.lastChange > this.state.lastChange) {
      const newState = {
        awa: store.state.awa,
        aws: store.state.aws,
        roll: store.state.roll,
        hdm: store.state.hdm,
        stw: store.state.stw,
        variation: store.state.variation,
        cogt: store.state.cogt,
        sog: store.state.sog,
      };

      // dont update anything with value of -1E-9 in the calculations.
      for (const k in newState) {
        if (newState[k] !== -1E9 && newState[k] !== this.state[k]) {
          this.state.lastChange = store.state.lastChange;
          this.state[k] = newState[k];
        }
      }
      this.enhance();
      this.state.lastCalc = this.state.lastChange;
    }
    return this.state;
  }

  /*

    required inputs
    aws, awa, stw, roll, cogt, hdm, variation

    */

  enhance() {
    this.state.cogm = undefined;
    this.state.hdt = undefined;
    if (this.state.variation !== undefined) {
      if (this.state.cogt !== undefined) {
        this.state.cogm = Calculations.fixBearing(this.state.cogt + this.state.variation);
      }
      if (this.state.hdm !== undefined) {
        this.state.hdt = Calculations.fixBearing(this.state.hdm - this.state.variation);
      }
    }
    this.state.leeway = 0;
    if (this.state.stw !== undefined
            && this.state.roll !== undefined
            && this.state.awa !== undefined
            && this.state.aws !== undefined
            && this.state.stw !== undefined) {
      this.state.leeway = 0.0;
      if (Math.abs(this.state.awa) < Math.PI / 2
                 && this.state.aws < 30 / 1.943844) {
        if (this.state.stw > 0.5) {
          // TODO check units.
          // This comes from Pedrick see http://www.sname.org/HigherLogic/System/DownloadDocumentFile.ashx?DocumentFileKey=5d932796-f926-4262-88f4-aaca17789bb0
          // for aws < 30 and awa < 90. UK  =15 for masthead and 5 for fractional
          this.state.leeway = (5 * this.state.roll) / (this.state.stw * this.state.stw);
        }
      }
    }

    this.state.twa = undefined;
    this.state.tws = undefined;
    if (this.state.awa !== undefined
            && this.state.aws !== undefined
            && this.state.stw !== undefined) {
      const trueWind = Performance.calcTrueWind(this.state.awa, this.state.aws, this.state.stw);
      this.state.twa = trueWind.twa;
      this.state.tws = trueWind.tws;
    }
    if (this.state.tws !== undefined
            && this.state.twa !== undefined
            && this.state.stw !== undefined
            && this.state.hdt !== undefined) {
      this.performance.calcPerformance(this.state);
    }
  }
}

export { Calculations };
