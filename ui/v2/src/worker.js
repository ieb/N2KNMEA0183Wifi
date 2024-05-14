/* eslint-disable no-restricted-globals */

/**
 * The worker is here to allow installation, its not
 * here to for much more as doing anything complex makes
 * reloading the worker hard.
 */

const CACHE_NAME = 'marineInstruments';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    cache.addAll([
      '/',
    ]);
  })());
});

self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Before Event Install ', event);
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith((async () => {
      if (event.request.destination === 'image'
          || event.request.destination === 'script'
          || event.request.destination === 'manifest') {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          const date = cachedResponse.headers.get('date');
          if (date
            && (Date.now() - Date.parse(date)) < 60000) {
            console.log('HIT', cachedResponse);
            return cachedResponse;
          }
          console.log('Expired', cachedResponse, (Date.now() - Date.parse(date)));
        }
        try {
          // If the resource was not in the cache or too old in the cache try the network.
          const fetchResponse = await fetch(event.request);

          if (fetchResponse.status === 200) {
            const cacheControl = fetchResponse.headers.get('cache-control');
            if (!(cacheControl.includes('private') || cacheControl.includes('no-store'))) {
              // Save the resource in the cache and return it.
              console.log('MISS', fetchResponse);
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            }
          }
          console.log('PASS', fetchResponse);
        } catch (e) {
          console.log('Network Failed ', e);
          // The network failed.
        }
        // serve stale if its available
        console.log('STALE', cachedResponse);
        return cachedResponse;
      }
      const passResponse = await fetch(event.request, {
        credentials: 'include',
      });
      console.log('PASS request', event.request);
      for (const k of event.request.headers.keys()) {
        console.log(`   ${k}: ${event.request.headers.get(k)}`);
      }
      console.log('PASS response', passResponse);
      for (const k of passResponse.headers.keys()) {
        console.log(`   ${k}: ${passResponse.headers.get(k)}`);
      }
      return passResponse;
    })());
  }
});
/*
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);



    // Get the resource from the cache.
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }
    try {
      // If the resource was not in the cache, try the network.
      const fetchResponse = await fetch(event.request);


      // Save the resource in the cache and return it.
      cache.put(event.request, fetchResponse.clone());
      return fetchResponse;
    } catch (e) {
      // The network failed.
    }
    return undefined;
  })());
}); */

