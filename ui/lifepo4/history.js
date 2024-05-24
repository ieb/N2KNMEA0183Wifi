/*jshint node:false */
"use strict";


/**
 */ 
class Metric {
    constructor(name, precision) {
        this.name = name;
        this.currentValues = [];
        this.precision = precision || 1;
    }


    update(value) {
        if ( value !== NaN ) {
            this.currentValues.push(value);
        }
    }


    sample() {
        if ( this.currentValues.length == 0) {
            return {
                mean: NaN,
                min: NaN,
                max: NaN,
                stdev: NaN
            };
        }
        let mean = 0;
        let min = this.currentValues[0];
        let max = min;
        for (var i = 0; i < this.currentValues.length; i++) {
            mean = mean + this.currentValues[i];
            min = Math.min(this.currentValues[i], min);
            max = Math.max(this.currentValues[i], max);
        }
        mean = mean/this.currentValues.length;
        let stdev = 0;
        for (var i = 0; i < this.currentValues.length; i++) {
            const diff = (this.currentValues[i]-mean);
            stdev = stdev + (diff)*(diff);
        }
        stdev = Math.sqrt(stdev/this.currentValues.length);
        this.currentValues = [];
        mean = parseFloat(mean.toFixed(this.precision));
        min = parseFloat(min.toFixed(this.precision));
        max = parseFloat(max.toFixed(this.precision));
        stdev = parseFloat(stdev.toFixed(this.precision+2));
        return {
            mean,
            min,
            max,
            stdev            
        };
    }
}


/**
 * TimeSeries samples Metics periodically to generate a timeseries stored in persistent storage.
 */ 
class TimeSeries {

    constructor(options) {
        options = options || {};
        this.savePeriod = options.savePeriod || 60000;
        this.retentionPeriod = options.retentionPeriod || 48*3600000; // 48h

        this.storageKey = "bms_timeseries";
        this.metricSources = [];
        const storedHistory = window.localStorage.getItem(this.storageKey);
        if ( storedHistory != null) {
            console.log("Loading Stored History ", storedHistory);
            this.history = JSON.parse(storedHistory);
        } else {
            console.log("No Stored History");
            this.history = {
                ts: []
            };
        }
        this._listeners = {};

    }

    addMetric(metricSource){
        this.metricSources.push(metricSource);
    }

    clear() {
        window.localStorage.removeItem(this.storageKey);
        this.history = {
            ts:[]
        };
    }
    stop() {
        cancelInterval(this.saveInterval);
    }
    start() {
        this.saveInterval = setInterval(() => {
            this.save();
        }, this.savePeriod)
    }

    save() {
        console.log("Save");
        const samples = [];
        for (var metricSource of  this.metricSources) {
            const metricName = metricSource.name;
            if ( this.history[metricName] == undefined ) {
                this.history[metricName] = {
                    mean: [],
                    min: [],
                    max: [],
                    stdev: []
                };
                this.history[metricName].mean.fill(0,0,this.history.ts.length);
                this.history[metricName].min.fill(0,0,this.history.ts.length);
                this.history[metricName].max.fill(0,0,this.history.ts.length);
                this.history[metricName].stdev.fill(0,0,this.history.ts.length);
            }
            const samples = metricSource.sample();
            this.history[metricName].mean.push(samples.mean);
            this.history[metricName].min.push(samples.min);
            this.history[metricName].max.push(samples.max);
            this.history[metricName].stdev.push(samples.stdev);
        }
        this.history.ts.push(Date.now());
        const maxLen = this.retentionPeriod/this.savePeriod;
        if (this.history.ts.length > maxLen+100) {
            this.history.ts = this.history.ts.slice(-maxLen);
            console.log("History ts Truncated to ",this.history.ts.length)
            for ( var k in this.history ) {
                if ( this.history[k].mean !== undefined ) {
                    this.history[k].mean = this.history[k].mean.slice(-maxLen);
                    console.log("History ",k," mean Truncated to "+this.history[k].mean.length)
                }
                if ( this.history[k].max !== undefined ) {
                    this.history[k].max = this.history[k].max.slice(-maxLen);
                    console.log("History ",k," max Truncated to "+this.history[k].max.length)
                }
                if ( this.history[k].min !== undefined ) {
                    this.history[k].min = this.history[k].min.slice(-maxLen);
                    console.log("History ",k," min Truncated to "+this.history[k].min.length)
                }
                if ( this.history[k].stdev !== undefined ) {
                    this.history[k].stdev = this.history[k].stdev.slice(-maxLen);
                    console.log("History ",k," stdev Truncated to "+this.history[k].stdev.length)
                }
            }
        }
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        this._emitEvent("update", this.history);

    }

        // event emitter
    _emitEvent(name, value) {
        if ( this._listeners[name] !== undefined ) {
            this._listeners[name].forEach((f) => { f(value)});
        }
    }

    on(name, fn) {
        this._listeners[name] = this._listeners[name] || [];
        this._listeners[name].push(fn);
    }


}

class TimeSeriesManager {
    constructor(dataSource, mock) {
        this.mock = mock;
        const voltage = new Metric("voltageV",2);
        const current = new Metric("currentA",1);
        const cell0Voltage = new Metric("cell0V",3);
        const cell1Voltage = new Metric("cell1V",3);
        const cell2Voltage = new Metric("cell2V",3);
        const cell3Voltage = new Metric("cell3V",3);
        const boardTemp = new Metric("boardTempC",1);
        const cells0Temp = new Metric("cell0C",1);
        const cells1Temp = new Metric("cell1C",1);
        const stateOfCharge = new Metric("soc",0);
        const chargeRemaining = new Metric("chargeAh",0);
        this.timeSeries = new TimeSeries({
            savePeriod: 30000,
            retentionPeriod: 1800000
        });
        this.timeSeries.addMetric(voltage);
        this.timeSeries.addMetric(current);
        this.timeSeries.addMetric(cell0Voltage);
        this.timeSeries.addMetric(cell1Voltage);
        this.timeSeries.addMetric(cell2Voltage);
        this.timeSeries.addMetric(cell3Voltage);
        this.timeSeries.addMetric(boardTemp);
        this.timeSeries.addMetric(cells0Temp);
        this.timeSeries.addMetric(cells1Temp);
        this.timeSeries.addMetric(stateOfCharge);
        this.timeSeries.addMetric(chargeRemaining);
        if (this.mock ) {
            this.fakeDataSet();
        } else {
            dataSource.on("statusUpdate", (statusUpdate) => {
                voltage.update(statusUpdate.voltage);
                current.update(statusUpdate.current);
                boardTemp.update(statusUpdate.tempSensorValues[0]);
                cells0Temp.update(statusUpdate.tempSensorValues[1]);
                cells1Temp.update(statusUpdate.tempSensorValues[2]);
                stateOfCharge.update(statusUpdate.capacity.stateOfCharge);
                chargeRemaining.update(statusUpdate.capacity.fullCapacity);

            });
            dataSource.on("cellUpdate", (cellUpdate) => {
                cell0Voltage.update(cellUpdate.cellMv[0]);
                cell1Voltage.update(cellUpdate.cellMv[1]);
                cell2Voltage.update(cellUpdate.cellMv[2]);
                cell3Voltage.update(cellUpdate.cellMv[3]);
            });

        }

    }

    fakeUpdate(series, value, stdev) {
        series.stdev.push(stdev);
        const mean = value+(stdev*(Math.random() - 0.5));
        series.mean.push(mean);
        series.max.push(mean+((stdev/2) * Math.random()));
        series.min.push(mean-((stdev/2) * Math.random()));
        return mean;
    }

    fakeDataSet() {
        const now = Date.now();
        const start = now - this.timeSeries.retentionPeriod;
        const entries = this.timeSeries.retentionPeriod/this.timeSeries.savePeriod;
        this.timeSeries.history.ts = [];
        this.timeSeries.history.voltageV = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.currentA = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell0V = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell1V = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell2V = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell3V = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.boardTempC = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell0C = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.cell1C = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.soc = { mean: [], min: [], max: [], stdev: []};
        this.timeSeries.history.chargeAh = { mean: [], min: [], max: [], stdev: []};

        let chargeRemaining = 300;
        for (var i = 0; i < entries; i++) {
            this.timeSeries.history.ts.push(start+this.timeSeries.savePeriod*i);
            const current = this.fakeUpdate(this.timeSeries.history.currentA, 0, 50);
            chargeRemaining = chargeRemaining - current*this.timeSeries.savePeriod/3600000;
            chargeRemaining = Math.max(Math.min(chargeRemaining, 304.0), 20.0);
            const stateOfCharge = chargeRemaining/304.0;
            console.log(current, chargeRemaining, stateOfCharge);
            this.fakeUpdate(this.timeSeries.history.boardTempC, 20, 4);
            this.fakeUpdate(this.timeSeries.history.cell0C, 20, 4);
            this.fakeUpdate(this.timeSeries.history.cell1C, 20, 4);
            this.fakeUpdate(this.timeSeries.history.soc, stateOfCharge , 0);
            this.fakeUpdate(this.timeSeries.history.chargeAh, chargeRemaining , 0);
            this.fakeUpdate(this.timeSeries.history.cell0V, 3341, 10);
            this.fakeUpdate(this.timeSeries.history.cell1V, 3335, 10);
            this.fakeUpdate(this.timeSeries.history.cell2V, 3342, 10);
            this.fakeUpdate(this.timeSeries.history.cell3V, 3332, 10);
            this.fakeUpdate(this.timeSeries.history.voltageV, 13.34, 0.05);
        }

    }


    start() {
        if ( !this.mock ) {
            this.timeSeries.start();

        }
    }
    stop() {
        if ( !this.mock ) {
            this.timeSeries.stop();
        }
    }
}


class VoltagesGraph {
    constructor() {

    }



    update(history) {
            // Declare the chart dimensions and margins.
        if ( history.voltageV === undefined ) {
            console.log("No voltageV");
            return;
        }

        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.voltageV.mean[i]) && history.voltageV.mean[i] !== 0) {
                data.push({
                    date: new Date(history.ts[i]),
                    voltageV: history.voltageV.mean[i]
                });
            }
        }



        const x = d3.scaleTime(d3.extent(data, d => d.date), [marginLeft, width - marginRight]).nice();

        // Declare the y (vertical position) scale.
        //d3.extent(data, d => d.voltageV);
        const y = d3.scaleLinear([12,14],[height - marginBottom, marginTop]).nice();


        // Declare the line generator.
        const packVoltageLine = d3.line()
          .x(d => x(d.date))
          .y(d => y(d.voltageV));





        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("Pack V"));

      // Append a path for the line.
      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("d", packVoltageLine(data));




        // Append the SVG element.
        document.getElementById("packVoltageGraph").replaceChildren(svg.node());
    }
}

class CurrentGraph {
    constructor() {

    }

    

    update(history) {
        if ( history.currentA === undefined ) {
            console.log("No current A")
            return;
        }
        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.currentA.mean[i]) &&  (history.currentA.mean[i] !== 0)) {
                data.push({
                    date: new Date(history.ts[i]),
                    currentA: history.currentA.mean[i]
                });
            }
        }


        console.log("Pack Voltage Data ",data);

        const x = d3.scaleTime(d3.extent(data, d => d.date), [marginLeft, width - marginRight]).nice();

        console.log(x.domain());
        // Declare the y (vertical position) scale.
        const y = d3.scaleLinear(d3.extent(data, d => d.currentA),[height - marginBottom, marginTop]).nice();



        // Declare the line generator.
        const currentLine = d3.line()
          .defined(d => (d.currentA !== 0 && !isNaN(d.currentA)))
          .x(d => x(d.date))
          .y(d => y(d.currentA));



        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("Current A"));

      // Append a path for the line.
      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("d", currentLine(data));



        // Append the SVG element.
        document.getElementById("currentGraph").replaceChildren(svg.node());
    }
}

class StateOfChargeGraph {
    constructor() {

    }

    

    update(history) {
        if ( history.soc === undefined ) {
            console.log("No soc");
            return;
        }
            // Declare the chart dimensions and margins.
        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.soc.mean[i]) && history.soc.mean[i] !== 0) {
                data.push({
                    date: new Date(history.ts[i]),
                    soc: history.soc.mean[i]
                });
            }
        }


        console.log("StateOfCharge ",data);

        const x = d3.scaleTime(d3.extent(data, d => d.date), [marginLeft, width - marginRight]).nice();

        console.log(x.domain());
        // Declare the y (vertical position) scale.
        const y = d3.scaleLinear( [0,100],[height - marginBottom, marginTop]).nice();



        // Declare the line generator.
        const stateOfChargeLine = d3.line()
          .defined(d => (d.soc !== 0 && !isNaN(d.soc)))
          .x(d => x(d.date))
          .y(d => y(d.soc));



        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("StateOfCharge %"));

      // Append a path for the line.
      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("d", stateOfChargeLine(data));



        // Append the SVG element.
        document.getElementById("stateOfChargeGraph").replaceChildren(svg.node());
    }
}

class ChargeRemainingGraph {
    constructor() {

    }

    

    update(history) {
        if ( history.chargeAh === undefined ) {
            console.log("No chargeAh");
            return;
        }
            // Declare the chart dimensions and margins.
        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.chargeAh.mean[i]) && (history.chargeAh.mean[i] != 0) ) {
                data.push({
                    date: new Date(history.ts[i]),
                    chargeAh: history.chargeAh.mean[i]
                });
            }
        }


        console.log("ChrgeRemaining ",data);

        const x = d3.scaleTime(d3.extent(data, d => d.date), [marginLeft, width - marginRight]).nice();

        console.log(x.domain());
        // Declare the y (vertical position) scale.
        const y = d3.scaleLinear(d3.extent(data, d => d.chargeAh),[height - marginBottom, marginTop]).nice();



        // Declare the line generator.
        const chargeRemainingLine = d3.line()
          .defined(d => (d.chargeAh !== 0 && !isNaN(d.chargeAh)))
          .x(d => x(d.date))
          .y(d => y(d.chargeAh));



        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("Charge Remaining Ah %"));

      // Append a path for the line.
      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "steelblue")
          .attr("stroke-width", 1.5)
          .attr("d", chargeRemainingLine(data));



        // Append the SVG element.
        document.getElementById("chargeRemainingGraph").replaceChildren(svg.node());
    }
}

class CellVoltagesGraph {
    constructor() {

    }

    update(history) {
        if ( history.cell0V === undefined 
            || history.cell1V === undefined 
            || history.cell2V === undefined 
            || history.cell3V === undefined  ) {
            console.log("No cellMV");

            return;
        }
            // Declare the chart dimensions and margins.
        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        data.push([]);
        data.push([]);
        data.push([]);
        data.push([]);
        
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.cell0V.mean[i]) && history.cell0V.mean[i] ) {
                data[0].push({date: new Date(history.ts[i]), v:  0.001*history.cell0V.mean[i]});
            }
            if ( !isNaN(history.cell1V.mean[i]) && history.cell1V.mean[i] ) {
                data[1].push({date: new Date(history.ts[i]), v:  0.001*history.cell1V.mean[i]});
            }
            if ( !isNaN(history.cell2V.mean[i]) && history.cell2V.mean[i] ) {
                data[2].push({date: new Date(history.ts[i]), v:  0.001*history.cell2V.mean[i]});
            }
            if ( !isNaN(history.cell3V.mean[i]) && history.cell3V.mean[i] ) {
                data[3].push({date: new Date(history.ts[i]), v:  0.001*history.cell2V.mean[i]});
            }
        }

        console.log("Cell Voltage Data ",data);


        let times = d3.extent(data[0], d => d.date)
        times = times.concat(d3.extent(data[1], d => d.date));
        times = times.concat(d3.extent(data[2], d => d.date));
        times = times.concat(d3.extent(data[3], d => d.date));
        const x = d3.scaleTime(d3.extent(times), [marginLeft, width - marginRight]).nice();

        console.log(x.domain());
        // Declare the y (vertical position) scale.
        let voltages = d3.extent(data[0], d => d.cell0Voltage);
        voltages = voltages.concat(d3.extent(data[1], d => d.v));
        voltages = voltages.concat(d3.extent(data[2], d => d.v));
        voltages = voltages.concat(d3.extent(data[3], d => d.v));
        const y = d3.scaleLinear(d3.extent(voltages),[height - marginBottom, marginTop]).nice();



        // Declare the line generator.
        const line = d3.line()
          .defined(d => (d.v !== 0 && !isNaN(d.v)))
          .x(d => x(d.date))
          .y(d => y(d.v));





        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("Cell Voltages"));

      // Append a path for the line.

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "red")
          .attr("stroke-width", 1.5)
          .attr("d", line(data[0]));

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "green")
          .attr("stroke-width", 1.5)
          .attr("d", line(data[1]));

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "blue")
          .attr("stroke-width", 1.5)
          .attr("d", line(data[2]));
       svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "yellow")
          .attr("stroke-width", 1.5)
          .attr("d", line(data[3]));


        // Append the SVG element.
        document.getElementById("cellVoltagesGraph").replaceChildren(svg.node());

    }
}

class TemperatureGraph {
    constructor() {

    }

    update(history) {
        if ( history.boardTempC === undefined 
            || history.cell0C === undefined 
            || history.cell1C === undefined ) {
            console.log("No cellC");
            return;
        }
            // Declare the chart dimensions and margins.
        const width = 400;
        const height = 320;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        // Declare the x (horizontal position) scale.
        const data = [];
        data.push([]);
        data.push([]);
        data.push([]);
        for (var i = 0; i < history.ts.length; i++) {
            if ( !isNaN(history.boardTempC.mean[i]) && history.boardTempC.mean[i] !== 0 ) {
                data[0].push({date: new Date(history.ts[i]), t:  history.boardTempC.mean[i]});
            }
            if ( !isNaN(history.cell0C.mean[i]) && history.cell0C.mean[i] !== 0 ) {
                data[1].push({date: new Date(history.ts[i]), t:  history.cell0C.mean[i]});
            }
            if ( !isNaN(history.cell1C.mean[i]) && history.cell1C.mean[i] !== 0 ) {
                data[2].push({date: new Date(history.ts[i]), t:  history.cell1C.mean[i]});
            }
        }

        console.log("Temperatures ",data);


        let times = d3.extent(data[0], d => d.date)
        times = times.concat(d3.extent(data[1], d => d.date));
        times = times.concat(d3.extent(data[2], d => d.date));
        const x = d3.scaleTime(d3.extent(times), [marginLeft, width - marginRight]).nice();
        // Declare the y (vertical position) scale.
        let temperatures = d3.extent(data[0], d => d.t);
        temperatures = temperatures.concat(d3.extent(data[1], d => d.t));
        temperatures = temperatures.concat(d3.extent(data[2], d => d.t));
        const y = d3.scaleLinear(d3.extent(temperatures),[height - marginBottom, marginTop]).nice();



        // Declare the line generator.
        const tempLine = d3.line()
          .defined(d => (d.t !== 0 && !isNaN(d.t)))
          .x(d => x(d.date))
          .y(d => y(d.t));





        // Create the SVG container.
      // Create the SVG container.
      const svg = d3.create("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height])
          .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

      // Add the x-axis.
      svg.append("g")
          .attr("transform", `translate(0,${height - marginBottom})`)
          .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // Add the y-axis, remove the domain line, add grid lines and a label.
      svg.append("g")
          .attr("transform", `translate(${marginLeft},0)`)
          .call(d3.axisLeft(y).ticks(height / 40))
          .call(g => g.select(".domain").remove())
          .call(g => g.selectAll(".tick line").clone()
              .attr("x2", width - marginLeft - marginRight)
              .attr("stroke-opacity", 0.1))
          .call(g => g.append("text")
              .attr("x", -marginLeft)
              .attr("y", 10)
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text("Temperatures C"));

      // Append a path for the line.

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "red")
          .attr("stroke-width", 1.5)
          .attr("d", tempLine(data[0]));

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "green")
          .attr("stroke-width", 1.5)
          .attr("d", tempLine(data[1]));

      svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "blue")
          .attr("stroke-width", 1.5)
          .attr("d", tempLine(data[2]));


        // Append the SVG element.
        document.getElementById("temperatureGraph").replaceChildren(svg.node());

    }
}
