import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { DataTypes, DisplayUtils } from './datatypes.js';


const html = htm.bind(h);




class TextBox extends Component {
  constructor(props) {
    super(props);
    this.storeAPI = props.storeAPI;
    this.editing = props.editing;
    this.onChange = props.onChange;
    this.testValue = props.testValue;
    this.id = props.id;
    this.field = props.field;
    this.theme = props.theme || 'default';
    this.size = props.size || '1x';
    this.sizes = [
      '1x',
      '2x',
    ];
    this.themes = [
      'default',
      'red',
      'green',
      'blue',
      'yellow',
    ];
    this.debugEnable = false;

    this.state = {
      main: props.main || '-.-',
      graph: {
        path: 'M 0 0',
        outline: 'M 0 0',
      },
    };
    this.updateDisplayState = this.updateDisplayState.bind(this);
    this.changeField = this.changeField.bind(this);
    this.changeTheme = this.changeTheme.bind(this);
    this.remove = this.remove.bind(this);
    this.onDebug = this.onDebug.bind(this);
    this.changeSize = this.changeSize.bind(this);
    this.onMaximseBox = this.onMaximseBox.bind(this);
    this.updateRate = props.updateRate || 1000;
    this.options = props.options;
  }


  componentDidMount() {
    const changes = {};
    changes[this.field] = {
      state: this.storeAPI.getState(this.field),
      history: this.storeAPI.getHistory(this.field),
    };
    this.updateDisplayState(changes);
    this.storeAPI.addListener('change', this.updateDisplayState);
  }

  componentWillUnmount() {
    this.storeAPI.removeListener('change', this.updateDisplayState);
  }


  /*
    <svg className="overlay">
      <path d="M 50 50 C 20 20, 40 20, 50 10 A 30 50 0 0 1 162.55 162.45"
        stroke="green" stroke-width="4"  />
      <circle cx="100" cy="100" r="20" fill="red"/>
    </svg>
  */


  updateDisplayState(changes) {
    if (changes[this.field] !== undefined) {
      const dataType = DataTypes.getDataType(this.field);
      const value = changes[this.field].state;
      const display = dataType.display(value);


      const displayClass = dataType.cssClass ? dataType.cssClass(value) : '';

      const hs = [];
      const v = changes[this.field].history;
      this.debug(this.field, 'Values', v, value);
      if (dataType.withHistory && v && v.data.length > 1) {
        hs.push(dataType.toDisplayUnits(v.value));
        for (let i = 0; i < v.data.length; i++) {
          if (v.data[i] !== undefined && !Number.isNaN(v.data[i])) {
            hs.push(dataType.toDisplayUnits(v.data[i]));
          }
        }
        const graph = this.generateGraphPath(v, hs);
        if (display !== this.state.main || graph.path !== this.state.graph.path) {
          this.setState({ main: display, graph, displayClass });
        }
      } else if (display !== this.state.main) {
        this.setState({ main: display, displayClass });
      }
    }
  }

  static horizontalLine(v, range) {
    const y = DisplayUtils.y(v, range).toFixed(0);
    return `M 0 ${y} L 320 ${y}`;
  }


  generateGraphPath(v, hs) {
    if (hs && hs.length > 1) {
      const pairs = [];
      const dataType = DataTypes.getDataType(this.field);
      // get the range in sensor units, not display units
      const range = dataType.range(hs);
      this.debug(this.field, 'Range', hs, range);

      if (range) {
        // calculate the pairs in screen co-ordinates.
        for (let i = 0; i < hs.length; i++) {
          const x = DisplayUtils.x(i, range).toFixed(0);
          const y = DisplayUtils.y(hs[i], range).toFixed(0);
          pairs.push(`${x} ${y}`);
        }
        pairs.push(pairs[pairs.length - 1]);
        this.debug(this.field, 'Pairs', pairs);

        const lastX = DisplayUtils.x(hs.length - 1, range).toFixed(0);
        const path = `M ${pairs[0]} L ${pairs.join(',')}`;
        const outline = `M 0 180 L ${pairs.join(',')}, ${lastX} 180 z`;

        const mean = dataType.toDisplayUnits(v.mean);
        const stdDev = dataType.toDisplayUnits(v.stdev);
        if (mean === undefined) {
          console.log('Line 546', dataType, v, v.mean, mean);
        }
        const meanTxt = (mean !== undefined) ? mean.toFixed(1) : '-.-';
        const stdDevTxt = (stdDev !== undefined) ? stdDev.toFixed(1) : '-.-';
        const meanLine = TextBox.horizontalLine(mean, range);
        const stdTopLine = TextBox.horizontalLine(mean + stdDev, range);
        const stdBottomLine = TextBox.horizontalLine(mean - stdDev, range);
        if (path.includes('Infinity') || path.includes('NaN')) {
          console.log(this.field, range, 'path', path);
        }
        if (meanLine.includes('Infinity') || meanLine.includes('NaN')) {
          console.log(this.field, range, 'meanLine', meanLine);
        }
        if (stdTopLine.includes('Infinity') || stdTopLine.includes('NaN')) {
          console.log(this.field, range, 'stdTopLine', stdTopLine);
        }
        if (outline.includes('Infinity') || outline.includes('NaN')) {
          console.log(this.field, range, 'outline', outline);
        }
        return {
          path,
          outline,
          meanTxt,
          stdDevTxt,
          meanLine,
          stdTopLine,
          stdBottomLine,
        };
      }
      this.debug(this.field, 'no range, no graph');
    } else {
      this.debug(this.field, 'no history, no graph');
    }
    return {
      path: 'M 0 0',
      outline: 'M 0 0',
      meanTxt: '',
      stdDevTxt: '',
      meanLine: 'M 0 0',
      stdTopLine: 'M 0 0',
      stdBottomLine: 'M 0 0',
    };
  }

  changeField(e) {
    this.onChange('update', this.id, e.target.value);
  }

  changeTheme(e) {
    this.onChange('theme', this.id, e.target.value);
  }

  changeSize(e) {
    this.onChange('size', this.id, e.target.value);
  }

  remove() {
    this.onChange('remove', this.id);
  }

  debug(...msg) {
    if (this.debugEnable) {
      console.log(msg);
    }
  }

  onDebug() {
    this.debugEnable = !this.debugEnable;
  }

  onMaximseBox() {
    console.log('Maximise clicked');
    if (this.state.sizeClass !== 'size-maximum') {
      this.setState({ sizeClass: 'size-maximum' });
    } else {
      this.setState({ sizeClass: 'size-normal' });
    }
  }

  getSizeClass() {
    if (this.state.sizeClass) {
      return this.state.sizeClass;
    } if (this.size === '2x') {
      return 'size-maximum';
    }
    return 'size-normal';
  }

  renderEditOverlay() {
    if (this.editing === 'editing') {
      const options1 = this.options.map((item) => html`<option key=${item} value=${item} >${item}</option>`);
      const options2 = this.sizes.map((item) => html`<option key=${item} value=${item} >${item}</option>`);

      return html`
                <div className="overlay edit">
                <select onChange=${this.changeField} value=${this.field} title="select data item" >
                    ${options1}
                </select>
                <select onChange=${this.changeSize} value=${this.size} title="change size" >
                    ${options2}
                </select>
                <button onClick=${this.remove} title="remove">${'\u2573'}</button>
                <button onClick=${this.onDebug} title="debug" >debug</button>
                </div>`;
    }
    return html`<div></div>`;
  }

  renderControls() {
    return html`
            <div>
            <button onClick=${this.onMaximseBox} title="maximise" >${'\u26F6'}</button>
            </div>`;
  }

  render() {
    const dataType = DataTypes.getDataType(this.field);
    const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
    const classNames = ['overlay', 'main'].concat(this.state.displayClass ? this.state.displayClass : '').join(' ');
    return html`
            <div className=${themes} >
              <div className=${classNames}>${this.state.main}</div>
              <svg className="overlay" viewBox="0 0 320 180">
                    <path d=${this.state.graph.path} className="path"  />
                    <path d=${this.state.graph.outline} className="outline"  />
                    <path d=${this.state.graph.meanLine} className="meanline"  />
                    <path d=${this.state.graph.stdTopLine} className="stdtopline"  />
                    <path d=${this.state.graph.stdBottomLine} className="stdbottomline"  />
                    <text x="5" y="10" className="small">${this.state.graph.meanTxt}</text>
                    <text x="5" y="20" className="small">${this.state.graph.stdDevTxt}</text>
              </svg>
              <div className="corner tl">${dataType.tl}</div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">${DataTypes.getDisplayName(this.field)}</div>
              <div className="corner br">${dataType.units}</div>
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class LogBox extends TextBox {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
  }

  static getDisplayValue(field, changes, valueNow) {
    if (changes[field] !== undefined) {
      return DataTypes.getDataType(field).display(changes[field].state);
    }
    return valueNow;
  }

  componentDidMount() {
    this.updateDisplayState(
      {
        log: {
          state: this.storeAPI.getState('log'),
          history: this.storeAPI.getHistory('log'),
        },
        tripLog: {
          state: this.storeAPI.getState('tripLog'),
          history: this.storeAPI.getHistory('tripLog'),
        },
      },
    );
    super.componentDidMount();
  }


  updateDisplayState(changes) {
    this.debug(this.field, 'Update State');
    const logDisplay = LogBox.getDisplayValue('log', changes, this.state.logDisplay);
    const tripLogDisplay = LogBox.getDisplayValue('tripLog', changes, this.state.tripLogDisplay);
    if (logDisplay !== this.state.logDisplay
              || tripLogDisplay !== this.state.tripLogDisplay) {
      this.setState({
        logDisplay,
        tripLogDisplay,
      });
    }
  }

  render() {
    const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
    return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.logDisplay}</div>
                <div className="smallLine2" >${this.state.tripLogDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">log/trip</div>
              <div className="corner br">Nm</div>
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class TimeBox extends TextBox {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
  }

  componentDidMount() {
    this.updateDisplayState(
      {
        gpsDaysSince1970: {
          state: this.storeAPI.getState('gpsDaysSince1970'),
          history: this.storeAPI.getHistory('gpsDaysSince1970'),
        },
        gpsSecondsSinceMidnight: {
          state: this.storeAPI.getState('gpsSecondsSinceMidnight'),
          history: this.storeAPI.getHistory('gpsSecondsSinceMidnight'),
        },
      },
    );
    super.componentDidMount();
  }


  static getDisplayValue(field, changes, valueNow) {
    if (changes[field] !== undefined) {
      return DataTypes.getDataType(field).display(changes[field].state);
    }
    return valueNow;
  }



  updateDisplayState(changes) {
    this.debug(this.field, 'Update State');
    const dateDisplay = TimeBox.getDisplayValue('gpsDaysSince1970', changes, this.state.dateDisplay);
    const timeDisplay = TimeBox.getDisplayValue('gpsSecondsSinceMidnight', changes, this.state.timeDisplay);
    if (dateDisplay !== this.state.dateDisplay
              || timeDisplay !== this.state.timeDisplay) {
      this.setState({
        dateDisplay,
        timeDisplay,
      });
    }
  }

  render() {
    const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
    return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.dateDisplay}</div>
                <div className="smallLine2" >${this.state.timeDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">Time</div>
              <div className="corner br">UTC</div>
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class LatitudeBox extends TextBox {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
  }

  static getDisplayValue(field, changes, valueNow) {
    if (changes[field] !== undefined) {
      return DataTypes.getDataType(field).display(changes[field].state);
    }
    return valueNow;
  }

  componentDidMount() {
    this.updateDisplayState(
      {
        latitude: {
          state: this.storeAPI.getState('latitude'),
          history: this.storeAPI.getHistory('latitude'),
        },
        longitude: {
          state: this.storeAPI.getState('longitude'),
          history: this.storeAPI.getHistory('longitude'),
        },
      },
    );
    super.componentDidMount();
  }



  updateDisplayState(changes) {
    this.debug(this.field, 'Update State');
    const latitudeDisplay = LatitudeBox.getDisplayValue('latitude', changes, this.state.latitudeDisplay);
    const longitudeDisplay = LatitudeBox.getDisplayValue('longitude', changes, this.state.longitudeDisplay);
    if (latitudeDisplay !== this.state.latitudeDisplay
              || longitudeDisplay !== this.state.longitudeDisplay) {
      this.setState({
        latitudeDisplay,
        longitudeDisplay,
      });
    }
  }

  render() {
    const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
    return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.latitudeDisplay}</div>
                <div className="smallLine2" >${this.state.longitudeDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">position</div>
              <div className="corner br"></div>
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class SystemStatus extends TextBox {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
    this.state.nmea0183Address = 'none';
    this.state.packetsRecieved = 0;
    this.state.connectedClients = 0;
    this.updatePeriodically = this.updatePeriodically.bind(this);
  }

  componentDidMount() {
    this.updatePeriodically();
    this.interval = setInterval(this.updatePeriodically, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }


  /* eslint-disable-next-line class-methods-use-this, no-unused-vars */
  updateDisplayState(changes) {

  }


  updatePeriodically() {
    if (this.storeAPI) {
      this.debug(this.field, 'Update State');
      const packetsRecieved = this.storeAPI.getPacketsRecieved();
      const nmea0183Address = this.storeAPI.getNmea0183Address();
      const connectedClients = this.storeAPI.getConnectedClients();
      this.setState({
        packetsRecieved,
        nmea0183Address,
        connectedClients,
      });
    }
  }

  render() {
    const themes = `textbox appStatus ${this.theme} ${this.getSizeClass()} `;
    return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="statusData" >tcp: ${this.state.nmea0183Address}</div>
                <div className="statusData" >clients: ${this.state.connectedClients}</div>
                <div className="statusData" >packets: ${this.state.packetsRecieved}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">status</div>
              <div className="corner br"></div>
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class NMEA2000 extends TextBox {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
    this.updatePeriodically = this.updatePeriodically.bind(this);
  }

  componentDidMount() {
    this.updatePeriodically();
    this.interval = setInterval(this.updatePeriodically, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  /* eslint-disable-next-line class-methods-use-this, no-unused-vars */
  updateDisplayState(changes) {

  }


  updatePeriodically() {
    if (this.storeAPI) {
      const messages = JSON.parse(JSON.stringify(this.storeAPI.getMessages()));
      this.setState({
        nmea2000Data: messages,
      });
    } else {
      console.log('No store API');
    }
  }

  renderMessages() {
    if (this.state.nmea2000Data) {
      const l = [];
      for (const pgn of Object.keys(this.state.nmea2000Data)) {
        const message = this.state.nmea2000Data[pgn];
        const m = [];
        for (const k of Object.leys(message)) {
          if (message[k] && message[k].id !== undefined) {
            m.push(`${k}: ${message[k].name}(${message[k].id})`);
          } else {
            m.push(`${k}: ${message[k]}`);
          }
        }



        l.push(html`<div key=${pgn} >${m.join(' ')}</div>`);
      }
      return html`
                <div>
                    ${l}
                </div>
            `;
    }
    return html`
                <div>
                    No Messages
                </div>
            `;
  }

  render() {
    const themes = `textbox nmea2000Messages ${this.theme} ${this.getSizeClass()} `;
    return html`
            <div className=${themes} >
              ${this.renderMessages()}
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}


export {
  TextBox, LogBox, TimeBox, LatitudeBox, NMEA2000, SystemStatus,
};
