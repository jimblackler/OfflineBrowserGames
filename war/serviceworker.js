
const fetchInit = {cache: 'reload'};

addEventListener('fetch', event => {

  event.respondWith(
      caches.open('static-025').then(cache => {
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