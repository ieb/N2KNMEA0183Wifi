import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);


class EditableLabel extends Component {
  constructor(props) {
    super();
    this.name = props.name;
    this.className = props.className;
    this.onChanged = props.onChanged;
    this.state = {
      value: props.value,
      editing: false,
    };
    this.edit = this.edit.bind(this);
    this.change = this.change.bind(this);
  }

  edit() {
    const save = this.state.editing;
    if (save) {
      this.onChanged(this.state.value);
    }
    this.setState({
      editing: !this.state.editing,
    });
  }

  change(e) {
    this.setState({
      value: e.target.value,
    });
  }

  render() {
    if (this.state.editing) {
      const n = Date.now();
      return html`<div class=${this.className}  >
        <input key=${n} name=${this.name} type="text" 
          value=${this.state.value} 
          onChange=${this.change}
          onBlur=${this.edit} />
        </div>`;
    }
    return html`<div class=${this.className} onClick=${this.edit}>${this.state.value}</div>`;
  }
}

class Menu extends Component {
  constructor(props) {
    super(props);
    this.connect = props.connect;
    this.disconnect = props.disconnect;
    this.menuEvents = props.menuEvents;

    this.state = {
      layoutList: [],
      layout: 'main',
      apiHost: props.apiHost,
      connectButtonText: 'connect',
      editingLayoutName: false,
      connectionMessage: props.connectionMessage,

    };
    this.onClickMenu = this.onClickMenu.bind(this);
    this.apiChange = this.apiChange.bind(this);
    this.onClickConnect = this.onClickConnect.bind(this);
    this.changeLayout = this.changeLayout.bind(this);
    this.handleMenuEvents = this.handleMenuEvents.bind(this);
  }


  componentDidMount() {
    this.updateLayouts('main');
    this.menuEvents.addListener('*', this.handleMenuEvents);
  }

  componentWillUnmount() {
    this.menuEvents.removeListener('*', this.handleMenuEvents);
  }


  handleMenuEvents(command, payload) {
    if (command === 'layouts-changed') {
      this.updateLayouts(payload);
    } else if (command === 'connection-update') {
      this.setState({
        connectButtonText: payload.connected ? 'disconnect' : 'connect',
        connectionMessage: payload.connectionMessage || this.state.connectionMessage,
        apiHost: payload.apiHost || this.state.apiHost,
      })
      console.log("Connection udpdate", payload);
    }
  }


  updateLayouts(layout) {
    const layoutList = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('layout-')) {
        layoutList.push(key.substring('layout-'.length));
      }
    }
    layoutList.sort();
    let layoutName = layout;
    if (!layoutList.includes(layout)) {
      // eslint-disable-next-line no-console
      console.debug(layout, ' not in ', layoutList);
      if (layoutList.length > 1) {
        // eslint-disable-next-line prefer-destructuring
        layoutName = layoutList[0];
        this.menuEvents.emit('load-layout', {
          currentLayout: layout,
          layout: layoutName,
          view: 'main',
        });
      }
    }

    if (layoutList.join(',') !== this.state.layoutList.join(',')
      || layout !== this.state.layoutName) {
      // eslint-disable-next-line no-console
      console.debug('Updated layout list ', layoutList);
      this.setState({
        layoutList,
        layout: layoutName,
        layoutNameKey: Date.now(),
      });
    }
  }


  // eslint-disable-next-line class-methods-use-this
  async onClickMenu(event) {
    event.preventDefault();
    const cmd = event.target.getAttribute('cmd');
    if (cmd === 'set-theme') {
      document.getElementById('root').className = event.target.getAttribute('theme');
    }
    let cmdLayout = event.target.getAttribute('layout');
    if (cmd === 'new-layout') {
      cmdLayout = `layout-${Date.now()}`;
      this.setState({
        layout: cmdLayout,
        layoutNameKey: Date.now(),
      });
    }
    if (cmd === 'copy-layout') {
      cmdLayout = `${this.state.layout}-copy`;
      this.setState({
        layout: cmdLayout,
        layoutNameKey: Date.now(),
      });
    }
    this.menuEvents.emit(cmd, {
      currentLayout: this.state.layout,
      layout: cmdLayout,
      view: event.target.getAttribute('view'),
      theme: event.target.getAttribute('theme'),
    });
    return false;
  }

  async apiChange(event) {
    const apiHost = event.target.value;
    this.setState({ apiHost });
  }

  async onClickConnect() {
    if (this.state.connectButtonText === 'connect') {
      this.setState({
        connectButtonText: 'connecting',
      });
      await this.connect(this.state.apiHost);
    } else if (this.state.connectButtonText === 'disconnect') {
      this.setState({
        connectButtonText: 'disconnecting',
      });
      await this.disconnect();
    }
  }

  generateLayoutMenu() {
    const layoutMenu = [];
    layoutMenu.push(html`<a key="-1" 
                    href="#"
                    cmd="new-layout" 
                    view="main"
                    onClick=${this.onClickMenu} >
                    New 
                    </a>`);
    layoutMenu.push(html`<a key="-2"
                    href="#"
                    view="main"
                    cmd="edit-layout" 
                    onClick=${this.onClickMenu} >
                    Edit 
                    </a>`);
    layoutMenu.push(html`<a key="-3" 
                    href="#"
                    view="main"
                    cmd="save-layout" 
                    onClick=${this.onClickMenu} >
                    Save 
                    </a>`);
    layoutMenu.push(html`<a key="-4" 
                    href="#"
                    view="main"
                    cmd="copy-layout" 
                    onClick=${this.onClickMenu} >
                    Copy 
                    </a>`);
    layoutMenu.push(html`<a key="-5" 
                    href="#"
                    view="main"
                    cmd="delete-layout" 
                    onClick=${this.onClickMenu} >
                    Delete 
                    </a>`);
    layoutMenu.push(html`<a key="-6" 
                    href="#"
                    view="main"
                    cmd="download-layout" 
                    onClick=${this.onClickMenu} >
                    Download 
                    </a>`);
    layoutMenu.push(html`<a key="-7" 
                    href="#"
                    view="main"
                    cmd="upload-layout" 
                    onClick=${this.onClickMenu} >
                    Upload 
                    </a>`);
    layoutMenu.push(html`<hr key="-50" />`);
    layoutMenu.push(html`<a key="-60" 
                      href="#"
                      view="main"
                      cmd="add-box" 
                      onClick=${this.onClickMenu} >
                      Append Box
                      </a>`);
    layoutMenu.push(html`<hr key="-100" />`);
    if (this.state.layoutList && this.state.layoutList.length > 0) {
      for (let x = 0; x < this.state.layoutList.length; x++) {
        const k = `${this.state.layoutNameKey}-${x}`;
        const className = (this.state.layout === this.state.layoutList[x]) ? 'selected' : '';
        layoutMenu.push(html`<a key=${k} 
                      href="#"
                      view="main"
                      cmd="load-layout" 
                      class=${className}
                      layout=${this.state.layoutList[x]} 
                      onClick=${this.onClickMenu} >
                      ${this.state.layoutList[x]}
                      </a>`);
      }
    } else {
      layoutMenu.push(html`No saved layouts available`);
    }
    return layoutMenu;
  }

  changeLayout(l) {
    const before = `${this.state.layout}`;
    const after = `${l}`;
    this.setState({
      layout: l,
    });
    this.menuEvents.emit('rename-layout', {
      from: before,
      to: after,
    });
    this.updateLayouts(after);
  }

  render() {
    return html`
        <div class="navbar">
            <${EditableLabel} 
              name="layoutname"
              className="nav-info"
              key=${this.state.layoutNameKey}
              value=${this.state.layout}
              onChanged=${this.changeLayout} />
             <div class="nav-item">
                <a href="#" view="main" cmd="load-layout" 
                  layout="local" 
                  onClick=${this.onClickMenu} >Page Layout </a>
                <div class="dropdown-content">
                    ${this.generateLayoutMenu()}
                </div>
            </div>
            <div class="nav-item"><a href="#" cmd="set-view" view="store" onClick=${this.onClickMenu} >Store</a></div>
            <div class="nav-item"><a href="#" cmd="set-view" view="frames" onClick=${this.onClickMenu} >Frames</a></div>
            <div class="nav-item"><a href="#" cmd="set-view" view="admin" onClick=${this.onClickMenu} >Admin</a></div>
            <div class="nav-item"><a href="#" cmd="set-view" view="debug" onClick=${this.onClickMenu} >Debug</a></div>
            <div class="nav-item">
              <a href="#" cmd="set-view" view="admin" onClick=${this.onClickMenu} >Theme</a>
              <div class="dropdown-content">
                <a key="day" cmd="set-theme" theme="day" href="#" onClick=${this.onClickMenu} >day</a>
                <a key="night" cmd="set-theme" theme="night" href="#" onClick=${this.onClickMenu} >night</a>
              </div>
            </div>
            <div class="nav-item">
              <input type="text" name="apiHost" value=${this.state.apiHost} onChange=${this.apiChange} />
              <button onClick=${this.onClickConnect} >${this.state.connectButtonText}</button>
              ${this.state.connectionMessage}
            </div>
        </div>`;
  }
}

export { Menu };
