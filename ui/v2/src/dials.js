import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { DataTypes, DisplayUtils } from './datatypes.js';


const html = htm.bind(h);


class DialDefinitions extends Component {
  // eslint-disable-next-line class-methods-use-this
  render() {
    return html`
<svg class="defs" xmlns="http://www.w3.org/2000/svg" width="0" >
  <defs>
    <linearGradient id="dial-metalic" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#888"></stop>
      <stop offset="50%" stop-color="#def"></stop>
      <stop offset="100%" stop-color="#888"></stop>
    </linearGradient>

    <filter id="dial-drop-shadow" width="1.5" height="1.5">
      <feOffset in="SourceAlpha" result="offOut" dx="1" dy="1"></feOffset>
      <feGaussianBlur in="offOut" result="blurOut" stdDeviation="1"></feGaussianBlur>
      <feBlend in="SourceGraphic" in2="blurOut" mode="normal"></feBlend>
    </filter>

    <filter id="dial-inner-shadow" x0="-0.5" y0="-0.5" width="1.25" height="1.25">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"></feGaussianBlur>
      <feOffset dx="3" dy="2"></feOffset>
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>
      <feFlood flood-color="#444" flood-opacity="0.75"></feFlood>
      <feComposite in2="shadowDiff" operator="in"></feComposite>
      <feComposite in2="SourceGraphic" operator="over" result="firstFilter"></feComposite>
      <feGaussianBlur in="firstFilter" stdDeviation="2" result="blur2"></feGaussianBlur>
      <feOffset dx="-3" dy="-2"></feOffset>
      <feComposite in2="firstFilter" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>
      <feFlood flood-color="#444" flood-opacity="0.75"></feFlood>
      <feComposite in2="shadowDiff" operator="in"></feComposite>
      <feComposite in2="firstFilter" operator="over"></feComposite>
    </filter>


    <filter id="dial-inner-shadow-vertical" x0="-0.5" y0="-0.5" width="1.25" height="1.25">
      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"></feGaussianBlur>
      <feOffset dx="3" dy="20"></feOffset>
      <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>
      <feFlood flood-color="#888" flood-opacity="0.75"></feFlood>
      <feComposite in2="shadowDiff" operator="in"></feComposite>
      <feComposite in2="SourceGraphic" operator="over" result="firstFilter"></feComposite>
      <feGaussianBlur in="firstFilter" stdDeviation="5" result="blur2"></feGaussianBlur>
      <feOffset dx="-3" dy="-20"></feOffset>
      <feComposite in2="firstFilter" operator="arithmetic" k2="-1" k3="1" result="shadowDiff"></feComposite>
      <feFlood flood-color="#888" flood-opacity="0.75"></feFlood>
      <feComposite in2="shadowDiff" operator="in"></feComposite>
      <feComposite in2="firstFilter" operator="over"></feComposite>
    </filter>


    <filter id="dial-glass-blur">
      <feGaussianBlur stdDeviation="1.75"></feGaussianBlur>
    </filter>
    <clipPath id="dial-glass-clip">
      <circle r="43"></circle>
    </clipPath>

    <g id="dial-ticks10">
      <line y1="-44" y2="-39" stroke-width=".8" ></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(2)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(4)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(6)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(8)"></line>
      <line y1="-44" y2="-40" stroke-width=".6" transform="rotate(10)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(12)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(14)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(16)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(18)"></line>
    </g>

    <g id="dial-ticks5">
      <line y1="-44" y2="-39" stroke-width=".8" ></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(6)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(12)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(18)"></line>
      <line y1="-44" y2="-41" stroke-width=".6" transform="rotate(24)"></line>
    </g>

    <g id="vdial-ticks10">
      <line x1="-6" y1="0"  y2="0" stroke-width=".8" ></line>
      <line x1="-2" y1="2"  y2="2" stroke-width=".6" ></line>
      <line x1="-2" y1="4"  y2="4" stroke-width=".6" ></line>
      <line x1="-2" y1="6"  y2="6" stroke-width=".6" ></line>
      <line x1="-2" y1="8"  y2="8" stroke-width=".6" ></line>
      <line x1="-4" y1="10" y2="10" stroke-width=".6" ></line>
      <line x1="-2" y1="12" y2="12" stroke-width=".6" ></line>
      <line x1="-2" y1="14" y2="14" stroke-width=".6" ></line>
      <line x1="-2" y1="16" y2="16" stroke-width=".6" ></line>
      <line x1="-2" y1="18" y2="18" stroke-width=".6" ></line>
    </g>


    <g id="celcius-dial" >
      <!-- housing -->
      <circle r="48" fill="url(#dial-metalic)" filter="url(#dial-drop-shadow)"></circle>

      <!-- face -->
      <circle r="44" fill="#ffe" fill-opacity="0.6" stroke="black" stroke-width="0.2" stroke-opacity="0.5" filter="url(#dial-inner-shadow)"></circle>

      <!-- ticks -->
      <g>
        <g transform="rotate(-100)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(100 0 -34)">10</text>
        </g>
        <g transform="rotate(-80)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(80 0 -34)">20</text>
        </g>
        <g transform="rotate(-60)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(60 0 -34)">30</text>
        </g>
        <g transform="rotate(-40)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-35" transform="rotate(40 0 -35)">40</text>
        </g>
        <g transform="rotate(-20)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(20 0 -34)">50</text>
        </g>
        <g transform="rotate(0)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(0 0 -34)">60</text>
        </g>
        <g transform="rotate(20)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-20 0 -34)">70</text>
        </g>
        <g transform="rotate(40)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-40 0 -34)">80</text>
        </g>
        <g transform="rotate(60)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-60 0 -34)">90</text>
        </g>
        <g transform="rotate(80)">
          <use href="#dial-ticks10"  stroke="red" ></use>
          <text y="-34" transform="rotate(-80 0 -34)">100</text>
        </g>
        <g transform="rotate(100)">
          <line y1="-44" y2="-40" stroke-width=".8" stroke="red"></line>
          <text y="-34" transform="rotate(-100 0 -34)">110</text>
        </g>
      </g>

    </g>

    <g id="percentage-dial" >

        <!-- housing -->
      <circle r="48" fill="url(#dial-metalic)" filter="url(#dial-drop-shadow)"></circle>

      <!-- face -->
      <circle r="44" fill="#ffe" fill-opacity="0.6" stroke="black" stroke-width="0.2" stroke-opacity="0.5" filter="url(#dial-inner-shadow)"></circle>

      <!-- ticks -->
      <g>
        <g transform="rotate(-100)">
          <use href="#dial-ticks10"  stroke="red" ></use>
          <text y="-34" transform="rotate(100 0 -34)">0</text>
        </g>
        <g transform="rotate(-80)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(80 0 -34)">10</text>
        </g>
        <g transform="rotate(-60)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(60 0 -34)">20</text>
        </g>
        <g transform="rotate(-40)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-35" transform="rotate(40 0 -35)">30</text>
        </g>
        <g transform="rotate(-20)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(20 0 -34)">40</text>
        </g>
        <g transform="rotate(0)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(0 0 -34)">50</text>
        </g>
        <g transform="rotate(20)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-20 0 -34)">60</text>
        </g>
        <g transform="rotate(40)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-40 0 -34)">70</text>
        </g>
        <g transform="rotate(60)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-60 0 -34)">80</text>
        </g>
        <g transform="rotate(80)">
          <use href="#dial-ticks10" stroke="black" ></use>
          <text y="-34" transform="rotate(-80 0 -34)">90</text>
        </g>
        <g transform="rotate(100)">
          <line y1="-44" y2="-40" stroke-width=".8" stroke="black"></line>
          <text y="-34" transform="rotate(-100 0 -34)">100</text>
        </g>
      </g>
    </g>

    <g id="rpm-dial" >
          <!-- housing -->
      <circle r="48" fill="url(#dial-metalic)" filter="url(#rpm-in-dial-drop-shadow)"></circle>

      <!-- face -->
      <circle r="44" fill="#ffe" fill-opacity="0.6" stroke="black" stroke-width="0.2" stroke-opacity="0.5" filter="url(#dial-inner-shadow)"></circle>

      <!-- ticks -->
      <g>
        <g transform="rotate(-120)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(120 0 -34)">0</text>
        </g>
        <g transform="rotate(-90)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(90 0 -34)">5</text>
        </g>
        <g transform="rotate(-60)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(60 0 -34)">10</text>
        </g>
        <g transform="rotate(-30)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(30 0 -34)">15</text>
        </g>
        <g transform="rotate(0)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(-0 0 -34)">20</text>
        </g>
        <g transform="rotate(30)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(-30 0 -34)">25</text>
        </g>
        <g transform="rotate(60)">
          <use href="#dial-ticks5" stroke="black" ></use>
          <text y="-34" transform="rotate(-60 0 -34)">30</text>
        </g>
        <g transform="rotate(90)">
          <use href="#dial-ticks5" stroke="red" ></use>
          <text y="-34" transform="rotate(-90 0 -34)">35</text>
        </g>
        <g transform="rotate(120)">
          <line y1="-44" y2="-40" stroke-width=".8" stroke="red"></line>
          <text y="-34" transform="rotate(-120 0 -34)">40</text>
        </g>
      </g>
    </g>

    <g id="vdial-100" >
      <rect x="0" y="0" rx="4" ry="4" width="44" height="150" fill="url(#dial-metalic)" filter="url(#dial-drop-shadow)"></rect>
      <rect x="4" y="4" rx="2" ry="2" width="36" height="142" fill="#ffe" fill-opacity="0.6" stroke="black" stroke-width="0.2" stroke-opacity="0.5" filter="url(#dial-inner-shadow-vertical)"></rect>


      <g transform="translate(7 12)">
        <g transform="translate(20 0)">
          <use href="#vdial-ticks10" stroke="black"></use>
          <text x="-12">100</text>
        </g>
        <g transform="translate(20 20)">
          <use href="#vdial-ticks10" stroke="black"></use>
          <text x="-12">80</text>
        </g>
        <g transform="translate(20 40)">
          <use href="#vdial-ticks10" stroke="black"></use>
          <text x="-12">60</text>
        </g>
        <g transform="translate(20 60)">
          <use href="#vdial-ticks10" stroke="black"></use>
          <text x="-12">40</text>
        </g>
        <g transform="translate(20 80)">
          <use href="#vdial-ticks10" stroke="red"></use>
          <text x="-12" >20</text>
        </g>
        <g transform="translate(20 100)">
          <line x1="-6" y1="0"  y2="0" stroke-width=".8" stroke="red"></line>
          <text x="-12" >0</text>
        </g>
      </g>
    </g>

    <g id="dial-glass" >
      <!-- crystal -->
      <circle r="53" cx="10" cy="10" fill="none" stroke="white" stroke-width="4" opacity=".5" filter="url(#dial-glass-blur)"
        clip-path="url(#dial-glass-clip)"></circle>
    </g>
  </defs>
</svg>`;
  }
}




class BaseDial extends Component {
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


  updateDisplayState(changes) {
    if (changes[this.field] !== undefined) {
      const dataType = DataTypes.getDataType(this.field);
      const value = changes[this.field].state;
      const display = dataType.display(value);
      const displayClass = dataType.cssClass ? dataType.cssClass(value) : '';
      this.setState({ main: display, value, displayClass });
    }
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

  renderDial() {
    return html`
    <svg class="baseDial" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="150">
        <text>Base Dial</text>
    </svg>`;
  }

  render() {
    const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
    const classNames = ['overlay', 'main'].concat(this.state.displayClass ? this.state.displayClass : '').join(' ');
    return html`
            <div className=${themes} >
              ${this.renderDial()}
              ${this.renderEditOverlay()}
            </div>
            `;
  }
}

class CoolantDial extends BaseDial {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
  }

  renderDial() {
    const width = (this.size === '1x') ? 150 : 250;
    let displayValue = '-.-';
    let rotationAngle = -100;
    if (this.state.value) {
      const temperature = this.state.value - 273.15;
      displayValue = temperature.toFixed(1);
      rotationAngle = (temperature - 10) * 2 - 100;
    }
    return html`
      <!-- Coolant -->
      <svg class="coolantDial" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="${width}">
        <g transform="translate(50 50)" font-family="tahoma" dominant-baseline="middle" text-anchor="middle" font-size="6">
          <use href="#celcius-dial"></use>
          <!-- lcd display -->
          <g transform="translate(0 14)">
            <text>Coolant</text>
            <rect y="4" x="-20" width="40" height="14" rx="3" ry="3" fill="#def" filter="url(#dial-inner-shadow)"></rect>
            <text class="lcd" y="12" font-size="9" >${displayValue} &deg;C</text>
          </g>

          <!-- needle -->
          <g fill="#e00" filter="url(#dial-drop-shadow)">
            <g class="needle" transform="rotate(${rotationAngle})">
              <circle r="4" fill="grey"></circle>
              <path d="M-.8 8 L-.4 -40 L.4 -40 L.8 8"></path>
              <circle r="0.75" fill="black"></circle>
            </g>
          </g>

          <use href="#dial-glass"></use>
        </g>
      </svg>
      `;
  }
}

class RpmDial extends BaseDial {
  constructor(props) {
    super(props);
    this.testValue = props.testValue;
  }

  renderDial() {
    const width = (this.size === '1x') ? 150 : 250;
    let displayValue = '--';
    let rotationAngle = -120;
    if (this.state.value) {
      displayValue = this.state.value.toFixed(0);
      rotationAngle = ((this.state.value * 240) / 4000) - 120;
    }
    return html`
      <svg class="rpmDial" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="${width}">
        <g transform="translate(50 50)" font-family="tahoma" dominant-baseline="middle" text-anchor="middle" font-size="6">
          <use href="#rpm-dial"></use>
          <!-- lcd display -->
          <g transform="translate(0 14)">
            <text>RPM x 100</text>
            <rect y="4" x="-20" width="40" height="14" rx="3" ry="3" fill="#def" filter="url(#dial-inner-shadow)"></rect>
            <text class="lcd" y="12" font-size="9"  >${displayValue}</text>
          </g>
          <!-- needle -->
          <g filter="url(#dial-drop-shadow)">
            <g class="needle" transform="rotate(${rotationAngle})" fill="#e00" >
              <circle r="4" fill="grey"></circle>
              <path d="M-.8 8 L-.4 -40 L.4 -40 L.8 8"></path>
              <circle r="0.75" fill="black"></circle>
            </g>
          </g>
          <use href="#dial-glass"></use>
        </g>
      </svg>
      `;
  }
}


export {
  DialDefinitions,
  CoolantDial,
  RpmDial,
};

