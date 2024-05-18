import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layoutList: props.layoutList,
      layout: props.layout || 'local',
      apiUrl: props.apiUrl,
      apiChangeMessage: props.apiChangeMessage,
    };
    this.setView = props.setView;
    this.setApiUrl = props.setApiUrl;
    this.onClickMenu = this.onClickMenu.bind(this);
    this.apiChange = this.apiChange.bind(this);
  }


  // eslint-disable-next-line class-methods-use-this
  async onClickMenu(event) {
    const { view, layout, theme } = event.target.attributes;
    if (view) {
      if (layout) {
        this.setView(view.value, layout.value);
      } else {
        this.setView(view.value);
      }
    }
    if (theme) {
      document.getElementById('root').className = theme.value;
    }
    event.preventDefault();
    return false;
  }

  async apiChange(event) {
    const apiUrl = new URL(event.target.value);
    this.setState({
      apiChangeMessage: 'trying...',
      apiUrl,
    });
    await this.setApiUrl(apiUrl);
  }

  generateLayoutMenu() {
    if (this.state.layoutList === undefined || this.state.layoutList.length === 0) {
      return html`No saved layouts available`;
    }
    const layoutMenu = [];
    for (let x = 0; x < this.state.layoutList.length; x++) {
      layoutMenu.push(html`<a key=${x} 
                    href="#"
                    view="main"
                    layout=${this.state.layoutList[x]} 
                    onClick=${this.onClickMenu} >
                    ${this.state.layoutList[x]}
                    </a>`);
    }
    return layoutMenu;
  }

  render() {
    return html`
        <div class="navbar">
             <div class="nav-info">${this.state.layout} page</div>
             <div class="nav-item">
                <a href="#" view="main" layout="local" onClick=${this.onClickMenu} >Page Layout </a>
                <div class="dropdown-content">
                    ${this.generateLayoutMenu()}
                </div>
            </div>
            <div class="nav-item"><a href="#" view="store" onClick=${this.onClickMenu} >Store</a></div>
            <div class="nav-item"><a href="#" view="frames" onClick=${this.onClickMenu} >Frames</a></div>
            <div class="nav-item"><a href="#" view="admin" onClick=${this.onClickMenu} >Admin</a></div>
            <div class="nav-item">
              <a href="#" view="admin" onClick=${this.onClickMenu} >Theme</a>
              <div class="dropdown-content">
                <a key="day" theme="day" href="#" onClick=${this.onClickMenu} >day</a>
                <a key="night" theme="night" href="#" onClick=${this.onClickMenu} >night</a>
              </div>
            </div>
            <div class="nav-item">
              <input type="text" name="apiurl" value=${this.state.apiUrl} onChange=${this.apiChange} />
              ${this.state.apiChangeMessage}
            </div>
        </div>`;
  }
}

export { Menu };
