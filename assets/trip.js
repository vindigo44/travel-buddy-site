// A trip's public page: reads what its creator published (Supabase, get_public_trip — the anon key is
// public by design; nothing can be listed, a page is only found by its link) and shows where, how
// long, the budget per day and by category, and the itinerary. All text from the page goes in with
// textContent. "Copy this trip" opens the app on travelbuddy://copy?t=….
(function () {
  var API = 'https://ophubkkntrbohbomfaoc.supabase.co';
  var KEY = 'sb_publishable_Vx1YEER_vW-4jQCaw6zmKg_C9dBb0mK';
  var slug = new URLSearchParams(location.search).get('t') || '';
  var CATEGORIES = {
    food: ['Repas', 'Food'],
    transport: ['Transport', 'Transport'],
    accommodation: ['Logement', 'Accommodation'],
    shopping: ['Achats', 'Shopping'],
    activities: ['Activités', 'Activities'],
    other: ['Autre', 'Other'],
  };

  function show(view) {
    var cards = document.querySelectorAll('[data-view]');
    for (var i = 0; i < cards.length; i++) cards[i].hidden = cards[i].getAttribute('data-view') !== view;
  }
  // Two spans, one per language (the site's switch shows one).
  function both(fr, en) {
    var wrap = document.createElement('span');
    var a = document.createElement('span');
    a.lang = 'fr';
    a.textContent = fr;
    var b = document.createElement('span');
    b.lang = 'en';
    b.textContent = en;
    wrap.appendChild(a);
    wrap.appendChild(b);
    return wrap;
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function money(amount, currency, lang) {
    try {
      return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(amount);
    } catch (e) {
      return Math.round(amount) + ' ' + currency;
    }
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(127397 + code.charCodeAt(0), 127397 + code.charCodeAt(1)) : '';
  }
  function moneyBoth(amount, currency) {
    return both(money(amount, currency, 'fr'), money(amount, currency, 'en'));
  }

  function render(page) {
    if (!page || page.v !== 1 || typeof page.title !== 'string') return show('missing');
    document.getElementById('trip-title').textContent = page.title;
    document.getElementById('trip-flags').textContent = (page.countries || []).map(flag).join(' ');
    document.title = page.title + ' · Travel Buddy';

    var facts = document.getElementById('trip-facts');
    function fact(value, fr, en) {
      var box = el('div', 'fact');
      var v = el('div', 'fact-value');
      v.appendChild(typeof value === 'string' ? document.createTextNode(value) : value);
      box.appendChild(v);
      var l = el('div', 'fact-label');
      l.appendChild(both(fr, en));
      box.appendChild(l);
      facts.appendChild(box);
    }
    if (page.days) fact(String(page.days), 'JOURS', 'DAYS');
    if (page.perDay) fact(moneyBoth(page.perDay, page.currency), 'PAR JOUR', 'A DAY');
    if (page.budget) fact(moneyBoth(page.budget, page.currency), 'BUDGET', 'BUDGET');
    else if (page.spent) fact(moneyBoth(page.spent, page.currency), 'DÉPENSÉ', 'SPENT');
    if (page.travelers > 1) fact(String(page.travelers), 'VOYAGEURS', 'TRAVELLERS');

    var bars = document.getElementById('trip-categories');
    (page.categories || []).forEach(function (row) {
      var names = CATEGORIES[row.category] || CATEGORIES.other;
      var line = el('div', 'bar-row');
      var label = el('div', 'bar-label');
      label.appendChild(both(names[0], names[1]));
      line.appendChild(label);
      var track = el('div', 'bar-track');
      var fill = el('div', 'bar-fill ' + row.category);
      fill.style.width = Math.max(2, Math.round((row.share || 0) * 100)) + '%';
      track.appendChild(fill);
      line.appendChild(track);
      line.appendChild(el('div', 'bar-value', Math.round((row.share || 0) * 100) + ' %'));
      bars.appendChild(line);
    });
    if (!bars.children.length) document.getElementById('trip-categories-block').hidden = true;

    var titles = {};
    (page.dayTitles || []).forEach(function (entry) {
      titles[entry.day] = entry.title;
    });
    var list = document.getElementById('trip-itinerary');
    var lastDay = 0;
    (page.itinerary || []).forEach(function (stop) {
      if (stop.day !== lastDay) {
        lastDay = stop.day;
        var head = el('h3', 'day');
        head.appendChild(both('Jour ' + stop.day, 'Day ' + stop.day));
        if (titles[stop.day]) head.appendChild(document.createTextNode(' · ' + titles[stop.day]));
        list.appendChild(head);
      }
      var item = el('div', 'stop');
      if (stop.time) item.appendChild(el('span', 'stop-time', stop.time));
      var body = el('div', 'stop-body');
      body.appendChild(el('div', 'stop-title', stop.title));
      var names = CATEGORIES[stop.category] || CATEGORIES.other;
      var meta = el('div', 'stop-meta');
      meta.appendChild(both(names[0], names[1]));
      if (stop.place) meta.appendChild(document.createTextNode(' · ' + stop.place));
      if (stop.cost) {
        meta.appendChild(document.createTextNode(' · '));
        meta.appendChild(moneyBoth(stop.cost, page.currency));
      }
      body.appendChild(meta);
      item.appendChild(body);
      list.appendChild(item);
    });
    if (!list.children.length) document.getElementById('trip-itinerary-block').hidden = true;

    var links = document.querySelectorAll('[data-copy]');
    for (var i = 0; i < links.length; i++) links[i].href = 'travelbuddy://copy?t=' + slug;
    show('trip');
  }

  if (!/^[0-9a-z]{6,32}$/.test(slug)) return show('missing');
  fetch(API + '/rest/v1/rpc/get_public_trip', {
    method: 'POST',
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ trip_slug: slug }),
  })
    .then(function (response) {
      return response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status));
    })
    .then(render)
    .catch(function () {
      show('failed');
    });
})();
