import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

import { NMEALayout } from './layout.js';
import { StoreView, FrameView } from './storeview.js';
import { AdminView } from './admin.js';
import { Menu } from './menu.js';
import { StoreAPIImpl } from './n2kmodule.js';

const html = htm.bind(h);

class App extends Component {
  constructor(props) {
    super(props);
    this.storeAPI = new StoreAPIImpl();
    let apiUrl = new URL(window.location);
    if (props.host) {
      apiUrl = new URL(`http://${props.host}`);
    }
    this.state = {
      apiUrl,
      view: props.view,
      layout: props.layout,
      layoutList: [],
      menuKey: Date.now(),
      appKey: Date.now(),
    };
    this.setView = this.setView.bind(this);
    this.setApiUrl = this.setApiUrl.bind(this);
    this.updateFileSystem = this.updateFileSystem.bind(this);
  }

  async componentDidMount() {
    await this.setApiUrl(this.state.apiUrl);
  }

  async updateFileSystem(apiUrl) {
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
        console.log("Layouts data", dir);
        this.setState({
          layoutList: dir.layouts,
          apiUrl,
          menuKey: Date.now(),
        });
        return true;
      }
      if (response.status === 404) {
        this.setState({
          layoutList: [],
          apiUrl,
          menuKey: Date.now(),
        });
        return true;
      }
    } catch (e) {
      // Some other failure, leave as is
      this.setState({
        layoutList: [],
        menuKey: Date.now(),
      });
    }
    return false;
  }


  setView(view, layout) {
    if (layout) {
      this.setState({
        view,
        layout,
        menuKey: Date.now(),
      });
    } else {
      this.setState({
        view,
        menuKey: Date.now(),
      });
    }
  }

  async setApiUrl(apiUrl) {
    if (await this.updateFileSystem(apiUrl)) {
      // host is responding switch over the feed.
      this.storeAPI.stop();
      this.storeAPI.start(apiUrl);
      this.setState({
        apiChangeMessage: 'connected',
        menuKey: Date.now(),
      });
    } else {
      this.setState({
        apiChangeMessage: 'failed, switched back',
        menuKey: Date.now(),
      });
    }
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
    return html`<${NMEALayout} 
      key=${this.state.menuKey}
      storeAPI=${this.storeAPI} 
      apiUrl=${this.state.apiUrl} 
      layout=${this.state.layout}  />`;
  }

  render() {
    const view = this.renderView();
    return html`<div>
              <${Menu} 
                key=${this.state.menuKey}
                layout=${this.state.layout} 
                layoutList=${this.state.layoutList} 
                setView=${this.setView}
                apiUrl=${this.state.apiUrl}
                setApiUrl=${this.setApiUrl}
                apiChangeMessage=${this.state.apiChangeMessage}
                />
              ${view}
            </div>`;
  }
}


export { App };
