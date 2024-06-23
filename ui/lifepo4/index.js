import { JDBBMSReader } from './bmsblereader.js';
import {
  TemperatureGraph,
  CellVoltagesGraph,
  ChargeRemainingGraph,
  StateOfChargeGraph,
  VoltagesGraph,
  CurrentGraph,
  TimeSeriesManager,
} from './history.js';



if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/lifepo4/worker.js', { scope: '/lifepo4/', type: 'module' });
  navigator.serviceWorker.ready.then((registration) => {
    const cacheEnabled = !window.location.hash.includes('disableCache');
    registration.active.postMessage({ cacheEnabled });
  });
}



window.addEventListener('load', () => {
  const bleReader = new JDBBMSReader();
  const fakeData = window.location.hash.includes('fakeData')
  const timeSeriesManager = new TimeSeriesManager(bleReader, fakeData);

  const voltagesGraph = new VoltagesGraph();
  const cellVoltageGraph = new CellVoltagesGraph();
  const currentGraph = new CurrentGraph();
  const temperatureGraph = new TemperatureGraph();
  const stateOfChargeGraph = new StateOfChargeGraph();
  const chargeRemainingGraph = new ChargeRemainingGraph();

  const setClass = (id, value, classOn, classOff) => {
    const el = document.getElementById(id);
    if (el) {
      const classes = el.getAttribute('class') || '';
      const classList = classes.split(' ')
        .filter((className) => (className !== classOn && className !== classOff));
      classList.push(value ? classOn : classOff);
      el.setAttribute('class', classList.join(' '));
    } else {
      console.log('ID Not found ', id);
    }
  };


  document.getElementById('connect').addEventListener('click', bleReader.connectBMS);
  document.getElementById('disconnect').addEventListener('click', bleReader.disconnectBMS);


  const setInnerHtmlById = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = value;
    } else {
      console.log('ID Not found ', id);
    }
  };

  bleReader.on('connected', (connected) => {
    if (connected) {
      timeSeriesManager.start();
    } else {
      timeSeriesManager.stop();
    }
    setClass('connect', connected, 'hidden', '');
    setClass('disconnect', connected, '', 'hidden');
  });

  const updateGuage = (statusUpdate) => {
    setInnerHtmlById('guageVoltageText', `${statusUpdate.voltage.toFixed(2)}V`);
    setInnerHtmlById('guageCurrentText', `${statusUpdate.current.toFixed(1)}A`);
    const stateOfChargeAh = (statusUpdate.capacity.stateOfCharge / 100)
      * statusUpdate.capacity.fullCapacity;
    setInnerHtmlById('guageStateOfChargeText', `${stateOfChargeAh.toFixed(0)}Ah`);
    setClass('currentWidget', (statusUpdate.current > 0), 'charging', 'discharging');


    const currentGuage = document.getElementById('currentGuage');

    const currentGuageLength = (Math.abs(statusUpdate.current) / 100) * 353;
    currentGuage.setAttribute('stroke-dasharray', `${currentGuageLength} 471`);
    if (statusUpdate.current > 0) {
      currentGuage.setAttribute('stroke', 'url(#currentGradCharge)');
    } else {
      currentGuage.setAttribute('stroke', 'url(#currentGradDischarge)');
    }

    const stateOfChargeGauge = document.getElementById('chargeGuage');
    const stateOfChargeBase = document.getElementById('stateOfChargeBase');

    const stateOfChageLength = 120 - (statusUpdate.capacity.stateOfCharge / 100) * 120;
    stateOfChargeGauge.setAttribute('stroke-dasharray', `${stateOfChageLength} 471`);

    const socp = Math.min(100, 10 * Math.floor((statusUpdate.capacity.stateOfCharge + 5) / 10));
    stateOfChargeBase.setAttribute('class', `guageSubBase_${socp}`);
  };

  bleReader.on('statusUpdate', (statusUpdate) => {
    updateGuage(statusUpdate);

    setInnerHtmlById('status.voltage', statusUpdate.voltage.toFixed(2));
    setInnerHtmlById('status.current', statusUpdate.current.toFixed(1));
    setInnerHtmlById('status.capacity.stateOfCharge', statusUpdate.capacity.stateOfCharge.toFixed(0));
    setInnerHtmlById('status.packBalCap', statusUpdate.packBalCap.toFixed(0));
    setInnerHtmlById('status.capacity.fullCapacity', statusUpdate.capacity.fullCapacity.toFixed(0));
    setClass('status.charging', statusUpdate.FETStatus.charging === 1, 'enabled', 'disabled');
    setClass('status.discharging', statusUpdate.FETStatus.discharging === 1, 'enabled', 'disabled');
    setInnerHtmlById('status.chargeCycles', statusUpdate.chargeCycles);
    setInnerHtmlById('status.productionDate', statusUpdate.productionDate.toDateString());
    setInnerHtmlById('status.bmsSWVersion', statusUpdate.bmsSWVersion);
    setInnerHtmlById('status.numberOfCells', statusUpdate.numberOfCells.toFixed(0));
    setInnerHtmlById('status.tempSensorCount', statusUpdate.tempSensorCount.toFixed(0));
    setInnerHtmlById('status.chemistry', statusUpdate.chemistry);
    for (let i = 0; i < statusUpdate.balanceActive.length; i++) {
      setClass(`status.balanceActive${i}`, statusUpdate.balanceActive[i] === 1, 'enabled', 'disabled');
    }
    for (let i = 0; i < statusUpdate.tempSensorValues.length; i++) {
      setInnerHtmlById(`status.tempSensorValues${i}`, statusUpdate.tempSensorValues[i].toFixed(1));
    }
    for (const k of Object.keys(statusUpdate.currentErrors)) {
      setClass(`status.errors.${k}`, statusUpdate.currentErrors[k] === 1, 'enabled', 'disabled');
    }
    setInnerHtmlById('status.lastUpdate', (new Date()).toString());
  });
  bleReader.on('cellUpdate', (cellUpdate) => {
    let cellMax = cellUpdate.cellMv[0];
    let cellMin = cellUpdate.cellMv[0];
    for (let i = 0; i < cellUpdate.cellMv.length; i++) {
      setInnerHtmlById(`cell.voltage${i}`, (0.001 * cellUpdate.cellMv[i]).toFixed(3));
      cellMax = Math.max(cellMax, cellUpdate.cellMv[i]);
      cellMin = Math.min(cellMin, cellUpdate.cellMv[i]);
    }
    const range = cellMax - cellMin;
    setInnerHtmlById('cell.range', `${(0.001 * cellMin).toFixed(3)} - ${(0.001 * cellMax).toFixed(3)}`);
    setInnerHtmlById('cell.diff', (0.001 * range).toFixed(3));
    setInnerHtmlById('status.lastUpdate', (new Date()).toString());
  });
  let timeWindow = 3600000;
  let endOfWindow = 1.0;
  const updateGraphs = (history) => {
    const now = Date.now();
    const endTs = now + endOfWindow;
    const startTs = endTs - timeWindow;
    console.debug(`Start ${new Date(startTs)} End ${new Date(endTs)}`);
    voltagesGraph.update(history, startTs, endTs);
    cellVoltageGraph.update(history, startTs, endTs);
    currentGraph.update(history, startTs, endTs);
    temperatureGraph.update(history, startTs, endTs);
    stateOfChargeGraph.update(history, startTs, endTs);
    chargeRemainingGraph.update(history, startTs, endTs);
  };

  timeSeriesManager.timeSeries.on('update', (history) => {
    console.debug('Update Graphs');
    updateGraphs(history);
  });

  document.getElementById('timewindow').addEventListener('change', (event) => {
    timeWindow = parseInt(event.target.value, 10);
    updateGraphs(timeSeriesManager.timeSeries.history);
  });

  document.getElementById('endOfWindow').addEventListener('input', (event) => {
    endOfWindow = parseInt(event.target.value, 10);
    console.debug('endOfWindow', event.target.value, endOfWindow);
    updateGraphs(timeSeriesManager.timeSeries.history);
  });

  updateGraphs(timeSeriesManager.timeSeries.history);
});



