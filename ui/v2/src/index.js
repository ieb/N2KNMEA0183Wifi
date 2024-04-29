import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

import { NMEALayout } from './layout.js';
import { Logs } from './logs.js';
import { StoreView, FrameView } from './storeview.js';
import { AdminView } from './admin.js';
import { StoreAPIImpl, MainAPIImpl } from './n2kmodule.js';

const getLocationProperties = () => {
   const props = {};
   console.log(window.location);
   let p = [];
   if ( window.location.hash.startsWith('#')) {
      p = window.location.hash.substring(1).split(",");
   } else if ( window.location.search.startsWith('?') ) {
      p = window.location.search.substring(1).split("&");
   }
   for (var i = 0; i < p.length; i++) {
      const kv = p[i].split('=',2);
      props[kv[0]] = decodeURIComponent(kv[1]);
   }
   console.log("URL properties", props);
   props.host = props.host || window.location.host;
   return props;
}

const rootElement = document.getElementById('root');
const properties = getLocationProperties();
if ( properties.view ===  "admin" ) {
   render(html`<${AdminView} title="Admin" host=${properties.host} />`, rootElement);   
} else {
   const storeAPI = new StoreAPIImpl();
   storeAPI.start(properties.host);
   const mainAPI = new MainAPIImpl();
   if ( properties.view ===  "dump-store") {
      render(html`<${StoreView} title="Store" storeAPI=${storeAPI}  />`, rootElement);
   } else if ( properties.view ===  "can-frames") { 
       render(html`<${FrameView} title="CAN Frames" storeAPI=${storeAPI} />`, rootElement);
   } else if ( properties.view ===  "can-messages") { 
      render(html`<${Logs} title="CAN Messages" mainAPI=${mainAPI} enableFeed=${mainAPI.onCanMessage} />`, rootElement);
   } else if ( properties.view ===  "debug-logs") { 
      render(html`<${Logs} title="Debug Logs" mainAPI=${mainAPI} enableFeed=${mainAPI.onLogMessage} />`, rootElement);
   } else {
      render(html`<${NMEALayout} mainAPI=${mainAPI} storeAPI=${storeAPI} />`, rootElement);
   }

}





