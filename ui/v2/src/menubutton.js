import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

const html = htm.bind(h);


class MenuButton extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.lastPacketsRecived = 0;
    this.state = {
      dataIndicatorOn: false,
    };
  }

  componentDidMount() {
    this.updateInterval = setInterval((async () => {
      const packetsRecieved = this.props.storeAPI.getPacketsRecieved();
      if (this.lastPacketsRecived !== packetsRecieved) {
        this.lastPacketsRecived = packetsRecieved;
        this.setState({ dataIndicatorOn: !this.state.dataIndicatorOn });
      }
    }), 1000);
  }

  componentWillUnmount() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  render() {
    const indicatorClass = this.state.dataIndicatorOn ? 'iOn' : 'iOff';
    return html`<button onClick=${this.props.onClick} className=${indicatorClass} >${'\u2630'}</button>`;
  }
}

export { MenuButton };