import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

import { NMEALayout } from './layout.js';
import { StoreView, FrameView } from './storeview.js';
import { DebugView } from './debugview.js';
import { AdminView } from './admin.js';
import { Menu } from './menu.js';
import { StoreAPIImpl } from './n2kmodule.js';
import { EventEmitter } from './eventemitter.js';


const html = htm.bind(h);

class App extends Component {
  constructor(props) {
    super(props);
    this.storeAPI = new StoreAPIImpl();
    this.initialApiUrl = new URL(window.location);
    if (props.host) {
      this.initialApiUrl = new URL(`http://${props.host}`);
    }
    this.state = {
      view: props.view,
      layout: props.layout,
      layoutList: [],
      menuKey: Date.now(),
      appKey: Date.now(),
      apiUrl: this.initialApiUrl,
    };
    this.onMenuCommand = this.onMenuCommand.bind(this);
    this.setApiUrl = this.setApiUrl.bind(this);
    this.updateFileSystem = this.updateFileSystem.bind(this);
    this.eventEmitter = new EventEmitter();
  }


  async componentDidMount() {
    await this.setApiUrl(this.state.apiUrl);
  }

  async updateFileSystem(apiUrl) {
    if (apiUrl) {
      try {
        const timeout = new AbortController();
        setTimeout(() => {
          timeout.abort();
        }, 5000);
        const response = await fetch(new URL('/api/layouts.json', apiUrl), {
          credentials: 'include',
          signal: timeout.signal,
        });
        if (response.status === 200) {
          const dir = await response.json();
          console.log('Layouts data', dir);
          this.setState({
            layoutApi: apiUrl,
          });
          return dir.layouts;
        }
        if (response.status === 404) {
          this.setState({
            layoutApi: apiUrl,
          });
          return [];
        }
      } catch (e) {
        // Some other failure, leave as is
        this.setState({
          layoutApi: apiUrl,
        });
      }
      return undefined;
    }
    this.setState({
      layoutApi: undefined,
    });
    return undefined;
  }


  onMenuCommand(command, payload) {
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
    } else {
      console.log('Command not handled ', command, payload);
    }
    this.eventEmitter.emit(command, payload);
  }


  async setApiUrl(apiUrl) {
    if (apiUrl) {
      const layoutList = await this.updateFileSystem(apiUrl);
      if (layoutList) {
        // host is responding switch over the feed.
        this.storeAPI.stop();
        this.storeAPI.start(apiUrl);
        return {
          msg: 'connected',
          btn: 'disconnect',
          apiUrl,
          layoutList,
        };
      }
      return {
        msg: 'failed',
        btn: 'connect',
        layoutList: [],
      };
    }
    await this.updateFileSystem();
    this.storeAPI.stop();
    return {
      msg: 'disconnected',
      btn: 'connect',
      layoutList: [],
    };
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
      return html`<div><${DebugView} 
            key=${this.state.menuKey}
            storeAPI=${this.storeAPI} />
            <${StoreView} 
            key=${this.state.menuKey}
            storeAPI=${this.storeAPI}  />
            `;
    }
    return html`<${NMEALayout} 
      key=${this.state.menuKey}
      storeAPI=${this.storeAPI} 
      apiUrl=${this.state.layoutApi} 
      layout=${this.state.layout}
      menuEvents=${this.eventEmitter} />`;
  }

  render() {
    
    const view = this.renderView();
    return html`<div>
              <${Menu} 
                onMenuCommand=${this.onMenuCommand}
                setApiUrl=${this.setApiUrl}
                initialApiUrl=${this.initialApiUrl}
                />
              ${view}
            </div>`;
  }
}


export { App };
