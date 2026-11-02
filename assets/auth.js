// Where Supabase sends a confirmation or reset link when it can't open the app (the project's Site URL).
// Which ticket shows: ?state= (to preview one), then what Supabase put in the address — an error means
// the link failed; a password reset can only finish in the app; otherwise the link worked, on a phone
// or on a computer. Without JavaScript, the computer one shows.
(function () {
  var query = new URLSearchParams(location.search);
  var hash = new URLSearchParams(location.hash.slice(1));
  var has = function (key) {
    return query.has(key) || hash.has(key);
  };
  var view = query.get('state');
  if (!view) {
    if (has('error') || has('error_code')) view = 'expired';
    else if (query.get('type') === 'recovery' || hash.get('type') === 'recovery') view = 'recovery';
    else view = /iPhone|iPad|Android/i.test(navigator.userAgent) ? 'confirmed' : 'phone';
  }
  var cards = document.querySelectorAll('[data-view]');
  var found = false;
  for (var i = 0; i < cards.length; i++) found = found || cards[i].getAttribute('data-view') === view;
  if (!found) view = 'phone';
  for (var j = 0; j < cards.length; j++) cards[j].hidden = cards[j].getAttribute('data-view') !== view;

  // Sign-in tokens have nothing to do on this site: take them out of the address and the history.
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
})();
