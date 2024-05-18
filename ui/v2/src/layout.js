import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import {
  TextBox, LogBox, TimeBox, LatitudeBox, NMEA2000, SystemStatus,
} from './displayboxes.js';
import { EditUIControl } from './uicontrol.js';
import { MenuButton } from './menubutton.js';



const html = htm.bind(h);




class NMEALayout extends Component {
  static get removeOptionKeys() {
    return [
      'latitude',
      'longitude',
      'log',
      'tripLog',
      'gpsDaysSince1970',
      'gpsSecondsSinceMidnight',
      'swrt',
      'lastCalc',
      'lastChange',
    ];
  }

  static get addOptionKeys() {
    return [
      'Position',
      'Log',
      'Time',
      'NMEA2000',
      'System',
    ];
  }

  constructor(props) {
    super(props);
    this.storeAPI = props.storeAPI;
    this.apiUrl = props.apiUrl;
    this.layoutName = props.layout || 'main';
    this.onEditLayout = this.onEditLayout.bind(this);
    this.onAddItem = this.onAddItem.bind(this);
    this.onChangeItem = this.onChangeItem.bind(this);
    this.onSave = this.onSave.bind(this);
    this.onMenuChange = this.onMenuChange.bind(this);
    this.onPageChange = this.onPageChange.bind(this);
    this.onDumpStore = this.onDumpStore.bind(this);
    this.lastPacketsRecived = 0;
    this.state = {
      editing: '',
      options: [],
      dataIndicatorOn: false,
      layout: undefined,
      packetsRecieved: 0,

    };

    setTimeout(async () => {
      const layout = await this.loadLayout();
      this.setState({ layout });
    }, 10);
  }


  async componentDidMount() {
    this.updateInterval = setInterval((async () => {
      const packetsRecieved = this.storeAPI.getPacketsRecieved();
      if (this.state.packetsRecieved !== packetsRecieved
      ) {
        this.setState({ packetsRecieved });
      }
    }), 1000);
  }

  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }


  /*
      "{"pageId":1,"pages":[{"id":1,"name":"Home","boxes":[{"id":1713688208539,"field":"stw"},
       {"id":1714720124318,"field":"awa"},{"id":1714720128961,"field":"aws"},{"id":1713688180180,
       "field":"Position"},{"id":1714720345973,"field":"sog"},{"id":1714720350780,"field":"twa"},
       {"id":1714720353242,"field":"tws"},{"id":1714720364795,"field":"Log"},{"id":1714720385573,
       "field":"polarSpeed"},{"id":1714720417941,"field":"targetTwa"},
       {"id":1714720476494,"field":"vmg"},
       {"id":1714720494522,"field":"polarVmg"},{"id":1714720485837,"field":"polarSpeedRatio"},
       {"id":1714720524662,"field":"rudderPosition"},{"id":1714720552606,"field":"seaTemperature"},
       {"id":1714720566404,"field":"atmosphericPressure_0"}]}]}"
  */


  async loadLayout() {
    let layout;
    const layoutUrl = new URL('/api/layout.json', this.apiUrl);
    layoutUrl.searchParams.set('layout', this.layoutName);
    try {
      const response = await fetch(layoutUrl, {
        credentials: 'include',
      });
      console.log('Layout request Response ', response);
      if (response.status === 200) {
        layout = await response.json();
        if (layout && layout.pageId !== undefined && layout.pages !== undefined) {
          console.log('Got Layout from server', layout);
          return layout;
        }
        console.log(`Layout from ${layoutUrl} not valid`, layout);
      } else {
        console.log(`Layout from ${layoutUrl} not found`);
      }
    } catch (e) {
      console.log(`Failed to get layout from ${layoutUrl}`, e);
    }

    layout = localStorage.getItem('layout');
    if (layout) {
      const l = JSON.parse(layout);
      if (l.pageId !== undefined && l.pages !== undefined) {
        console.log('Got Layout from localstorage', layout);
        return l;
      }
    }
    // load a default
    const start = Date.now();
    return {
      pageId: 1,
      pages: [
        {
          id: 1,
          name: 'Home',
          boxes: [
            { id: start, field: 'awa' },
            { id: start + 1, field: 'aws' },
            { id: start + 2, field: 'twa' },
            { id: start + 3, field: 'Position' },
            { id: start + 4, field: 'engineCoolantTemperature' },
            { id: start + 5, field: 'alternatorVoltage' },
            { id: start + 6, field: 'Log' },
            { id: start + 7, field: 'polarSpeedRatio' },
          ],
        },
      ],
    };
  }

  async onSave() {
    localStorage.setItem(`layout-${this.layoutName}`, JSON.stringify(this.state.layout));
  }



  getLayout() {
    const layout = this.state.layout || {
      pageId: 1,
      pages: [
        {
          id: 1,
          name: 'Home',
          boxes: [
          ],
        },
      ],
    };
    const page = layout.pages.find((p) => p.id === layout.pageId);
    return {
      layout,
      page,
    };
  }

  setLayout(l) {
    this.setState({ layout: JSON.stringify(l.layout) });
  }

  async onEditLayout(editing) {
    if (editing) {
      const that = this;
      if (this.storeAPI) {
        const options = (that.storeAPI.getKeys())
          .filter(
            (key) => !NMEALayout.removeOptionKeys.includes(key),
          )
          .concat(NMEALayout.addOptionKeys);
        console.log('options ', options);
        this.setState({
          editing: 'editing',
          options,
        });
      }
    } else {
      this.setState({ editing: '' });
    }
  }

  onAddItem(e) {
    console.log('Add Item ', e.target.value);
    if (e.target.value === 'addbox') {
      const l = this.getLayout();
      l.page.boxes.push({ id: Date.now(), field: 'awa' });
      this.setLayout(l);
    } else if (e.target.value === 'addpage') {
      const l = this.getLayout();
      const id = Date.now();
      l.layout.pages.push({
        id,
        name: 'New page',
        boxes: [
          { id, field: 'awa' },
          { id: id + 1, field: 'aws' },
          { id: id + 2, field: 'twa' },
          { id: id + 3, field: 'tws' },
        ],
      });
      l.layout.pageId = id;
      this.setLayout(l);
    } else if (e.target.value === 'deletepage') {
      const l = this.getLayout();
      const toRemove = l.layout.pageId;
      l.layout.pageId = undefined;
      let removed = false;
      l.layout.pages = l.layout.pages.filter((p) => {
        if (p.id !== toRemove) {
          if (!removed) {
            l.layout.pageId = p.id;
          }
          return true;
        }
        removed = true;
        return false;
      });
      if (l.layout.pageId === undefined && l.layout.pages.length > 0) {
        l.layout.pageId = l.layout.pages[0].id;
      }
      this.setLayout(l);
    }
  }


  onChangeItem(event, id, field) {
    if (event === 'remove') {
      const l = this.getLayout();
      const newBoxes = l.page.boxes.filter((b) => b.id !== id);
      l.page.boxes = newBoxes;
      this.setLayout(l);
    } else if (event === 'update') {
      const l = this.getLayout();
      const box = l.page.boxes.find((b) => b.id === id);
      console.log('update ', id, field, box, l.page.boxes);
      box.id = Date.now();
      box.field = field;
      this.setLayout(l);
    } else if (event === 'size') {
      const l = this.getLayout();
      const box = l.page.boxes.find((b) => b.id === id);
      console.log('update ', id, field, box, l.page.boxes);
      box.id = Date.now();
      box.size = field;
      this.setLayout(l);
    }
  }

  onMenuChange() {
    this.setState({ showMenu: !this.state.showMenu });
  }

  onPageChange(e) {
    const l = this.getLayout();
    l.layout.pageId = +e.target.value;
    this.setLayout(l);
  }

  onPageNameChange(e) {
    const l = this.getLayout();
    l.page.name = e.target.value;
    this.setLayout(l);
  }


  async onDumpStore() {
    const keys = this.storeAPI.getKeys();
    const values = {};
    for (const k of keys) {
      values[k] = this.storeAPI.getState(k);
    }
    console.log('Store Values are', values);
  }


  renderMenu() {
    const menuClass = this.state.showMenu ? 'menu normal' : 'menu minimised';
    return html`<div className=${menuClass} >
                <${MenuButton}  storeAPI=${this.storeAPI} onClick=${this.onMenuChange} />
                <${EditUIControl} onEdit=${this.onEditLayout} 
                    onSave=${this.onSave}
                    onAddItem=${this.onAddItem}/>
                <div className="debugControls">
                  packetsRecieved: ${this.state.packetsRecieved}
                </div>
                <div className="debugControls">
                    <button onClick=${this.onDumpStore} >DumpStore</button>
                </div>
            </div>
        `;
  }

  renderItem(item) {
    if (item === undefined || item.field === undefined) {
      return html`<div>undefined box</div>`;
    }
    switch (item.field) {
      case 'Position':
        return html`<${LatitudeBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing} 
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} /> `;
      case 'Log':
        return html`<${LogBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI} 
                        options=${this.state.options}/>`;
      case 'Time':
        return html`<${TimeBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
      case 'NMEA2000':
        return html`<${NMEA2000} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} /> `;
      case 'System':
        return html`<${SystemStatus}
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
      default:
        return html`<${TextBox}
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id + this.state.editing} 
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
    }
  }

  render() {
    const l = this.getLayout();
    const boxes = l.page.boxes.map((item) => this.renderItem(item));
    return html`<div className="nmeaLayout">
                ${this.renderMenu()}
                <div>
                 ${boxes}
                </div>
            </div>`;
  }
}









export { NMEALayout };
