const fetchInit = {cache: 'no-cache'};

addEventListener('fetch', event => {

  if (event.request.url.endsWith("/serviceworker.js")) {
    console.log("Skipping for serviceworker");
    return;
  }

  if (event.request.url.endsWith("/installServiceWorker.js")) {
    console.log("Skipping for serviceworker installer");
    return;
  }

  event.respondWith(

      caches.open('static-048').then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            console.log(`${event.request.url} cached`);
            return response;
          }
          console.log(`${event.request.url} NOT cached`);
          return fetch(event.request, fetchInit).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
  );
});

addEventListener('install', event => {
  console.log("Installing - skipping waiting");
  self.skipWaiting();
});