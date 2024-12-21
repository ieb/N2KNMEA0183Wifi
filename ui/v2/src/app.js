import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

import { NMEALayout } from './layout.js';
import { StoreView, FrameView } from './storeview.js';
import { DebugView } from './debugview.js';
import { AdminView } from './admin.js';
import { Menu } from './menu.js';
import { StoreAPIImpl, SeaSmartReader } from './n2kmodule.js';
import { EventEmitter } from './eventemitter.js';
import { DefaultLayouts } from './defaultLayouts.js';


const html = htm.bind(h);

class App extends Component {
  constructor(props) {
    super(props);
    this.storeAPI = new StoreAPIImpl();
    this.seasmartReader = new SeaSmartReader(this.storeAPI.getParser());
    this.initialApiUrl = new URL(window.location);
    if (props.host) {
      this.initialApiUrl = new URL(`http://${props.host}`);
    }
    this.apiHost = 'boatsystems.local';
    this.state = {
      view: props.view,
      layout: props.layout,
      layoutList: [],
      menuKey: Date.now(),
      appKey: Date.now(),
    };
    this.handleMenuEvents = this.handleMenuEvents.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    // shared event bus for all components connected to the menu system.
    this.menuEvents = new EventEmitter();
    DefaultLayouts.load();

    const that = this;
    this.seasmartReader.addListener('connected', async (connected) => {
      console.log('Connected', connected);
      if (connected) {
        that.menuEvents.emit('connection-update', {
          connected: true,
          connectionMessage: 'connected',
        });
        await that.updateFileSystem();
      } else {
        // disconnected, update
        that.menuEvents.emit('connection-update', {
          connected: false,
          connectionMessage: 'disconnected',
        });
      }
    });

    this.seasmartReader.addListener('statusCode', (code) => {
      console.log('Status code', code);
      if (code === 200) {
        // normal operation
      } else if (code === 504) {
        setTimeout(async () => {
          // service worker or fetch is reporting offline so try other ports.
          await that.seasmartReader.stop();
          const parts = that.apiHost.split(':');
          if (parts.length === 1) {
            parts.push('8080');
          } else if (parts[1] === '8080') {
            parts[1] = '8081';
          } else if (parts[1] === '8081') {
            parts.pop();
          }
          const newApiHost = parts.join(':');
          that.apiHost = newApiHost;
          that.menuEvents.emit('connection-update', {
            apiHost: newApiHost,
            connectionMessage: 'searching....',
          });
          await that.seasmartReader.start(`http://${that.apiHost}/api/seasmart`);
        }, 1);
      }
    });

    setTimeout(async () => {
      console.log('Stop reader ');
      await that.seasmartReader.stop();
      this.setState({
        connectionMessage: 'connecting...',
      });
      console.log('Connecting to ', that.apiHost);
      await that.seasmartReader.start(`http://${that.apiHost}/api/seasmart`);
    }, 100);
    console.log('End Constuctor ', that.apiHost);
  }


  async componentDidMount() {
    if (this.state.apiUrl) {
      await this.connect(this.state.apiUrl);
    }
    this.menuEvents.addListener('*', this.handleMenuEvents);
  }

  async componentDidUnmount() {
    this.menuEvents.removeListener('*', this.handleMenuEvents);
  }

  async updateFileSystem() {
    try {
      const timeout = new AbortController();
      setTimeout(() => {
        timeout.abort();
      }, 5000);
      const apiUrl = `http://${this.apiHost}`;
      const response = await fetch(new URL('/api/layouts.json', apiUrl), {
        credentials: 'include',
        signal: timeout.signal,
      });
      if (response.status === 200) {
        const dir = await response.json();
        console.log('Layouts data', dir);
        this.setState({
          apiUrl,
          layouts: dir.layouts,
        });
      } else if (response.status === 404) {
        console.log('No Layouts data found');
        this.setState({
          apiUrl,
          layouts: [],
        });
      }
    } catch (e) {
      // Some other failure, leave as is
      console.log('updateFileSystem Fail', e);
    }
  }


  handleMenuEvents(command, payload) {
    if (command === 'set-view'
      || command === 'load-layout'
      || command === 'new-layout') {
      if (payload.view && payload.layout) {
        this.setState({
          view: payload.view,
          layout: payload.layout,
          menuKey: Date.now(),
        });
      } else {
        this.setState({
          view: payload.view,
          menuKey: Date.now(),
        });
      }
    }
  }


  /**
   * Trigger a restart of the reader of the apis host is set.
   */
  async connect(apiHost) {
    if (apiHost) {
      console.log('Setting API Host to', apiHost);
      this.apiHost = apiHost;
      await this.seasmartReader.stop();
      await this.seasmartReader.start(`http://${apiHost}/api/seasmart`);
    }
  }

  async disconnect() {
    await this.seasmartReader.stop();
  }

  renderView() {
    if (this.state.view === 'admin') {
      return html`<${AdminView} 
            key=${this.state.menuKey}
            apiUrl=${this.state.apiUrl} />`;
    }
    if (this.state.view === 'store') {
      return html`<${StoreView} 
            key=${this.state.menuKey}
            storeAPI=${this.storeAPI}  />`;
    }
    if (this.state.view === 'frames') {
      return html`<${FrameView} 
            key=${this.state.menuKey}
            storeAPI=${this.storeAPI} />`;
    }
    if (this.state.view === 'debug') {
      return html`<${DebugView} 
            key=${this.state.menuKey}
            storeAPI=${this.storeAPI} />
            `;
    }
    return html`<${NMEALayout} 
      key=${this.state.menuKey}
      storeAPI=${this.storeAPI} 
      apiUrl=${this.state.layoutApi} 
      layout=${this.state.layout}
      menuEvents=${this.menuEvents} />`;
  }

  render() {
    const view = this.renderView();
    return html`<div>
              <${Menu} 
                apiHost=${this.apiHost}
                layouts=${this.state.layouts}
                menuEvents=${this.menuEvents}
                connect=${this.connect}
                disconnect=${this.disconnect}
                />
              ${view}
            </div>`;
  }
}


export { App };
