/**
 * Système d'économie — Diamants 💎
 * Stockage en mémoire (persiste jusqu'au redémarrage du bot)
 */

const balances = new Map(); // userId -> { diamonds, lastDaily }

const STARTING_BALANCE = 300;
const SCRATCH_COST     = 20;
const GACHA_COST       = 50;

function getBalance(userId) {
  if (!balances.has(userId)) {
    balances.set(userId, { diamonds: STARTING_BALANCE, lastDaily: null });
  }
  return balances.get(userId).diamonds;
}

function addDiamonds(userId, amount) {
  if (!balances.has(userId)) balances.set(userId, { diamonds: STARTING_BALANCE, lastDaily: null });
  const data = balances.get(userId);
  data.diamonds = Math.max(0, data.diamonds + amount);
  return data.diamonds;
}

function deductDiamonds(userId, amount) {
  return addDiamonds(userId, -amount);
}

function hasFunds(userId, amount) {
  return getBalance(userId) >= amount;
}

function claimDaily(userId) {
  if (!balances.has(userId)) balances.set(userId, { diamonds: STARTING_BALANCE, lastDaily: null });
  const data    = balances.get(userId);
  const now     = Date.now();
  const oneDay  = 86400000;
  if (data.lastDaily && now - data.lastDaily < oneDay) {
    const next = data.lastDaily + oneDay - now;
    return { success: false, next };
  }
  const reward      = Math.floor(Math.random() * 151) + 50; // 50–200
  data.diamonds    += reward;
  data.lastDaily    = now;
  return { success: true, reward, balance: data.diamonds };
}

module.exports = { getBalance, addDiamonds, deductDiamonds, hasFunds, claimDaily, SCRATCH_COST, GACHA_COST, STARTING_BALANCE };
