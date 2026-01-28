/*  PINIGĖNAI — Miestelio Legenda
    - Istorija + misijos
    - Shop + inventory
    - Darbas + skill
    - Bankas + palūkanos
    - Investicijos
    - Gatvė + heat + policija
    - Achievements
    - Autosave
*/

"use strict";

/* ---------------------------
   UTIL
----------------------------*/
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = (p) => Math.random() < p;
const fmtMoney = (n) => {
  n = Math.floor(n);
  return n.toLocaleString("lt-LT") + " €";
};

function nowStamp() {
  const d = new Date();
  return d.toLocaleString("lt-LT", { hour12: false });
}

/* ---------------------------
   GAME DATA
----------------------------*/
const STORAGE_KEY = "pinigenai_save_v1";

const ITEMS = [
  {
    id: "coffee",
    name: "Kava 2x",
    desc: "Energija +20 (vienkartinis).",
    price: 35,
    type: "consumable",
    use: (s) => {
      s.energy = clamp(s.energy + 20, 0, s.maxEnergy);
      logGood("Išgėrei kavą. Energija +20.");
    },
  },
  {
    id: "laptop",
    name: "Senukas Laptopas",
    desc: "+10% uždarbio iš darbų.",
    price: 240,
    type: "upgrade",
    effect: { workMult: 0.10 },
  },
  {
    id: "bike",
    name: "Dviratis",
    desc: "+5 reputacija, +5% uždarbio, -5% heat per dieną.",
    price: 420,
    type: "upgrade",
    effect: { rep: 5, workMult: 0.05, heatDecay: 0.05 },
  },
  {
    id: "hoodie",
    name: "Tamsus Hoodie",
    desc: "-10% heat nuo gatvės veiksmų.",
    price: 520,
    type: "upgrade",
    effect: { heatResist: 0.10 },
  },
  {
    id: "printer",
    name: "Printeris",
    desc: "+15% uždarbio iš darbų, +1 skill per dieną.",
    price: 900,
    type: "upgrade",
    effect: { workMult: 0.15, dailySkill: 1 },
  },
  {
    id: "mentor",
    name: "Mentorius",
    desc: "+2 skill per dieną, atrakina geresnius darbus.",
    price: 1600,
    type: "upgrade",
    effect: { dailySkill: 2 },
  },
  {
    id: "safe",
    name: "Seifas",
    desc: "Heat -20% (vienkartinis).",
    price: 700,
    type: "consumable",
    use: (s) => {
      s.heat = clamp(s.heat - 20, 0, 100);
      logGood("Seifas padėjo paslėpti pėdsakus. Heat -20%.");
    },
  },
];

const INVESTMENTS = [
  {
    id: "startup",
    name: "Startuolis",
    desc: "Rizika: vidutinė. Gali duoti +15%..+60% arba -20%.",
    min: -0.20,
    max: 0.60,
    risk: "Vidutinė",
  },
  {
    id: "crypto",
    name: "Kripto",
    desc: "Rizika: didelė. Gali duoti +20%..+200% arba -60%.",
    min: -0.60,
    max: 2.00,
    risk: "Didelė",
  },
  {
    id: "realestate",
    name: "NT",
    desc: "Rizika: maža. +5%..+20% arba -5%.",
    min: -0.05,
    max: 0.20,
    risk: "Maža",
  },
  {
    id: "meme",
    name: "Meme akcijos",
    desc: "Rizika: chaos. -80%..+400%.",
    min: -0.80,
    max: 4.00,
    risk: "CHAOS",
  },
];

const ACHIEVEMENTS = [
  { id: "first_cash", name: "Pirmi pinigai", desc: "Turėk 100€.", cond: (s)=> s.money >= 100 },
  { id: "banker", name: "Bankininkas", desc: "Turėk 1000€ banke.", cond: (s)=> s.bank >= 1000 },
  { id: "legend", name: "Legenda", desc: "Pasiek 100 reputacijos.", cond: (s)=> s.rep >= 100 },
  { id: "skill50", name: "Meistras", desc: "Pasiek 50 skill.", cond: (s)=> s.skill >= 50 },
  { id: "heat80", name: "Per karšta!", desc: "Heat 80% ar daugiau.", cond: (s)=> s.heat >= 80 },
  { id: "rich", name: "Turčius", desc: "Turėk 10,000€.", cond: (s)=> (s.money + s.bank) >= 10000 },
];

const STORY = [
  {
    title: "Prologas — Nulis kišenėj",
    text: `Tu atsikeli mažam miestelyje. Kišenėj — tik dulkės ir ambicija.
Vietiniai kalba apie vieną dalyką: kas taps <b>PINIGĖNŲ legenda</b>, tas valdys miestą.

Bet legenda neprasideda nuo milijono.
Ji prasideda nuo pirmo euro.`,
    unlock: (s)=> true,
  },
  {
    title: "1 skyrius — Darbas nėra gėda",
    text: `Miestelio seniūnas sako:
<b>„Pirmiausia užsidirbk sąžiningai.“</b>

Tau reikia įrodyti, kad moki uždirbti, taupyti ir augti.`,
    unlock: (s)=> s.money >= 80 || s.rep >= 5,
  },
  {
    title: "2 skyrius — Bankas šypsosi",
    text: `Tu įžengi į banką. Ten dirba kasa su žvilgsniu:
<b>„Turit ką padėt?“</b>

Bankas moka palūkanas, bet tik tiems, kurie žino žaidimo taisykles.`,
    unlock: (s)=> s.bank >= 50 || s.money >= 300,
  },
  {
    title: "3 skyrius — Gatvė šnabžda",
    text: `Vakarais miestelis pasikeičia. Atsiranda žmonės, kurie sako:
<b>„Greiti pinigai. Be klausimų.“</b>

Bet kiekvienas triukas palieka pėdsakus.
O pėdsakus seka policija.`,
    unlock: (s)=> s.rep >= 15 || s.money >= 700,
  },
  {
    title: "4 skyrius — Legenda gimsta",
    text: `Tavo vardas pradeda sklisti. Vieni tave gerbia. Kiti pavydi.
Seniūnas atneša pasiūlymą:

<b>„Padaryk miestui paslaugą. Ir tapsi legenda.“</b>`,
    unlock: (s)=> s.rep >= 60 || (s.money + s.bank) >= 5000,
  },
];

const MISSIONS = [
  {
    id: "m1",
    title: "Uždirbk pirmus 100€",
    desc: "Padaryk taip, kad tavo pinigai pasiektų 100€.",
    reward: { money: 60, rep: 5, skill: 1 },
    check: (s)=> s.money >= 100,
  },
  {
    id: "m2",
    title: "Įnešk į banką 200€",
    desc: "Bankas mėgsta discipliną.",
    reward: { money: 120, rep: 8, skill: 2 },
    check: (s)=> s.bank >= 200,
  },
  {
    id: "m3",
    title: "Nusipirk upgrade",
    desc: "Įsigyk bent vieną upgrade daiktą iš shopo.",
    reward: { money: 150, rep: 10, skill: 3 },
    check: (s)=> s.inventory.some(it => it.type === "upgrade"),
  },
  {
    id: "m4",
    title: "Pasiek 25 skill",
    desc: "Tapk pakankamai geras, kad miestas tave pastebėtų.",
    reward: { money: 400, rep: 20, skill: 5 },
    check: (s)=> s.skill >= 25,
  },
  {
    id: "m5",
    title: "Turėk 5,000€",
    desc: "Sukaupk 5,000€ (pinigai + bankas).",
    reward: { money: 800, rep: 25, skill: 10 },
    check: (s)=> (s.money + s.bank) >= 5000,
  },
  {
    id: "m6",
    title: "Legenda",
    desc: "Pasiek 100 reputacijos.",
    reward: { money: 2000, rep: 50, skill: 15 },
    check: (s)=> s.rep >= 100,
  },
];

/* ---------------------------
   STATE
----------------------------*/
function defaultState(){
  return {
    day: 1,
    money: 120,
    bank: 0,
    rep: 0,
    energy: 100,
    maxEnergy: 100,
    skill: 0,
    heat: 0,
    storyIndex: 0,
    completedMissions: [],
    achievements: [],
    inventory: [],
    upgrades: {
      workMult: 0,
      dailySkill: 0,
      heatResist: 0,
      heatDecay: 0,
    },
    stats: {
      totalEarned: 0,
      totalWorked: 0,
      totalStreet: 0,
      totalInvested: 0,
      totalLost: 0,
    },
    news: [],
  };
}

let S = load() || defaultState();

/* ---------------------------
   DOM refs
----------------------------*/
const elMoney = $("#money");
const elBank = $("#bank");
const elRep = $("#rep");
const elEnergy = $("#energy");
const elSkill = $("#skill");
const elHeat = $("#heat");
const elDay = $("#pillDay");
const elAutosave = $("#pillAutosave");

const elInventory = $("#inventoryList");
const elStory = $("#storyBox");
const elMissionList = $("#missionList");
const elShop = $("#shopGrid");
const elLog = $("#logBox");
const elAch = $("#achList");

const elBankBig = $("#bankBig");
const elInterest = $("#interest");
const elBankAmount = $("#bankAmount");
const elInvestGrid = $("#investGrid");
const elNews = $("#newsBox");

/* ---------------------------
   LOG
----------------------------*/
function logLine(html, type=""){
  const div = document.createElement("div");
  div.className = "logLine " + type;
  div.innerHTML = `<b>[${nowStamp()}]</b> ${html}`;
  elLog.prepend(div);
}
function logGood(msg){ logLine(msg, "good"); }
function logBad(msg){ logLine(msg, "bad"); }
function logWarn(msg){ logLine(msg, "warn"); }
function logInfo(msg){ logLine(msg, ""); }

/* ---------------------------
   SAVE / LOAD
----------------------------*/
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  elAutosave.textContent = "Autosave ✓";
  setTimeout(()=> elAutosave.textContent = "Autosave ON", 800);
}
function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}
function hardReset(){
  localStorage.removeItem(STORAGE_KEY);
  S = defaultState();
  logWarn("Reset padarytas. Naujas gyvenimas prasideda.");
  renderAll();
  save();
}

/* ---------------------------
   CALCS
----------------------------*/
function interestRate(){
  // base 0.2% + rep/1000 + skill/2000
  let r = 0.002 + (S.rep / 1000) + (S.skill / 2000);
  // cap
  r = clamp(r, 0.002, 0.02);
  return r;
}

function workPay(){
  // base pay depends on skill
  const base = 40 + S.skill * 3;
  const mult = 1 + S.upgrades.workMult;
  const energyFactor = clamp(S.energy / S.maxEnergy, 0.25, 1);
  return Math.floor(base * mult * energyFactor);
}

function policeRisk(){
  // risk grows with heat
  return clamp(S.heat / 120, 0, 0.85);
}

/* ---------------------------
   RENDER
----------------------------*/
function renderStats(){
  elMoney.textContent = fmtMoney(S.money);
  elBank.textContent = fmtMoney(S.bank);
  elRep.textContent = S.rep.toString();
  elEnergy.textContent = `${S.energy}/${S.maxEnergy}`;
  elSkill.textContent = S.skill.toString();
  elHeat.textContent = `${Math.round(S.heat)}%`;
  elDay.textContent = `Diena ${S.day}`;

  elBankBig.textContent = fmtMoney(S.bank);
  elInterest.textContent = `+${(interestRate()*100).toFixed(1)}%`;
}

function renderInventory(){
  elInventory.innerHTML = "";
  if(S.inventory.length === 0){
    elInventory.innerHTML = `<div class="hint">Kol kas tu neturi daiktų. Shopas laukia.</div>`;
    return;
  }
  for(const it of S.inventory){
    const row = document.createElement("div");
    row.className = "invItem";
    row.innerHTML = `
      <div>
        <div class="invName">${it.name}</div>
        <div class="invDesc">${it.desc}</div>
      </div>
      <div class="invMeta">
        ${it.type === "consumable" ? `<button class="btn" data-use="${it.id}">Use</button>` : "✓"}
      </div>
    `;
    elInventory.appendChild(row);
  }

  $$("[data-use]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-use");
      useItem(id);
    });
  });
}

function renderStory(){
  // show current unlocked story chunk
  let idx = S.storyIndex;
  idx = clamp(idx, 0, STORY.length-1);

  // ensure index is not ahead of unlock
  while(idx < STORY.length-1 && STORY[idx+1].unlock(S)){
    idx++;
  }
  S.storyIndex = idx;

  const node = STORY[S.storyIndex];
  elStory.innerHTML = `
    <div class="bigTitle small">${node.title}</div>
    <div style="margin-top:10px;">${node.text}</div>
  `;
}

function renderMissions(){
  elMissionList.innerHTML = "";
  for(const m of MISSIONS){
    const done = S.completedMissions.includes(m.id);
    const canClaim = !done && m.check(S);

    const card = document.createElement("div");
    card.className = "missionCard";
    card.innerHTML = `
      <div class="missionTop">
        <div>
          <div class="missionTitle">${done ? "✅ " : ""}${m.title}</div>
          <div class="missionDesc">${m.desc}</div>
        </div>
        <div class="pill">${done ? "Baigta" : (canClaim ? "Paruošta" : "Vykdoma")}</div>
      </div>
      <div class="missionRewards">
        Reward: <b>${fmtMoney(m.reward.money)}</b>, REP +${m.reward.rep}, SKILL +${m.reward.skill}
      </div>
      <div class="missionActions">
        ${canClaim ? `<button class="btn primary" data-claim="${m.id}">🎁 Claim</button>` : ""}
        ${!done ? `<button class="btn ghost" data-track="${m.id}">📌 Track</button>` : ""}
      </div>
    `;
    elMissionList.appendChild(card);
  }

  $$("[data-claim]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      claimMission(btn.getAttribute("data-claim"));
    });
  });
  $$("[data-track]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-track");
      const m = MISSIONS.find(x=>x.id===id);
      modal("📌 Misija", `
        <b>${m.title}</b><br><br>
        ${m.desc}<br><br>
        <span class="pill">Reward: ${fmtMoney(m.reward.money)} • REP +${m.reward.rep} • SKILL +${m.reward.skill}</span>
      `, [
        { label:"OK", cls:"primary", onClick: closeModal }
      ]);
    });
  });
}

function renderShop(){
  elShop.innerHTML = "";
  for(const it of ITEMS){
    const owned = S.inventory.some(x=>x.id===it.id && it.type==="upgrade");
    const disabled = owned;
    const div = document.createElement("div");
    div.className = "shopItem";
    div.innerHTML = `
      <div class="shopName">${it.name} ${owned ? `<span class="pill">Owned</span>` : ""}</div>
      <div class="shopDesc">${it.desc}</div>
      <div class="shopBottom">
        <div class="price">${fmtMoney(it.price)}</div>
        <button class="btn ${it.type==="consumable" ? "" : "primary"}" data-buy="${it.id}" ${disabled ? "disabled" : ""}>
          ${disabled ? "✓" : "Pirkti"}
        </button>
      </div>
    `;
    elShop.appendChild(div);
  }

  $$("[data-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-buy");
      buyItem(id);
    });
  });
}

function renderInvestments(){
  elInvestGrid.innerHTML = "";
  for(const inv of INVESTMENTS){
    const card = document.createElement("div");
    card.className = "investCard";
    card.innerHTML = `
      <div class="investTitle">📈 ${inv.name}</div>
      <div class="investDesc">${inv.desc}</div>
      <div class="investActions">
        <button class="btn primary" data-invest="${inv.id}">Investuoti</button>
      </div>
    `;
    elInvestGrid.appendChild(card);
  }

  $$("[data-invest]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      invest(btn.getAttribute("data-invest"));
    });
  });
}

function renderAchievements(){
  elAch.innerHTML = "";
  for(const a of ACHIEVEMENTS){
    const unlocked = S.achievements.includes(a.id);
    const div = document.createElement("div");
    div.className = "ach";
    div.innerHTML = `
      <div>
        <div class="achName">${unlocked ? "🏆" : "🔒"} ${a.name}</div>
        <div class="achDesc">${a.desc}</div>
      </div>
      <div class="achState">${unlocked ? "UNLOCKED" : "LOCKED"}</div>
    `;
    elAch.appendChild(div);
  }
}

function renderNews(){
  if(S.news.length === 0){
    elNews.innerHTML = "Kol kas ramu. Bet miestelis niekada nemiega...";
    return;
  }
  elNews.innerHTML = S.news.slice(-8).reverse().map(n=>`• ${n}`).join("<br>");
}

function renderAll(){
  renderStats();
  renderInventory();
  renderStory();
  renderMissions();
  renderShop();
  renderInvestments();
  renderAchievements();
  renderNews();
}

/* ---------------------------
   GAME ACTIONS
----------------------------*/
function addMoney(amount){
  S.money += amount;
  if(amount > 0) S.stats.totalEarned += amount;
}

function buyItem(id){
  const it = ITEMS.find(x=>x.id===id);
  if(!it) return;

  // if upgrade already owned
  if(it.type==="upgrade" && S.inventory.some(x=>x.id===id)) {
    logWarn(`Jau turi: <b>${it.name}</b>.`);
    return;
  }

  if(S.money < it.price){
    logBad(`Trūksta pinigų. Reikia ${fmtMoney(it.price)}.`);
    return;
  }

  S.money -= it.price;
  S.inventory.push({ ...it });

  logGood(`Nusipirkai: <b>${it.name}</b> už ${fmtMoney(it.price)}.`);

  if(it.type === "upgrade"){
    applyUpgrade(it);
  }

  checkAll();
  renderAll();
  save();
}

function applyUpgrade(it){
  if(it.effect){
    if(it.effect.workMult) S.upgrades.workMult += it.effect.workMult;
    if(it.effect.dailySkill) S.upgrades.dailySkill += it.effect.dailySkill;
    if(it.effect.heatResist) S.upgrades.heatResist += it.effect.heatResist;
    if(it.effect.heatDecay) S.upgrades.heatDecay += it.effect.heatDecay;
    if(it.effect.rep) S.rep += it.effect.rep;
  }
}

function useItem(id){
  const idx = S.inventory.findIndex(x=>x.id===id);
  if(idx === -1) return;
  const it = S.inventory[idx];
  if(it.type !== "consumable") return;

  it.use?.(S);
  S.inventory.splice(idx, 1);

  checkAll();
  renderAll();
  save();
}

function doWork(){
  if(S.energy < 10){
    logBad("Per mažai energijos. Pailsėk.");
    return;
  }

  const pay = workPay();
  const skillGain = rnd(1, 2) + (chance(0.15) ? 1 : 0);

  addMoney(pay);
  S.skill += skillGain;
  S.energy = clamp(S.energy - rnd(12, 22), 0, S.maxEnergy);
  S.rep += chance(0.25) ? 1 : 0;

  S.stats.totalWorked++;
  logGood(`Dirbai. Uždirbai <b>${fmtMoney(pay)}</b>. Skill +${skillGain}.`);

  // random small event
  if(chance(0.18)){
    const bonus = rnd(10, 70);
    addMoney(bonus);
    logGood(`Klientas paliko arbatpinigių: +${fmtMoney(bonus)}.`);
  }

  checkAll();
  renderAll();
  save();
}

function rest(){
  const gain = rnd(25, 45);
  S.energy = clamp(S.energy + gain, 0, S.maxEnergy);
  // small heat decay
  S.heat = clamp(S.heat - rnd(2, 5), 0, 100);
  logInfo(`Pailsėjai. Energija +${gain}. Heat truputį sumažėjo.`);
  checkAll();
  renderAll();
  save();
}

function nextDay(){
  S.day++;

  // energy regen
  S.energy = clamp(S.energy + rnd(35, 55), 0, S.maxEnergy);

  // daily skill from upgrades
  if(S.upgrades.dailySkill > 0){
    S.skill += S.upgrades.dailySkill;
    logGood(`Tavo upgrade'ai padėjo: Skill +${S.upgrades.dailySkill} (dienos bonus).`);
  }

  // bank interest
  const r = interestRate();
  if(S.bank > 0){
    const inc = Math.floor(S.bank * r);
    S.bank += inc;
    if(inc > 0) logGood(`Banko palūkanos: +${fmtMoney(inc)}.`);
  }

  // heat decay
  let decay = rnd(3, 7);
  decay += Math.floor(S.heat * S.upgrades.heatDecay);
  S.heat = clamp(S.heat - decay, 0, 100);

  // random town news
  townNews();

  // police check
  policeCheck();

  logInfo(`🌙 Nauja diena. Diena <b>${S.day}</b>.`);
  checkAll();
  renderAll();
  save();
}

function deposit(){
  const amt = parseInt(elBankAmount.value || "0", 10);
  if(!amt || amt <= 0) return;
  if(amt > S.money){
    logBad("Neturi tiek pinigų.");
    return;
  }
  S.money -= amt;
  S.bank += amt;
  logGood(`Įnešei į banką: <b>${fmtMoney(amt)}</b>.`);
  elBankAmount.value = "";
  checkAll();
  renderAll();
  save();
}

function withdraw(){
  const amt = parseInt(elBankAmount.value || "0", 10);
  if(!amt || amt <= 0) return;
  if(amt > S.bank){
    logBad("Banke nėra tiek pinigų.");
    return;
  }
  S.bank -= amt;
  S.money += amt;
  logInfo(`Išsiėmei iš banko: <b>${fmtMoney(amt)}</b>.`);
  elBankAmount.value = "";
  checkAll();
  renderAll();
  save();
}

function invest(id){
  const inv = INVESTMENTS.find(x=>x.id===id);
  if(!inv) return;

  modal("📈 Investicija", `
    Pasirink sumą investuoti į <b>${inv.name}</b>.<br>
    <div class="hint">Rizika: ${inv.risk}</div>
    <input class="input" id="investAmount" type="number" placeholder="Suma..." style="width:220px; margin-top:10px;" />
  `, [
    {
      label:"Investuoti",
      cls:"primary",
      onClick: ()=>{
        const a = parseInt($("#investAmount").value || "0", 10);
        if(!a || a <= 0) return;
        if(a > S.money){
          logBad("Neturi tiek pinigų investicijai.");
          return;
        }
        closeModal();
        resolveInvestment(inv, a);
      }
    },
    { label:"Atšaukti", cls:"ghost", onClick: closeModal }
  ]);
}

function resolveInvestment(inv, amount){
  S.money -= amount;
  S.stats.totalInvested += amount;

  // roll result
  const res = inv.min + Math.random() * (inv.max - inv.min);
  const out = Math.floor(amount * (1 + res));
  const diff = out - amount;

  if(diff >= 0){
    S.money += out;
    S.rep += rnd(1, 3);
    logGood(`Investicija į <b>${inv.name}</b> pavyko! Pelnas: <b>${fmtMoney(diff)}</b>.`);
  }else{
    S.money += out;
    S.stats.totalLost += Math.abs(diff);
    logBad(`Investicija į <b>${inv.name}</b> nepasisekė... Nuostolis: <b>${fmtMoney(Math.abs(diff))}</b>.`);
  }

  // skill grows from investing
  if(chance(0.5)){
    S.skill += 1;
    logInfo("Išmokai pamoką: Skill +1.");
  }

  checkAll();
  renderAll();
  save();
}

function streetDeal(){
  if(S.energy < 8){
    logBad("Per mažai energijos. Pailsėk.");
    return;
  }

  const base = rnd(25, 85) + Math.floor(S.rep/4);
  const resist = S.upgrades.heatResist;
  const heatGain = Math.max(1, Math.floor(rnd(4, 9) * (1 - resist)));

  addMoney(base);
  S.energy = clamp(S.energy - rnd(8, 15), 0, S.maxEnergy);
  S.heat = clamp(S.heat + heatGain, 0, 100);

  S.stats.totalStreet++;
  logWarn(`Gatvės deal'as: +<b>${fmtMoney(base)}</b>. Heat +${heatGain}%.`);

  if(chance(0.12)){
    S.rep += 2;
    logGood("Gatvė pastebėjo tave. REP +2.");
  }

  policeCheck();
  checkAll();
  renderAll();
  save();
}

function bigTrick(){
  if(S.energy < 15){
    logBad("Per mažai energijos. Poilsis būtinas.");
    return;
  }

  const resist = S.upgrades.heatResist;
  const heatGain = Math.max(2, Math.floor(rnd(12, 25) * (1 - resist)));

  S.energy = clamp(S.energy - rnd(14, 24), 0, S.maxEnergy);
  S.heat = clamp(S.heat + heatGain, 0, 100);

  // big roll
  if(chance(0.55)){
    const gain = rnd(200, 900) + Math.floor(S.skill*4);
    addMoney(gain);
    S.rep += rnd(2, 5);
    logWarn(`🧨 Didysis triukas pavyko! +<b>${fmtMoney(gain)}</b>. REP +${rnd(2,5)}. Heat +${heatGain}%.`);
  }else{
    const loss = rnd(80, 320);
    S.money = Math.max(0, S.money - loss);
    S.stats.totalLost += loss;
    logBad(`Triukas nepavyko... Praradai <b>${fmtMoney(loss)}</b>. Heat +${heatGain}%.`);
  }

  policeCheck();
  checkAll();
  renderAll();
  save();
}

function bribe(){
  const cost = Math.floor(150 + S.heat*8);
  if(S.money < cost){
    logBad(`Susitarimui reikia ${fmtMoney(cost)}.`);
    return;
  }
  S.money -= cost;
  const reduce = rnd(18, 35);
  S.heat = clamp(S.heat - reduce, 0, 100);
  logInfo(`„Susitarei“. Sumokėjai ${fmtMoney(cost)}. Heat -${reduce}%.`);
  checkAll();
  renderAll();
  save();
}

/* ---------------------------
   POLICE / EVENTS
----------------------------*/
function policeCheck(){
  const r = policeRisk();
  if(!chance(r)) return;

  // caught event
  const fine = Math.floor(120 + S.heat*12);
  const lose = Math.min(S.money, fine);

  S.money -= lose;
  S.rep = Math.max(0, S.rep - rnd(2, 6));
  S.heat = clamp(S.heat - rnd(12, 28), 0, 100);

  logBad(`🚔 Policija sustabdė! Bauda: <b>${fmtMoney(lose)}</b>. REP sumažėjo.`);
  pushNews(`🚔 Policija sulaikė kelis įtariamuosius. Miestelis šneka...`);
}

function townNews(){
  const pool = [
    "📰 Miestelyje atsidarė nauja parduotuvė. Visi perka „protingus“ daiktus.",
    "📰 Bankas praneša: „Taupymas — naujas prabangos ženklas.“",
    "📰 Seniūnas giria jaunimą, kuris dirba ir kelia reputaciją.",
    "📰 Gatvėje girdėti šnabždesiai apie „didįjį triuką“...",
    "📰 Miesto centre atsirado naujų darbų pasiūlymų.",
    "📰 Policija sustiprino patruliavimą. Heat veiksmai pavojingesni.",
    "📰 Vienas turčius prarado pinigus per investicijas. Pamoka visiems.",
  ];

  // chance of special news
  if(chance(0.12)){
    const boom = chance(0.5);
    if(boom){
      pushNews("📈 Investicijų bumas! Šiandien investicijos dažniau duoda pelną.");
      S.newsBoost = { type:"invest_good", days: 1 };
    }else{
      pushNews("📉 Rinka dreba... investicijos šiandien pavojingesnės.");
      S.newsBoost = { type:"invest_bad", days: 1 };
    }
    return;
  }

  pushNews(pool[rnd(0, pool.length-1)]);
}

function pushNews(line){
  S.news.push(line);
  if(S.news.length > 40) S.news.shift();
}

/* ---------------------------
   MISSIONS / ACH
----------------------------*/
function claimMission(id){
  const m = MISSIONS.find(x=>x.id===id);
  if(!m) return;
  if(S.completedMissions.includes(id)) return;
  if(!m.check(S)){
    logWarn("Misija dar neįvykdyta.");
    return;
  }

  S.completedMissions.push(id);
  addMoney(m.reward.money);
  S.rep += m.reward.rep;
  S.skill += m.reward.skill;

  logGood(`🎁 Misija įvykdyta: <b>${m.title}</b>. Reward gautas!`);

  // story nudge
  if(chance(0.5)){
    S.storyIndex = clamp(S.storyIndex + 1, 0, STORY.length-1);
    logInfo("Istorija pajudėjo į priekį...");
  }

  checkAll();
  renderAll();
  save();
}

function checkAchievements(){
  for(const a of ACHIEVEMENTS){
    if(S.achievements.includes(a.id)) continue;
    if(a.cond(S)){
      S.achievements.push(a.id);
      logGood(`🏆 Achievement unlocked: <b>${a.name}</b>!`);
      modal("🏆 Achievement!", `<b>${a.name}</b><br><br>${a.desc}`, [
        { label:"Nice", cls:"primary", onClick: closeModal }
      ]);
    }
  }
}

function checkStoryUnlock(){
  // advance story if possible
  let moved = false;
  while(S.storyIndex < STORY.length-1 && STORY[S.storyIndex+1].unlock(S)){
    S.storyIndex++;
    moved = true;
  }
  if(moved){
    logInfo("📜 Atrakinta nauja istorijos dalis!");
  }
}

function checkAll(){
  checkStoryUnlock();
  checkAchievements();
}

/* ---------------------------
   MODAL
----------------------------*/
const backdrop = $("#modalBackdrop");
const modalTitle = $("#modalTitle");
const modalBody = $("#modalBody");
const modalActions = $("#modalActions");

function modal(title, bodyHtml, actions=[]){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalActions.innerHTML = "";

  for(const a of actions){
    const b = document.createElement("button");
    b.className = "btn " + (a.cls || "");
    b.textContent = a.label;
    b.addEventListener("click", a.onClick);
    modalActions.appendChild(b);
  }

  backdrop.classList.remove("hidden");
}
function closeModal(){
  backdrop.classList.add("hidden");
}

/* ---------------------------
   TABS
----------------------------*/
$$(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    $$(".tab").forEach(x=>x.classList.remove("active"));
    $$(".tabBody").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    $("#tab-"+t.dataset.tab).classList.add("active");
  });
});

/* ---------------------------
   STORY BUTTONS
----------------------------*/
$("#btnStoryNext").addEventListener("click", ()=>{
  if(S.storyIndex < STORY.length-1 && STORY[S.storyIndex+1].unlock(S)){
    S.storyIndex++;
    logInfo("📜 Tęsi istoriją...");
  }else{
    logWarn("Kitos istorijos dalies dar neatrakinai. Vykdyk misijas / uždirbk.");
  }
  renderAll();
  save();
});

$("#btnStorySkip").addEventListener("click", ()=>{
  S.storyIndex = clamp(S.storyIndex + 1, 0, STORY.length-1);
  logWarn("⏩ Prasukai istoriją.");
  renderAll();
  save();
});

/* ---------------------------
   BUTTONS
----------------------------*/
$("#btnWork").addEventListener("click", doWork);
$("#btnRest").addEventListener("click", rest);
$("#btnNextDay").addEventListener("click", nextDay);

$("#btnDeposit").addEventListener("click", deposit);
$("#btnWithdraw").addEventListener("click", withdraw);

$("#btnStreetDeal").addEventListener("click", streetDeal);
$("#btnBigTrick").addEventListener("click", bigTrick);
$("#btnBribe").addEventListener("click", bribe);

$("#btnSave").addEventListener("click", ()=>{
  save();
  logInfo("💾 Išsaugota.");
});
$("#btnReset").addEventListener("click", ()=>{
  modal("🧨 Reset", `
    Ar tikrai nori ištrinti progresą?<br><br>
    <span class="pill">Tai ištrins autosave.</span>
  `, [
    { label:"Taip, reset", cls:"danger", onClick: ()=>{ closeModal(); hardReset(); } },
    { label:"Ne", cls:"ghost", onClick: closeModal }
  ]);
});
$("#btnHelp").addEventListener("click", ()=>{
  modal("❔ Pagalba", `
    <b>Kaip žaisti:</b><br><br>
    • <b>Dirbti</b> — saugus uždarbis + skill.<br>
    • <b>Bankas</b> — palūkanos kas dieną.<br>
    • <b>Investicijos</b> — rizika, bet gali labai išauginti kapitalą.<br>
    • <b>Gatvė</b> — greiti pinigai, bet kyla <b>Heat</b> ir gali pagauti policija.<br>
    • <b>Misijos</b> — claim'ink rewardus, atrakinsi istoriją.<br><br>
    <span class="pill">Pro tip: nešvaistyk energijos — planuok.</span>
  `, [
    { label:"OK", cls:"primary", onClick: closeModal }
  ]);
});

$("#modalClose").addEventListener("click", closeModal);
backdrop.addEventListener("click", (e)=>{
  if(e.target === backdrop) closeModal();
});

/* ---------------------------
   INIT
----------------------------*/
(function init(){
  logInfo("Sveikas atvykęs į <b>PINIGĖNAI</b>.");
  logInfo("Patarimas: pradėk nuo darbų, tada bankas, tada investicijos.");
  renderAll();
  save();
})();
