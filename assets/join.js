// Where an invitation to a shared trip lands: the button opens the app on travelbuddy://join?code=…
// (12 hex characters). Without a valid code, it says so. Nothing is sent anywhere.
(function () {
  var code = (new URLSearchParams(location.search).get('code') || '').toLowerCase();
  var valid = /^[0-9a-f]{12}$/.test(code);
  var links = [document.getElementById('open-app'), document.getElementById('open-app-en')];
  for (var i = 0; i < links.length; i++) if (links[i] && valid) links[i].href = 'travelbuddy://join?code=' + code;
  // The button's own display rule would win over the hidden attribute.
  if (!valid) document.querySelector('.ticket-actions').style.display = 'none';
  if (valid) {
    document.getElementById('code').textContent = code.replace(/(.{4})(?=.)/g, '$1 ');
    document.getElementById('code-line').hidden = false;
  } else {
    document.getElementById('bad-code').hidden = false;
  }
})();
