addEventListener('load', () => {
  navigator.serviceWorker.register('../serviceworker.js', {scope: './'}).then(() => {
    console.log("Service worker registered successfully.");
  }, function(error) {
    console.log("Error registering service worker: " + error);
  });
});