import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

import { NMEALayout } from './layout.js';
import { StoreView, FrameView } from './storeview.js';
import { AdminView } from './admin.js';
import { Menu } from './menu.js';
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
   render(html`<${Menu} locationProperties=${properties} />
      <${AdminView} title="Admin" host=${properties.host} />`, rootElement);   
} else {
   const storeAPI = new StoreAPIImpl();
   storeAPI.start(properties.host);
   const mainAPI = new MainAPIImpl();
   if ( properties.view ===  "dump-store") {
      render(html`<${Menu} locationProperties=${properties} />
         <${StoreView} title="Store" storeAPI=${storeAPI}  />`, rootElement);
   } else if ( properties.view ===  "can-frames") { 
       render(html`<${Menu} locationProperties=${properties} />
         <${FrameView} title="CAN Frames" storeAPI=${storeAPI} />`, rootElement);
   } else {
      render(html`<${Menu} locationProperties=${properties} />
         <${NMEALayout} locationProperties=${properties} mainAPI=${mainAPI} storeAPI=${storeAPI}  />`, rootElement);
   }

}





