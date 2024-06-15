import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import {
  TextBox, LogBox, TimeBox, LatitudeBox, NMEA2000, SystemStatus,
} from './displayboxes.js';
import { MenuButton } from './menubutton.js';
import { Uploader } from './uploader.js';



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
    this.onAddItem = this.onAddItem.bind(this);
    this.onChangeItem = this.onChangeItem.bind(this);
    this.onMenuChange = this.onMenuChange.bind(this);
    this.onDumpStore = this.onDumpStore.bind(this);
    this.handleMenuEvents = this.handleMenuEvents.bind(this);
    this.renderItem = this.renderItem.bind(this);
    this.finishUpload = this.finishUpload.bind(this);
    this.lastPacketsRecived = 0;
    this.menuEvents = props.menuEvents;
    this.state = {
      editing: '',
      options: [],
      dataIndicatorOn: false,
      layout: undefined,
      packetsRecieved: 0,
      layoutName: 'not loaded',
      viewkey: Date.now(),
      uploadErrorMessage: '',
      uploadLayoutName: '',
    };
    this.loadLayout(props.layout);
  }


  async componentDidMount() {
    this.updateInterval = setInterval((async () => {
      const packetsRecieved = this.storeAPI.getPacketsRecieved();
      if (this.state.packetsRecieved !== packetsRecieved
      ) {
        this.setState({ packetsRecieved });
      }
    }), 1000);
    this.menuEvents.addListener('*', this.handleMenuEvents);
  }

  componentWillUnmount() {
    this.menuEvents.removeListener('*', this.handleMenuEvents);
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


  loadLayout(layoutName) {
    if (layoutName !== this.state.layoutName) {
      const layout = localStorage.getItem(`layout-${layoutName}`);
      if (layout) {
        const l = JSON.parse(layout);
        if (l.pageId !== undefined && l.pages !== undefined) {
          // eslint-disable-next-line no-console
          console.debug('Got Layout from localstorage for ', layoutName, l);
          this.setState({
            layout: l,
            layoutName,
          });
          return;
        }
      }
      // load a default
      // eslint-disable-next-line no-console
      console.debug('Using default layout for ', layoutName);
      const start = Date.now();
      this.setState({
        layoutName,
        layout: {
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
        },
      });
    } else {
      // eslint-disable-next-line no-console
      console.debug('Layout already loaded');
    }
  }

  getLayout() {
    // eslint-disable-next-line no-console
    console.debug('Layout state Object', typeof this.state.layout, this.state.layout);
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
    // eslint-disable-next-line no-console
    console.debug('Layout', layout.pages, typeof layout);
    const page = layout.pages.find((p) => p.id === layout.pageId);
    return {
      layout,
      page,
    };
  }

  setLayout(l) {
    this.setState({ layout: l.layout });
  }


  onAddItem(e) {
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
      // eslint-disable-next-line no-console
      console.debug('update ', id, field, box, l.page.boxes);
      box.id = Date.now();
      box.field = field;
      this.setLayout(l);
    } else if (event === 'size') {
      const l = this.getLayout();
      const box = l.page.boxes.find((b) => b.id === id);
      // eslint-disable-next-line no-console
      console.debug('update ', id, field, box, l.page.boxes);
      box.id = Date.now();
      box.size = field;
      this.setLayout(l);
    }
  }

  handleMenuEvents(event, payload) {
    if (event === 'new-layout') {
      // create new layout
      this.loadLayout(payload.layout);
      localStorage.setItem(`layout-${payload.layout}`, JSON.stringify(this.state.layout));
      // eslint-disable-next-line no-console
      console.debug('new-layout', payload.layout);
      this.menuEvents.emit('layouts-changed', this.state.layoutName);
    } else if (event === 'rename-layout') {
      // rename layout deleting the old layout
      this.setState({
        layoutName: payload.to,
        viewkey: Date.now(),
      });
      localStorage.setItem(`layout-${payload.to}`, JSON.stringify(this.state.layout));
      localStorage.removeItem(`layout-${payload.from}`);
      // eslint-disable-next-line no-console
      console.debug('Renamed layout to ', payload.to);
      this.menuEvents.emit('layouts-changed', this.state.layoutName);
    } else if (event === 'copy-layout') {
      localStorage.setItem(`layout-${payload.layout}`, JSON.stringify(this.state.layout));
      this.setState({
        layoutName: payload.layout,
        viewkey: Date.now(),
      });
      // eslint-disable-next-line no-console
      console.debug('Copied layout to ', payload.layout);
      this.menuEvents.emit('layouts-changed', this.state.layoutName);
    } else if (event === 'edit-layout') {
      const options = this.storeAPI.getKeys()
        .filter(
          (key) => !NMEALayout.removeOptionKeys.includes(key),
        )
        .concat(NMEALayout.addOptionKeys);
      // eslint-disable-next-line no-console
      console.debug('options ', options);
      this.setState({
        editing: 'editing',
        viewkey: Date.now(),
        options,
      });
      // eslint-disable-next-line no-console
      console.debug('Set state to editing ', this.state);
    } else if (event === 'add-box') {
      if (this.state.editing === 'editing') {
        const l = this.getLayout();
        l.page.boxes.push({ id: Date.now(), field: 'awa' });
        this.setLayout(l);
      }
    } else if (event === 'save-layout') {
      localStorage.setItem(`layout-${this.state.layoutName}`, JSON.stringify(this.state.layout));
      // eslint-disable-next-line no-console
      console.debug('Saved Layout as ', this.state.layoutName);
      this.setState({
        viewkey: Date.now(),
        editing: '',
      });
    } else if (event === 'delete-layout') {
      localStorage.removeItem(`layout-${payload.currentLayout}`);
      // eslint-disable-next-line no-console
      console.debug('Deletd Layout', payload.currentLayout);
      this.menuEvents.emit('layouts-changed', this.state.layoutName);
    } else if (event === 'load-layout') {
      this.loadLayout(payload.layout);
      this.menuEvents.emit('layouts-changed', payload.layout);
    } else if (event === 'download-layout') {
      const blob = new Blob([JSON.stringify(this.state.layout, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `layout-${this.state.layoutName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (event === 'upload-layout') {
      this.setState({
        showUploadLayout: true,
        uploadLayoutKey: Date.now(),
      });
    }
  }


  async finishUpload(op, name, uploadBlob) {
    console.log('Uploaded', op, name, uploadBlob);
    if (op === 'cancel') {
      this.setState({
        showUploadLayout: false,
        uploadErrorMessage: '',
        uploadLayoutName: '',
      });
    } else if (op === 'upload') {
      if (name && uploadBlob) {
        try {
          const body = await uploadBlob.text();
          console.log("Got body ", body);
          const layout = JSON.parse(body);
          console.log("Parsed ", layout);
          if (layout.pageId !== undefined
            && layout.pages !== undefined
            && Array.isArray(layout.pages)
            && layout.pages.length > 0) {
            localStorage.setItem(`layout-${name}`, JSON.stringify(layout));
            console.log("Saved ", name);
            this.setState({
              showUploadLayout: false,
              uploadErrorMessage: '',
              uploadLayoutName: '',
            });
            this.menuEvents.emit('layouts-changed', this.state.layoutName);
          } else {
            console.log("Error with contents ", name);
            this.setState({
              uploadErrorMessage: 'Layout must be of the form { pageId:<id>, pages:[<page>] }',
              uploadLayoutName: name,
              uploadLayoutKey: Date.now(),
            });
          }
        } catch (e) {
          console.log("Error with parse ", e);
          this.setState({
            uploadErrorMessage: `JSON parse error ${e.message}`,
            uploadLayoutName: name,
            uploadLayoutKey: Date.now(),
          });
        }
      } else {
        console.log("Missing parts ");
        this.setState({
          uploadErrorMessage: 'Name and file are required',
          uploadLayoutName: name,
          uploadLayoutKey: Date.now(),
        });
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('Unexpected upload operation', op);
    }
  }

  onMenuChange() {
    this.setState({ showMenu: !this.state.showMenu });
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
    const vk = `${this.state.viewkey}-${item.id}`;
    switch (item.field) {
      case 'Position':
        return html`<${LatitudeBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${vk} 
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
                        key=${vk}
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
                        key=${vk}
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
                        key=${vk}
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
                        key=${vk}
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
                        key=${vk} 
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
    }
  }



  renderUpload() {
    if (this.state.showUploadLayout) {
      return html`<${Uploader} 
        placeholder="Layout name" 
        nameLabel="Name:" 
        key=${this.state.uploadLayoutKey}
        uploadErrorMessage=${this.state.uploadErrorMessage}
        uploadName=${this.state.uploadLayoutName}
        uploadLabel="Layout File:"
        onUpload=${this.finishUpload} />`;
    }
    return '';
  }

  render() {
    // eslint-disable-next-line no-console
    console.debug('State being rendered is', this.state);
    const l = this.getLayout();
    const boxes = l.page.boxes.map((item) => this.renderItem(item));
    return html`<div className="nmeaLayout">
                ${this.renderMenu()}
                ${this.renderUpload()}
                <div>
                 ${boxes}
                </div>
            </div>`;
  }
}









export { NMEALayout };
