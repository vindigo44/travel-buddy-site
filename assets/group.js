// A shared trip for friends without the app (group.html?g=…): reads the trip through Supabase's
// guest_trip with the link's token (the anon key is public by design; the token is the secret),
// shows who owes what, the expenses, and adds an expense or marks a repayment through
// guest_add_expense / guest_add_settlement, which check everything on the server. All text from the
// trip goes in with textContent. Who "you" are is remembered in this browser only.
(function () {
  var API = 'https://ophubkkntrbohbomfaoc.supabase.co';
  var KEY = 'sb_publishable_Vx1YEER_vW-4jQCaw6zmKg_C9dBb0mK';
  var token = (new URLSearchParams(location.search).get('g') || '').toLowerCase();
  var split = window.TravelBuddySplit;
  var CATEGORIES = [
    ['food', 'Repas', 'Food'],
    ['transport', 'Transport', 'Transport'],
    ['accommodation', 'Logement', 'Accommodation'],
    ['shopping', 'Achats', 'Shopping'],
    ['activities', 'Activités', 'Activities'],
    ['other', 'Autre', 'Other'],
  ];
  var trip = null;
  var me = null;

  function lang() {
    return document.documentElement.getAttribute('data-lang') === 'fr' ? 'fr' : 'en';
  }
  function show(view) {
    var cards = document.querySelectorAll('[data-view]');
    for (var i = 0; i < cards.length; i++) cards[i].hidden = cards[i].getAttribute('data-view') !== view;
  }
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
  function digits(currency) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: currency }).resolvedOptions().maximumFractionDigits;
    } catch (e) {
      return 2;
    }
  }
  function money(amount, currency, which) {
    try {
      return new Intl.NumberFormat(which === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: currency }).format(amount);
    } catch (e) {
      return amount.toFixed(2) + ' ' + currency;
    }
  }
  function moneyBoth(amount, currency) {
    return both(money(amount, currency, 'fr'), money(amount, currency, 'en'));
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(127397 + code.charCodeAt(0), 127397 + code.charCodeAt(1)) : '';
  }
  function today() {
    var d = new Date();
    var pad = function (n) {
      return String(n).padStart(2, '0');
    };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // "12,50", "1 250.5", "1.250,50": whichever separator comes last is the decimal one.
  function parseNumber(text) {
    var value = String(text).replace(/[\s  ]/g, '');
    var comma = value.lastIndexOf(',');
    var dot = value.lastIndexOf('.');
    if (comma !== -1 && dot !== -1) value = value.split(comma > dot ? '.' : ',').join('');
    value = value.replace(',', '.');
    return /^(\d+(\.\d*)?|\.\d+)$/.test(value) ? Number(value) : NaN;
  }
  function call(name, body) {
    return fetch(API + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (response) {
      if (response.ok) return response.status === 204 ? null : response.json();
      return response.json().then(
        function (error) {
          return Promise.reject(error);
        },
        function () {
          return Promise.reject(new Error('HTTP ' + response.status));
        },
      );
    });
  }
  function storedMe() {
    try {
      return localStorage.getItem('tb-group-me:' + token);
    } catch (e) {
      return null;
    }
  }
  function remember(id) {
    me = id;
    try {
      localStorage.setItem('tb-group-me:' + token, id);
    } catch (e) {
      // Private browsing: only for this visit.
    }
  }
  function nameOf(id) {
    var members = trip.members || [];
    for (var i = 0; i < members.length; i++) if (members[i].id === id) return members[i].name;
    return '?';
  }

  // Chips that act as radios (one) or checkboxes (several).
  function chips(container, selected, multiple, onChange) {
    container.textContent = '';
    (trip.members || []).forEach(function (member) {
      var on = selected.indexOf(member.id) !== -1;
      var chip = el('button', 'chip', member.name);
      chip.type = 'button';
      chip.setAttribute('role', multiple ? 'checkbox' : 'radio');
      chip.setAttribute('aria-checked', String(on));
      chip.addEventListener('click', function () {
        var next = multiple
          ? on
            ? selected.filter(function (id) {
                return id !== member.id;
              })
            : selected.concat([member.id])
          : [member.id];
        onChange(next);
      });
      container.appendChild(chip);
    });
  }

  var form = { payer: [], forWhom: [] };

  function renderMe() {
    chips(document.getElementById('group-me'), me ? [me] : [], false, function (next) {
      remember(next[0]);
      form.payer = [next[0]];
      renderMe();
      renderForm();
    });
  }

  function renderBalances() {
    var currency = trip.homeCurrency;
    var rows = split.balances(trip.transactions, trip.members || [], trip.settlements || []);
    var list = document.getElementById('group-balances');
    list.textContent = '';
    rows.forEach(function (row) {
      var line = el('div', 'row');
      var main = el('div', 'row-main');
      var title = el('div', 'row-title', row.member.name);
      if (row.member.id === me) title.appendChild(both(' (vous)', ' (you)'));
      main.appendChild(title);
      var sub = el('div', 'row-sub');
      sub.appendChild(both('a payé ', 'paid '));
      sub.appendChild(moneyBoth(row.paid, currency));
      sub.appendChild(both(' · sa part ', ' · their part '));
      sub.appendChild(moneyBoth(row.share, currency));
      main.appendChild(sub);
      line.appendChild(main);
      var square = Math.abs(row.balance) < 0.005;
      var value = el('div', 'row-value ' + (square ? '' : row.balance > 0 ? 'plus' : 'minus'));
      if (square) value.appendChild(both('quitte', 'square'));
      else {
        value.appendChild(document.createTextNode(row.balance > 0 ? '+' : '−'));
        value.appendChild(moneyBoth(Math.abs(row.balance), currency));
      }
      line.appendChild(value);
      list.appendChild(line);
    });

    var transfers = split.settleUp(rows, digits(currency));
    var box = document.getElementById('group-transfers');
    box.textContent = '';
    if (transfers.length === 0) box.appendChild(both('Tout le monde est quitte.', 'Everyone is square.'));
    transfers.forEach(function (transfer) {
      var line = el('div', 'transfer');
      line.appendChild(el('div', 'row-main', transfer.from.name + ' → ' + transfer.to.name));
      var value = el('div', 'row-value');
      value.appendChild(moneyBoth(transfer.amount, currency));
      line.appendChild(value);
      var paid = el('button', 'link-btn');
      paid.type = 'button';
      paid.appendChild(both('Payé', 'Paid'));
      paid.addEventListener('click', function () {
        paid.disabled = true;
        call('guest_add_settlement', {
          link: token,
          from_member: transfer.from.id,
          to_member: transfer.to.id,
          amount: transfer.amount,
        })
          .then(load)
          .catch(function () {
            paid.disabled = false;
          });
      });
      line.appendChild(paid);
      box.appendChild(line);
    });
  }

  function renderExpenses() {
    var list = document.getElementById('group-expenses');
    list.textContent = '';
    var expenses = trip.transactions
      .filter(function (tx) {
        return tx.type === 'expense';
      })
      .slice()
      .reverse();
    (trip.settlements || []).forEach(function (s) {
      expenses.push({ settlement: s });
    });
    expenses.slice(0, 200).forEach(function (tx) {
      var line = el('div', 'row');
      var main = el('div', 'row-main');
      if (tx.settlement) {
        main.appendChild(el('div', 'row-title', nameOf(tx.settlement.from) + ' → ' + nameOf(tx.settlement.to)));
        var subS = el('div', 'row-sub');
        subS.appendChild(both('Remboursement · ', 'Repayment · '));
        subS.appendChild(document.createTextNode(tx.settlement.date));
        main.appendChild(subS);
        line.appendChild(main);
        var v = el('div', 'row-value');
        v.appendChild(moneyBoth(tx.settlement.amount, trip.homeCurrency));
        line.appendChild(v);
        list.appendChild(line);
        return;
      }
      var cat = CATEGORIES.filter(function (c) {
        return c[0] === tx.category;
      })[0] || CATEGORIES[5];
      var title = el('div', 'row-title');
      if (tx.note) title.textContent = tx.note;
      else title.appendChild(both(cat[1], cat[2]));
      main.appendChild(title);
      var sub = el('div', 'row-sub');
      sub.appendChild(both(cat[1] + ' · ' + tx.date + ' · payé par ', cat[2] + ' · ' + tx.date + ' · paid by '));
      sub.appendChild(document.createTextNode(nameOf(tx.paidBy)));
      main.appendChild(sub);
      line.appendChild(main);
      var value = el('div', 'row-value');
      value.appendChild(moneyBoth(tx.homeAmount, trip.homeCurrency));
      line.appendChild(value);
      list.appendChild(line);
    });
  }

  function renderForm() {
    chips(document.getElementById('f-payer'), form.payer, false, function (next) {
      form.payer = next;
      renderForm();
    });
    chips(document.getElementById('f-for'), form.forWhom, true, function (next) {
      form.forWhom = next;
      renderForm();
    });
  }

  function updateRateField() {
    var currency = document.getElementById('f-currency').value.trim().toUpperCase();
    var field = document.getElementById('f-rate-field');
    var foreign = /^[A-Z]{3}$/.test(currency) && currency !== trip.homeCurrency;
    field.hidden = !foreign;
    var label = document.getElementById('f-rate-label');
    label.textContent = '';
    if (foreign) label.appendChild(both('1 ' + currency + ' = ? ' + trip.homeCurrency, '1 ' + currency + ' = ? ' + trip.homeCurrency));
  }

  function setupForm() {
    var select = document.getElementById('f-category');
    select.textContent = '';
    CATEGORIES.forEach(function (c) {
      var option = el('option', '', lang() === 'fr' ? c[1] : c[2]);
      option.value = c[0];
      select.appendChild(option);
    });
    document.getElementById('f-currency').value = trip.homeCurrency;
    document.getElementById('f-date').value = today();
    document.getElementById('f-date').max = today();
    document.getElementById('f-currency').addEventListener('input', updateRateField);
    updateRateField();
    form.payer = me ? [me] : [(trip.members[0] || {}).id];
    form.forWhom = trip.members.map(function (m) {
      return m.id;
    });
    renderForm();

    document.getElementById('group-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var error = document.getElementById('f-error');
      var fail = function (fr, en) {
        error.textContent = '';
        error.appendChild(both(fr, en));
        error.hidden = false;
      };
      error.hidden = true;
      var amount = parseNumber(document.getElementById('f-amount').value);
      var currency = document.getElementById('f-currency').value.trim().toUpperCase();
      var rate = currency === trip.homeCurrency ? 1 : parseNumber(document.getElementById('f-rate').value);
      if (!(amount > 0)) return fail('Saisissez un montant.', 'Enter an amount.');
      if (!/^[A-Z]{3}$/.test(currency)) return fail('La devise est un code de 3 lettres (EUR, USD…).', 'The currency is a 3-letter code (EUR, USD…).');
      if (!(rate > 0)) return fail('Indiquez le taux de change.', 'Enter the exchange rate.');
      if (!form.payer[0]) return fail('Qui a payé ?', 'Who paid?');
      if (form.forWhom.length === 0) return fail('Pour qui ?', 'For whom?');
      var expense = {
        amount: amount,
        currency: currency,
        exchangeRate: rate,
        homeAmount: amount * rate,
        category: document.getElementById('f-category').value,
        note: document.getElementById('f-note').value.trim().slice(0, 200),
        date: document.getElementById('f-date').value || today(),
        paidBy: form.payer[0],
        splitWith: form.forWhom.length < trip.members.length ? form.forWhom : null,
      };
      var button = event.target.querySelector('button[type=submit]');
      button.disabled = true;
      call('guest_add_expense', { link: token, expense: expense })
        .then(function () {
          document.getElementById('f-amount').value = '';
          document.getElementById('f-note').value = '';
          return load();
        })
        .catch(function () {
          fail('La dépense n’a pas pu être ajoutée. Vérifiez votre connexion.', 'The expense couldn’t be added. Check your connection.');
        })
        .then(function () {
          button.disabled = false;
        });
    });
  }

  var formReady = false;
  function render(data) {
    if (!data || !data.trip || !Array.isArray(data.trip.members) || data.trip.members.length < 2) return show('missing');
    trip = data.trip;
    trip.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    var title = trip.name || trip.city || (trip.countries || []).join(', ') || 'Travel Buddy';
    document.getElementById('group-title').textContent = title;
    document.getElementById('group-flags').textContent = (trip.countries || []).map(flag).join(' ');
    document.title = title + ' · Travel Buddy';
    var stored = storedMe();
    me = trip.members.some(function (m) {
      return m.id === stored;
    })
      ? stored
      : null;
    renderMe();
    renderBalances();
    renderExpenses();
    if (!formReady) {
      formReady = true;
      setupForm();
    }
    show('trip');
  }

  function load() {
    return call('guest_trip', { link: token })
      .then(render)
      .catch(function (error) {
        show(error && error.code === 'P0002' ? 'missing' : 'failed');
      });
  }

  if (!/^[0-9a-f]{24}$/.test(token) || !split) return show('missing');
  load();
})();
