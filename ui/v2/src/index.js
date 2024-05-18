import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { App } from './app.js';
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

render(html`<${App} host=${properties.host} view=${properties.view} layout=${properties.layout} />`, rootElement);



