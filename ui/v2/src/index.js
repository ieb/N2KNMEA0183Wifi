import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';

import { NMEALayout } from './layout.js';
import { StoreView, FrameView } from './storeview.js';
import { AdminView } from './admin.js';
import { Menu } from './menu.js';
import { StoreAPIImpl } from './n2kmodule.js';

const html = htm.bind(h);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/worker.js', { scope: '/', type: 'module' });
}

const getLocationProperties = () => {
  const props = {};
  console.log(window.location);
  let p = [];
  if (window.location.hash.startsWith('#')) {
    p = window.location.hash.substring(1).split(',');
  } else if (window.location.search.startsWith('?')) {
    p = window.location.search.substring(1).split('&');
  }
  for (let i = 0; i < p.length; i++) {
    const kv = p[i].split('=', 2);
    props[kv[0]] = decodeURIComponent(kv[1]);
  }
  console.log('URL properties', props);
  props.host = props.host || window.location.host;
  props.host = '192.168.1.11';
  return props;
};

const rootElement = document.getElementById('root');
const properties = getLocationProperties();
if (properties.view === 'admin') {
  render(html`<${Menu} locationProperties=${properties} />
      <${AdminView} title="Admin" host=${properties.host} />`, rootElement);
} else {
  const storeAPI = new StoreAPIImpl();
  storeAPI.start(properties.host);
  if (properties.view === 'dump-store') {
    render(html`<${Menu} locationProperties=${properties} />
         <${StoreView} title="Store" storeAPI=${storeAPI}  />`, rootElement);
  } else if (properties.view === 'can-frames') {
    render(html`<${Menu} locationProperties=${properties} />
         <${FrameView} title="CAN Frames" storeAPI=${storeAPI} />`, rootElement);
  } else {
    render(html`<${Menu} locationProperties=${properties} />
         <${NMEALayout} locationProperties=${properties} storeAPI=${storeAPI}  />`, rootElement);
  }
}
