// Who owes what on a shared trip, for group.html: the same rules as the app's lib/split.ts (an
// expense is shared by the travellers it's for, by their parts; marked repayments move the debt;
// the fewest transfers settle it). src/lib/__tests__/group-split-test.ts checks both agree.
(function (root) {
  function weightOf(tx, id) {
    return (tx.shares && typeof tx.shares[id] === 'number' && tx.shares[id]) || 1;
  }
  function payerOf(tx, members) {
    for (var i = 0; i < members.length; i++) if (members[i].id === tx.paidBy) return members[i];
    return members[0];
  }
  function sharersOf(tx, members) {
    var named = members.filter(function (m) {
      return Array.isArray(tx.splitWith) && tx.splitWith.indexOf(m.id) !== -1;
    });
    return named.length > 0 ? named : members;
  }

  function balances(transactions, members, settlements) {
    if (!members.length) return [];
    var rows = {};
    members.forEach(function (m) {
      rows[m.id] = { member: m, paid: 0, share: 0, repaid: 0, balance: 0 };
    });
    transactions.forEach(function (tx) {
      if (tx.type !== 'expense') return;
      rows[payerOf(tx, members).id].paid += tx.homeAmount;
      var sharers = sharersOf(tx, members);
      var parts = sharers.reduce(function (sum, m) {
        return sum + weightOf(tx, m.id);
      }, 0);
      sharers.forEach(function (m) {
        rows[m.id].share += (tx.homeAmount * weightOf(tx, m.id)) / parts;
      });
    });
    (settlements || []).forEach(function (s) {
      var from = rows[s.from];
      var to = rows[s.to];
      if (!from || !to || from === to) return;
      from.repaid += s.amount;
      to.repaid -= s.amount;
    });
    return members.map(function (m) {
      var row = rows[m.id];
      row.balance = row.paid - row.share + row.repaid;
      return row;
    });
  }

  function settleUp(rows, fractionDigits) {
    var unit = Math.pow(10, -fractionDigits);
    var round = function (amount) {
      return Math.round(amount / unit) * unit;
    };
    var byAmount = function (a, b) {
      return b.amount - a.amount;
    };
    var creditors = rows
      .filter(function (r) {
        return r.balance >= unit / 2;
      })
      .map(function (r) {
        return { member: r.member, amount: r.balance };
      })
      .sort(byAmount);
    var debtors = rows
      .filter(function (r) {
        return r.balance <= -unit / 2;
      })
      .map(function (r) {
        return { member: r.member, amount: -r.balance };
      })
      .sort(byAmount);
    var transfers = [];
    var c = 0;
    var d = 0;
    while (c < creditors.length && d < debtors.length) {
      var amount = Math.min(creditors[c].amount, debtors[d].amount);
      var rounded = round(amount);
      if (rounded >= unit) transfers.push({ from: debtors[d].member, to: creditors[c].member, amount: rounded });
      creditors[c].amount -= amount;
      debtors[d].amount -= amount;
      if (creditors[c].amount < unit / 2) c += 1;
      if (debtors[d].amount < unit / 2) d += 1;
    }
    return transfers;
  }

  var api = { balances: balances, settleUp: settleUp };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TravelBuddySplit = api;
})(this);
