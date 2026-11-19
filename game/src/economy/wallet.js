// Wallet rules: paying for things, receiving cash and taking penalties, all as plain checked transactions.

/** A wallet holding whole dollars; never goes negative. */
export function createWallet(cash = 0) {
  return { cash: Math.max(0, Math.round(cash)), spent: 0, earned: 0 };
}

/** Try to pay `price`; returns {ok, reason} and only takes the money when ok. */
export function pay(wallet, price) {
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: 'bad price' };
  if (wallet.cash < price) return { ok: false, reason: 'not enough cash' };
  wallet.cash -= price;
  wallet.spent += price;
  return { ok: true, reason: '' };
}

/** Add cash (pickups, wages); returns the amount added. */
export function receive(wallet, amount) {
  const value = Math.max(0, Math.round(amount));
  wallet.cash += value;
  wallet.earned += value;
  return value;
}

/** The fine for a penalty rule {share, min, max}, never more than the wallet holds. */
export function penaltyFor(wallet, rule) {
  const raw = Math.round(wallet.cash * rule.share);
  return Math.min(wallet.cash, Math.max(rule.min, Math.min(rule.max, raw)));
}

/** Take a penalty; returns the amount taken. */
export function takePenalty(wallet, rule) {
  const amount = penaltyFor(wallet, rule);
  wallet.cash -= amount;
  return amount;
}
