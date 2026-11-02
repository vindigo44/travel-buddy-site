// Language (English or French) and theme (light or dark), as the header's two switches set them.
// Each: ?lang= / ?theme=, then the visitor's last choice, then the browser's. Without JavaScript the
// pages show English and follow the system's theme, and the switches are hidden. Loaded in <head> so
// the page never flashes the other language or theme.
(function () {
  var root = document.documentElement;
  var choices = {
    lang: { key: 'tb-site-lang', values: ['en', 'fr'] },
    theme: { key: 'tb-site-theme', values: ['light', 'dark'] },
  };

  function stored(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function browserLang() {
    var langs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < langs.length; i++) {
      var code = String(langs[i]).slice(0, 2).toLowerCase();
      if (code === 'fr' || code === 'en') return code;
    }
    return 'en';
  }

  function initial(name) {
    var choice = choices[name];
    var param = new URLSearchParams(location.search).get(name);
    if (choice.values.indexOf(param) >= 0) return param;
    var saved = stored(choice.key);
    if (choice.values.indexOf(saved) >= 0) return saved;
    if (name === 'lang') return browserLang();
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(name, value) {
    if (name === 'lang') {
      root.setAttribute('data-lang', value);
      root.setAttribute('lang', value);
      var title = root.getAttribute('data-title-' + value);
      if (title) document.title = title;
    } else {
      root.setAttribute('data-theme', value);
    }
    var buttons = document.querySelectorAll('[data-set-' + name + ']');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-set-' + name) === value));
    }
  }

  root.classList.remove('no-js');
  apply('lang', initial('lang'));
  apply('theme', initial('theme'));

  document.addEventListener('DOMContentLoaded', function () {
    apply('lang', root.getAttribute('data-lang'));
    apply('theme', root.getAttribute('data-theme'));
    document.addEventListener('click', function (event) {
      for (var name in choices) {
        var button = event.target.closest('[data-set-' + name + ']');
        if (!button) continue;
        var value = button.getAttribute('data-set-' + name);
        try {
          localStorage.setItem(choices[name].key, value);
        } catch (e) {}
        apply(name, value);
      }
    });
  });
})();
