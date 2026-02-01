
// =============================
// 부재료 그룹 매핑 (렌더 전용)
// =============================
function MAT_GROUP_NAME(mat){
  if(mat === "점토" || mat === "모래" || mat === "흙") return "정수";
  if(mat === "익히지 않은 새우") return "핵";
  if(mat === "해초") return "에센스";
  if(mat === "켈프") return "결정";
  if(mat === "불우렁쉥이") return "엘릭서";
  if(mat === "말린 켈프") return "영약";
  return null;
}


// ===== Fish tier order helpers (UI only) =====
const __FISH_BASE_ORDER = [
  "굴","소라","문어","미역","성게",
  "익히지 않은 새우","익히지 않은 도미","익히지 않은 청어",
  "금붕어","농어"
];
function __fishStarCount(label){
  return (String(label||"").match(/★/g) || []).length;
}
function __fishBaseName(label){
  return String(label||"").replace(/★+/g,"").replace(/\s+/g," ").trim();
}
function __fishBaseRank(label){
  const b = __fishBaseName(label);
  const idx = __FISH_BASE_ORDER.indexOf(b);
  return idx >= 0 ? idx : 999;
}
function __fishOrderedIndices(){
  // returns indices of FISH_ROWS in desired order: tier1 bases, tier2 bases, tier3 bases
  const idxs = FISH_ROWS.map((_,i)=>i);
  idxs.sort((a,b)=>{
    const ta = __fishStarCount(FISH_ROWS[a]);
    const tb = __fishStarCount(FISH_ROWS[b]);
    if(ta !== tb) return ta - tb; // 1,2,3
    const ra = __fishBaseRank(FISH_ROWS[a]);
    const rb = __fishBaseRank(FISH_ROWS[b]);
    if(ra !== rb) return ra - rb;
    return a - b;
  });
  return idxs;
}
function __tierLabel(t){ return t===0 ? "0티어" : t===1 ? "1티어" : t===2 ? "2티어" : "3티어"; }


// ================================
// TAB1 NULL GUARD (legacy safety)
// ================================
function _safeVal(id){
  const el = document.getElementById(id);
  return el ? Math.max(0, Math.floor(Number(el.value||0))) : 0;
}

// ================================
// FIX: Quantity formatter (from app참고.js)
// Always return HTML with set/ea units
// ================================
function fmtSet64(n) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  const set = Math.floor(v / 64);
  const rem = v % 64;
  if (set <= 0)
    return `<span class="qty-num">${v}</span><span class="qty-unit">개</span>`;
  if (rem <= 0)
    return `<span class="qty-num">${set}</span><span class="qty-unit">세트</span>`;
  return `<span class="qty-num">${set}</span><span class="qty-unit">세트</span> ` +
         `<span class="qty-num">${rem}</span><span class="qty-unit">개</span>`;
}
// ================================
// END FIX
// ================================


// ================================
// THEME (merged from base / index)
// ================================
const THEME_KEY = "DDTYCOON_THEME";

function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || "beige";
  applyTheme(saved);

  const sw = document.getElementById("themeSwitch");
  if(!sw) return;

  sw.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "beige";
    const next = (cur === "blue") ? "beige" : "blue";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

document.addEventListener("DOMContentLoaded", initTheme);

// ================================
// END THEME
// ================================


// ================================
// SET/EA INPUT HELPERS (global)
// ================================
const SET_EA_SIZE = 64;

function _eaToSetEa(v){
  v = Math.max(0, Math.floor(Number(v||0)));
  return [Math.floor(v/SET_EA_SIZE), v%SET_EA_SIZE];
}
function _setEaToEa(setVal, eaVal){
  const s = Math.max(0, Math.floor(Number(setVal||0)));
  const e = Math.max(0, Math.floor(Number(eaVal||0)));
  return s*SET_EA_SIZE + e;
}
function _readSetEa(prefix, i){
  const s = document.getElementById(`${prefix}_set_${i}`);
  const e = document.getElementById(`${prefix}_ea_${i}`);
  return _setEaToEa(s?.value, e?.value);
}
function _writeSetEa(prefix, i, ea){
  const [s, r] = _eaToSetEa(ea);
  const sEl = document.getElementById(`${prefix}_set_${i}`);
  const eEl = document.getElementById(`${prefix}_ea_${i}`);
  if(sEl) sEl.value = String(s);
  if(eEl) eEl.value = String(r);
}





function setButtonLoading(btn, isLoading, loadingText="계산 중…"){
  if(!btn) return;

  if(isLoading){
    if(!btn.dataset.label){
      btn.dataset.label = btn.textContent.trim();
    }
    btn.classList.add("loading");
    btn.innerHTML = `<span class="spinner"></span>${loadingText}`;
    btn.disabled = true;
  }else{
    btn.classList.remove("loading");
    btn.disabled = false;
    btn.textContent = btn.dataset.label || btn.textContent;
  }
}

// ================================
// Trade (무역) - 선택 입력
// - 멤버십(슬롯수)만 선택해도 UI는 자동 조절
// - 슬롯 정보(요구 수량/퍼센트)가 "하나라도" 입력된 경우에만 무역 적용
// - 품목은 입력하지 않고, 계산 결과(제작량)에서 자동 추천
// ================================
const TRADE_KEY = "DDTYCOON_TRADE_CFG_V1";

function tradeSlotsOpenByMember(member){
  switch(String(member||"basic")){
    case "pro": return 3;
    case "elite": return 4;
    case "prestige": return 5;
    default: return 2; // basic
  }
}

function loadTradeCfg(){
  try{
    const raw = localStorage.getItem(TRADE_KEY);
    if(!raw) return {member:"basic", slots:[]};
    const o = JSON.parse(raw);
    return {
      member: o.member || "basic",
      slots: Array.isArray(o.slots) ? o.slots : []
    };
  }catch(e){
    return {member:"basic", slots:[]};
  }
}

function saveTradeCfg(cfg){
  try{ localStorage.setItem(TRADE_KEY, JSON.stringify(cfg||{})); }catch(e){}
}

function getTradeEls(){
  return {
    box: document.getElementById("tradeBox"),
    member: document.getElementById("tradeMember"),
    reco: document.getElementById("tradeReco"),
    btnClear: document.getElementById("btnTradeClear"),
    req: (i)=>document.getElementById(`tradeReq${i}`),
    pct: (i)=>document.getElementById(`tradePct${i}`),
    row: (i)=>document.querySelector(`tr.tradeRow[data-slot="${i}"]`),
    outBonus: document.getElementById("outTradeBonus"),
    outTotal: document.getElementById("outRevenueTrade"),
    bonusA: document.getElementById("tradeBonusA"),
    totalA: document.getElementById("revSumTradeA"),
  };
}

function applyTradeCfgToUI(cfg){
  const el = getTradeEls();
  if(!el.member) return;
  el.member.value = cfg.member || "basic";
  for(let i=1;i<=5;i++){
    const s = (cfg.slots||[]).find(x=>Number(x.slot)===i) || {};
    if(el.req(i)) el.req(i).value = (s.req ?? "");
    if(el.pct(i)) el.pct(i).value = (s.pct ?? "");
  }
  syncTradeRowsVisibility();
}

function readTradeCfgFromUI(){
  const el = getTradeEls();
  const member = el.member?.value || "basic";
  const slotsOpen = tradeSlotsOpenByMember(member);
  const slots = [];
  for(let i=1;i<=5;i++){
    const req = el.req(i) ? Number(el.req(i).value||0) : 0;
    const pct = el.pct(i) ? Number(el.pct(i).value||0) : 0;
    // 저장은 모두 저장(빈칸도), 적용은 활성 슬롯만
    if(req || pct){
      slots.push({slot:i, req: req ? Math.max(1, Math.min(30, Math.floor(req))) : "", pct: pct ? Math.max(101, Math.min(120, Math.floor(pct))) : ""});
    }else{
      slots.push({slot:i, req:"", pct:""});
    }
  }
  const cfg = {member, slotsOpen, slots};
  saveTradeCfg(cfg);
  return cfg;
}

function syncTradeRowsVisibility(){
  const el = getTradeEls();
  if(!el.member) return;
  const slotsOpen = tradeSlotsOpenByMember(el.member.value);
  for(let i=1;i<=5;i++){
    const r = el.row(i);
    if(!r) continue;
    if(i<=slotsOpen) r.classList.remove("hidden");
    else r.classList.add("hidden");
  }
}

function getActiveTradeSlots(){
  const cfg = readTradeCfgFromUI();
  const slotsOpen = cfg.slotsOpen || tradeSlotsOpenByMember(cfg.member);
  const active = [];
  for(let i=1;i<=slotsOpen;i++){
    const s = (cfg.slots||[]).find(x=>Number(x.slot)===i) || {};
    const req = Number(s.req||0);
    const pct = Number(s.pct||0);
    if(req>=1 && req<=30 && pct>=101 && pct<=120){
      active.push({slot:i, req, pct});
    }
  }
  return {member: cfg.member, slotsOpen, slots: active, anyActive: active.length>0};
}

function computeTradePlan(qtyArr, priceArr, activeSlots){
  // qtyArr: 제작량(+재고 반영된 수량), priceArr: 최종가(정수), activeSlots: [{slot,req,pct}]
  const N = PRODUCTS.length;

  // 초기 잔여 수량
  const remaining0 = qtyArr.map(v => Math.max(0, Math.floor(Number(v || 0))));

  // 슬롯 정렬: req 큰 순 → pct 큰 순 → slot 번호
  const slots = [...activeSlots].sort(
    (a,b)=> (b.req-a.req) || (b.pct-a.pct) || (a.slot-b.slot)
  );

  const unitPrice = priceArr.map(v => Math.round(Number(v || 0)));

  // 슬롯별 후보(아이템 idx + bonus 미리 계산)
  const candidates = slots.map(s=>{
    const list = [];
    for(let i=0;i<N;i++){
      const unit = unitPrice[i];
      const bonus = Math.round(s.req * unit * (s.pct/100 - 1));
      list.push({
        i,
        name: PRODUCTS[i].name,
        tier: getTierFromName(PRODUCTS[i].name),
        bonus
      });
    }
    // 슬롯 내부는 보너스 큰 순 우선
    list.sort((a,b)=>
      (b.bonus-a.bonus) ||
      (b.tier-a.tier) ||
      (a.i-b.i)
    );
    return list;
  });

  // 메모이제이션
  const memo = new Map();

  // 남은 슬롯에서 얻을 수 있는 이론상 최대 bonus 상한 (가지치기용)
  const maxBonusPerSlot = candidates.map(c => c[0]?.bonus || 0);
  const suffixUpper = Array(maxBonusPerSlot.length+1).fill(0);
  for(let k=maxBonusPerSlot.length-1;k>=0;k--){
    suffixUpper[k] = suffixUpper[k+1] + maxBonusPerSlot[k];
  }

  // remaining 벡터를 key로 만들 때 캡(불필요한 상태 폭증 방지)
  const maxReqSum = slots.reduce((s,x)=> s + x.req, 0);
  const keyOf = (k, rem)=>{
    const capped = rem.map(v => Math.min(v, maxReqSum));
    return k + "|" + capped.join(",");
  };

  function dp(k, remaining){
    const key = keyOf(k, remaining);
    if(memo.has(key)) return memo.get(key);

    // 끝까지 왔으면 보너스 0
    if(k >= slots.length){
      const res = { bonus: 0, plan: [] };
      memo.set(key, res);
      return res;
    }

    // 가지치기: 이론상 최대치로도 현재 최선 못 넘으면 컷
    let best = { bonus: -Infinity, plan: [] };
    const upper = suffixUpper[k];
    // (메모 단계에서는 글로벌 best를 안 쓰므로, 여기선 단순 DP)

    const s = slots[k];

    let anyOk = false;

    for(const c of candidates[k]){
      const idx = c.i;
      if(remaining[idx] < s.req) continue;
      anyOk = true;

      // 수량 소비
      remaining[idx] -= s.req;

      const next = dp(k+1, remaining);

      const totalBonus = c.bonus + next.bonus;
      if(totalBonus > best.bonus){
        best = {
          bonus: totalBonus,
          plan: [
            {
              slot: s.slot,
              ok: true,
              req: s.req,
              pct: s.pct,
              name: c.name,
              tier: c.tier,
              used: s.req,
              bonus: c.bonus,
              reason:
                `슬롯 ${s.slot}: ${s.pct}% / 요구 ${s.req}개. ` +
                `총 무역 보너스 최대 기준으로 "${c.name}" 선택.`
            },
            ...next.plan
          ]
        };
      }

      // 되돌리기
      remaining[idx] += s.req;
    }

    // 이 슬롯을 채울 수 있는 품목이 하나도 없을 때
    if(!anyOk){
      const next = dp(k+1, remaining);
      best = {
        bonus: next.bonus,
        plan: [
          {
            slot: s.slot,
            ok: false,
            req: s.req,
            pct: s.pct,
            name: null,
            tier: null,
            used: 0,
            bonus: 0,
            reason: `요구 ${s.req}개를 충족하는 품목이 없습니다. (현재 수량 기준)`
          },
          ...next.plan
        ]
      };
    }

    memo.set(key, best);
    return best;
  }

  const result = dp(0, remaining0.slice());

  // UI 표시용: 슬롯 번호 순 정렬
  result.plan.sort((a,b)=> a.slot - b.slot);

  return {
    bonusSum: Math.max(0, result.bonus),
    plan: result.plan
  };
}

function renderTradeReco(output, state, baseRevenue, qtyArr, priceArr){
  const el = getTradeEls();
  if(!el.reco) return;

  if(!output){
    el.reco.textContent = "무역 슬롯 정보를 입력하면 여기서 추천을 표시합니다.";
    return;
  }

  if(!state.anyActive){
    el.reco.textContent = "무역 미적용(슬롯 정보 미입력).";
    return;
  }

  const {bonusSum, plan} = output;

  // UI 표시용: 슬롯 번호 순서
  const sortedPlan = [...plan].sort((a,b)=> a.slot - b.slot);

  const lines = [];
  for(const p of sortedPlan){
    if(p.ok){
      lines.push(
        `<div class="tradeRecoItem">
          <div class="tradeRecoLeft">
            <!-- ★★★ 제거 -->
            <span>${productLabel(p.name)}</span>
            <span class="muted">${p.used}개 · ${p.pct}%</span>
            <span class="tradeTip" title="${escapeHtml(p.reason || '')}">ⓘ</span>
          </div>
          <div class="mono pos">+${fmtGold(p.bonus)}</div>
        </div>`
      );
    }else{
      lines.push(
        `<div class="tradeRecoItem">
          <div class="tradeRecoLeft">
            <span class="muted">📦 ${p.slot}</span>
            <span class="muted">부족 (요구 ${p.req}개)</span>
            <span class="tradeTip" title="${escapeHtml(p.reason || '')}">ⓘ</span>
          </div>
          <div class="mono muted">+0 G</div>
        </div>`
      );
    }
  }

  el.reco.innerHTML =
    `<div class="muted" style="margin-bottom:6px">
      멤버십: ${memberLabel(state.member)} · 슬롯 ${state.slotsOpen}개
    </div>` +
    lines.join("") +
    `<div style="margin-top:8px" class="muted">
      무역 보너스 합계: <b class="pos">${fmtGold(bonusSum)}</b>
    </div>`;

  // 요약 표기 갱신은 별도 함수에서
}

function memberLabel(member){
  switch(String(member||"basic")){
    case "pro": return "🔷";
    case "elite": return "🌟";
    case "prestige": return "💜";
    default: return "🍎";
  }
}

// 간단 HTML 이스케이프(tooltip/innerHTML 안전)
function escapeHtml(s){
  return String(s??"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function updateTradeForContext(context){
  // context: {kind:"expected"|"actual", baseRevenue, qtyArr, priceArr}
  const el = getTradeEls();
  const state = getActiveTradeSlots();

  if(!context || !context.qtyArr || !context.priceArr){
    renderTradeReco(null, state, 0, [], []);
    // totals to base
    if(el.outBonus) el.outBonus.textContent = fmtGold(0);
    if(el.outTotal) el.outTotal.textContent = fmtGold(0);
    if(el.bonusA) el.bonusA.textContent = fmtGold(0);
    if(el.totalA) el.totalA.textContent = fmtGold(0);
    return;
  }

  if(!state.anyActive){
    // 무역 미적용
    renderTradeReco({bonusSum:0, plan:[]}, {...state, anyActive:false}, context.baseRevenue, context.qtyArr, context.priceArr);

    const total = context.baseRevenue;
    if(context.kind==="expected"){
      if(el.outBonus) el.outBonus.textContent = fmtGold(0);
      if(el.outTotal) el.outTotal.textContent = fmtGold(total);
    }else{
      if(el.bonusA) el.bonusA.textContent = fmtGold(0);
      if(el.totalA) el.totalA.textContent = fmtGold(total);
    }
    return;
  }

// ✅ 무역 계산용 수량 = 제작 수량 + 완성품 재고
const qtyForTrade = context.qtyArr.map((v, i) => {
  return Math.max(
    0,
    Math.floor(v || 0) + getMidInvQty(PRODUCTS[i].name)
  );
});


const output = computeTradePlan(
  qtyForTrade,
  context.priceArr,
  state.slots
);

const total = context.baseRevenue + output.bonusSum;

renderTradeReco(output, state, context.baseRevenue, context.qtyArr, context.priceArr);

if(context.kind==="expected"){
  if(el.outBonus) el.outBonus.textContent = fmtGold(output.bonusSum);
  if(el.outTotal) el.outTotal.textContent = fmtGold(total);
}else{
  if(el.bonusA) el.bonusA.textContent = fmtGold(output.bonusSum);
  if(el.totalA) el.totalA.textContent = fmtGold(total);
}
}


function getActiveTabKey(){
  if(tabActual && tabActual.classList.contains("active")) return "actual";
  if(tabRecipe && tabRecipe.classList.contains("active")) return "recipe";
  return "expected";
}

function updateTradeForActiveTab(){
  const key = getActiveTabKey();

  // ✅ 레시피 탭에서는 무역 카드 자체를 숨김 (tradeBox 위치와 무관하게 동작)
  const tb = document.getElementById("tradeBox");
  if(tb){
    tb.style.display = (key === "recipe") ? "none" : "";
  }

if(key === "actual"){
  if(window.__lastActualTradeCtx) updateTradeForContext(window.__lastActualTradeCtx);

 

}else if(key === "expected"){
  if(window.__lastExpectedTradeCtx) updateTradeForContext(window.__lastExpectedTradeCtx);
}else{
  // recipe: 추천 숨기기 대신 메시지
  const el = getTradeEls();
  if(el.reco) el.reco.textContent = "레시피 탭에서는 무역 추천이 표시되지 않습니다.";
}

}




// ================================
// 64개 단위 세트 표기
// - n이 0이면 "0개"
// - 64 이상이면 "x세트 y개" (y=0이면 "+ y개" 생략)
// ================================
function fmtSet64(n) {
  const v = Math.max(0, Math.floor(Number(n || 0)));
  const set = Math.floor(v / 64);
  const rem = v % 64;
  if (set <= 0) return `<span class="qty-num">${v}</span><span class="qty-unit">개</span>`;
  if (rem <= 0) return `<span class="qty-num">${set}</span><span class="qty-unit">세트</span>`;
  return `<span class="qty-num">${set}</span><span class="qty-unit">세트</span> ` +
         `<span class="qty-num">${rem}</span><span class="qty-unit">개</span>`;
}


// ================================
// 제작량 y(길이 9) → 어패류 소모량 need(길이 15) 계산
// need[i] = Σ_j A[i][j] * y[j]
// ================================
function calcFishNeed(y) {
  const A = buildFishMatrix(); // 15x9
  const rows = 15;
  const cols = 9;

  const yy = Array.isArray(y) ? y : [];
  const need = Array(rows).fill(0);

  for (let i = 0; i < rows; i++) {
    let s = 0;
    for (let j = 0; j < cols; j++) {
      const aij = Number(A[i][j] || 0);
      const yj  = Number(yy[j] || 0);
      s += aij * yj;
    }
    need[i] = s;
  }

  return need;
}

// =========================
// 어패류 판별 유틸 (반드시 calcMatNeed보다 위!)
// =========================
const FISH_BASE = [
  "굴", "소라", "문어", "미역", "성게",
  "익히지 않은 새우", "익히지 않은 도미", "익히지 않은 청어",
  "금붕어", "농어"
];

const STAR_LV = ["★", "★★", "★★★"];

const FISH_SET = new Set(
  FISH_BASE.flatMap(b => [
    ...STAR_LV.map(s => `${b} ${s}`),
    ...STAR_LV.map(s => `${b}${s}`)
  ])
);

function isFishItem(name){
  return FISH_SET.has(String(name || "").trim());
}

// ================================
// 중간재(정수/에센스/엘릭서 등) 재고 → 어패류 절약분(= supply에 더해줄 값) 계산
// - "이미 만들어진 중간재"는 그걸 만들 때 썼을 어패류를 아낀 것으로 간주
// - 결과: { "굴 ★": n, "소라 ★★": n, ... } 형태
// ================================
const MID_ITEMS = [
  // =========================
  // 1성 정수 ★
  // =========================
  "수호의 정수 ★",
  "파동의 정수 ★",
  "혼란의 정수 ★",
  "생명의 정수 ★",
  "부식의 정수 ★",

  // =========================
  // 1성 핵 ★
  // =========================
  "물결 수호의 핵 ★",
  "파동 오염의 핵 ★",
  "질서 파괴의 핵 ★",
  "활력 붕괴의 핵 ★",
  "침식 방어의 핵 ★",

  // =========================
  // 2성 에센스 ★★
  // =========================
  "수호 에센스 ★★",
  "파동 에센스 ★★",
  "혼란 에센스 ★★",
  "생명 에센스 ★★",
  "부식 에센스 ★★",

  // =========================
  // 2성 결정 ★★  (중간재 맞음)
  // =========================
  "활기 보존의 결정 ★★",
  "파도 침식의 결정 ★★",
  "방어 오염의 결정 ★★",
  "격류 재생의 결정 ★★",
  "맹독 혼란의 결정 ★★",

  // =========================
  // 3성 엘릭서 ★★★
  // =========================
  "수호의 엘릭서 ★★★",
  "파동의 엘릭서 ★★★",
  "혼란의 엘릭서 ★★★",
  "생명의 엘릭서 ★★★",
  "부식의 엘릭서 ★★★",

  // =========================
  // 3성 영약 ★★★  (중간재 맞음)
  // =========================
  "불멸 재생의 영약 ★★★",
  "파동 장벽의 영약 ★★★",
  "타락 침식의 영약 ★★★",
  "생명 광란의 영약 ★★★",
  "맹독 파동의 영약 ★★★"
];


const MID_SECTIONS = [
  { title:"정수 ★", items:[
    "수호의 정수 ★","파동의 정수 ★","혼란의 정수 ★","생명의 정수 ★","부식의 정수 ★"
  ]},
  { title:"핵 ★", items:[
    "물결 수호의 핵 ★","파동 오염의 핵 ★","질서 파괴의 핵 ★","활력 붕괴의 핵 ★","침식 방어의 핵 ★"
  ]},
  { title:"에센스 ★★", items:[
    "수호 에센스 ★★","파동 에센스 ★★","혼란 에센스 ★★","생명 에센스 ★★","부식 에센스 ★★"
  ]},
  { title:"결정 ★★", items:[
    "활기 보존의 결정 ★★","파도 침식의 결정 ★★","방어 오염의 결정 ★★","격류 재생의 결정 ★★","맹독 혼란의 결정 ★★"
  ]},
  { title:"엘릭서 ★★★", items:[
    "수호의 엘릭서 ★★★","파동의 엘릭서 ★★★","혼란의 엘릭서 ★★★","생명의 엘릭서 ★★★","부식의 엘릭서 ★★★"
  ]},
  { title:"영약 ★★★", items:[
    "불멸 재생의 영약 ★★★","파동 장벽의 영약 ★★★","타락 침식의 영약 ★★★","생명 광란의 영약 ★★★","맹독 파동의 영약 ★★★"
  ]},
];



// ================================
// 표시/전개용 레시피 "생산 개수"(배치 생산) 정의
// - 기본은 1개 생산
// - 일부 항목은 1회 제작 시 2개 생산
// ================================
const RECIPE_YIELD = {
  "수호의 정수 ★": 2,
  "파동의 정수 ★": 2,
  "혼란의 정수 ★": 2,
  "생명의 정수 ★": 2,
  "부식의 정수 ★": 2,

  "수호 에센스 ★★": 2,
  "파동 에센스 ★★": 2,
  "혼란 에센스 ★★": 2,
  "생명 에센스 ★★": 2,
  "부식 에센스 ★★": 2,
};

function recipeYield(name){
  const k = String(name || "").trim();
  const v = Number(RECIPE_YIELD[k] || 1);
  return Math.max(1, Math.floor(v));
}

function qtyToCrafts(item, qty){
  const q = Math.max(0, Math.floor(Number(qty || 0)));
  if(q <= 0) return 0;
  const y = recipeYield(item);
  return Math.ceil(q / y);
}


// calcMatNeed 안에 있던 레시피를 "중간재 전개용"으로 재사용 (복붙이지만 1차 구현은 이게 안전)
function getAllRecipesForMid(){
  // ✅ 오늘 업데이트 레시피 (이름 유지, 재료만 갱신)
  const R1 = {
    // 1성 정수(1회 제작 시 2개 생산)
    "수호의 정수 ★": { "굴 ★": 2, "점토": 2 },
    "파동의 정수 ★": { "소라 ★": 2, "모래": 4 },
    "혼란의 정수 ★": { "문어 ★": 2, "흙": 8 },
    "생명의 정수 ★": { "미역 ★": 2, "자갈": 4 },
    "부식의 정수 ★": { "성게 ★": 2, "화강암": 2 },

    // 1성 핵
    "물결 수호의 핵 ★": { "수호의 정수 ★": 1, "파동의 정수 ★": 1, "익히지 않은 새우": 1 },
    "파동 오염의 핵 ★": { "파동의 정수 ★": 1, "혼란의 정수 ★": 1, "익히지 않은 도미": 1 },
    "질서 파괴의 핵 ★": { "혼란의 정수 ★": 1, "생명의 정수 ★": 1, "익히지 않은 청어": 1 },
    "활력 붕괴의 핵 ★": { "생명의 정수 ★": 1, "부식의 정수 ★": 1, "금붕어": 1 },
    "침식 방어의 핵 ★": { "부식의 정수 ★": 1, "수호의 정수 ★": 1, "농어": 1 },

    // 1성 최종품
    "영생의 아쿠티스 ★": { "물결 수호의 핵 ★": 1, "질서 파괴의 핵 ★": 1, "활력 붕괴의 핵 ★": 1 },
    "크라켄의 광란체 ★": { "질서 파괴의 핵 ★": 1, "활력 붕괴의 핵 ★": 1, "파동 오염의 핵 ★": 1 },
    "리바이던의 깃털 ★": { "침식 방어의 핵 ★": 1, "파동 오염의 핵 ★": 1, "물결 수호의 핵 ★": 1 },
  };

  const R2 = {
    // 2성 에센스(1회 제작 시 2개 생산)
    "수호 에센스 ★★": { "굴 ★★": 2, "해초": 6, "참나무 잎": 6 },
    "파동 에센스 ★★": { "소라 ★★": 2, "해초": 6, "가문비나무 잎": 6 },
    "혼란 에센스 ★★": { "문어 ★★": 2, "해초": 6, "자작나무 잎": 6 },
    "생명 에센스 ★★": { "미역 ★★": 2, "해초": 6, "아카시아나무 잎": 6 },
    "부식 에센스 ★★": { "성게 ★★": 2, "해초": 6, "벚나무 잎": 6 },

    // 2성 결정
    "활기 보존의 결정 ★★": { "수호 에센스 ★★": 1, "생명 에센스 ★★": 1, "켈프": 8, "청금석 블록": 1 },
    "파도 침식의 결정 ★★": { "파동 에센스 ★★": 1, "부식 에센스 ★★": 1, "켈프": 8, "레드스톤 블록": 1 },
    "방어 오염의 결정 ★★": { "혼란 에센스 ★★": 1, "수호 에센스 ★★": 1, "켈프": 8, "철 주괴": 3 },
    "격류 재생의 결정 ★★": { "생명 에센스 ★★": 1, "파동 에센스 ★★": 1, "켈프": 8, "금 주괴": 2 },
    "맹독 혼란의 결정 ★★": { "부식 에센스 ★★": 1, "혼란 에센스 ★★": 1, "켈프": 8, "다이아몬드": 1 },

    // 2성 최종품
    "해구 파동의 코어 ★★": { "활기 보존의 결정 ★★": 1, "파도 침식의 결정 ★★": 1, "격류 재생의 결정 ★★": 1 },
    "침묵의 심해 비약 ★★": { "파도 침식의 결정 ★★": 1, "격류 재생의 결정 ★★": 1, "맹독 혼란의 결정 ★★": 1 },
    "청해룡의 날개 ★★": { "방어 오염의 결정 ★★": 1, "맹독 혼란의 결정 ★★": 1, "활기 보존의 결정 ★★": 1 },
  };

  const R3 = {
    // 3성 엘릭서
    "수호의 엘릭서 ★★★": { "굴 ★★★": 1, "불우렁쉥이": 2, "유리병": 3, "네더랙": 8 },
    "파동의 엘릭서 ★★★": { "소라 ★★★": 1, "불우렁쉥이": 2, "유리병": 3, "마그마 블록": 4 },
    "혼란의 엘릭서 ★★★": { "문어 ★★★": 1, "불우렁쉥이": 2, "유리병": 3, "영혼 흙": 4 },
    "생명의 엘릭서 ★★★": { "미역 ★★★": 1, "불우렁쉥이": 2, "유리병": 3, "진홍빛 자루": 4 },
    "부식의 엘릭서 ★★★": { "성게 ★★★": 1, "불우렁쉥이": 2, "유리병": 3, "뒤틀린 자루": 4 },

    // 3성 영약
    "불멸 재생의 영약 ★★★": { "수호의 엘릭서 ★★★": 1, "생명의 엘릭서 ★★★": 1, "말린 켈프": 12, "발광 열매": 4, "죽은 관 산호 블록": 2 },
    "파동 장벽의 영약 ★★★": { "파동의 엘릭서 ★★★": 1, "수호의 엘릭서 ★★★": 1, "말린 켈프": 12, "발광 열매": 4, "죽은 사방 산호 블록": 2 },
    "타락 침식의 영약 ★★★": { "혼란의 엘릭서 ★★★": 1, "부식의 엘릭서 ★★★": 1, "말린 켈프": 12, "발광 열매": 4, "죽은 거품 산호 블록": 2 },
    "생명 광란의 영약 ★★★": { "생명의 엘릭서 ★★★": 1, "혼란의 엘릭서 ★★★": 1, "말린 켈프": 12, "발광 열매": 4, "죽은 불 산호 블록": 2 },
    "맹독 파동의 영약 ★★★": { "부식의 엘릭서 ★★★": 1, "파동의 엘릭서 ★★★": 1, "말린 켈프": 12, "발광 열매": 4, "죽은 뇌 산호 블록": 2 },

    // 3성 최종품
    "아쿠아 펄스 파편 ★★★": { "불멸 재생의 영약 ★★★": 1, "파동 장벽의 영약 ★★★": 1, "맹독 파동의 영약 ★★★": 1 },
    "나우틸러스의 손 ★★★": { "파동 장벽의 영약 ★★★": 1, "생명 광란의 영약 ★★★": 1, "불멸 재생의 영약 ★★★": 1 },
    "무저의 척추 ★★★": { "타락 침식의 영약 ★★★": 1, "맹독 파동의 영약 ★★★": 1, "생명 광란의 영약 ★★★": 1 },
  };

  // 레시피 탭 표시/툴팁용으로만 추가 (탭2 계산에는 추가하지 않음)
  const EXTRA = {
    "추출된 희석액": { "침식 방어의 핵 ★": 3, "방어 오염의 결정 ★★": 2, "타락 침식의 영약 ★★★": 1 }
  };

  return { ...R1, ...R2, ...R3, ...EXTRA };
}

// 탭2 표기용: (최종품 yFinal 기준) 중간재 재고를 먼저 쓰고, 부족분만 재료로 분해
function calcNetNeedsForActualWithMidInv(yFinal){
  const recipes = getAllRecipesForMid();    // 최종품 9개 포함
  const fishSet = new Set(FISH_ROWS);

  const inv0 = (typeof loadMidInv === "function") ? (loadMidInv() || {}) : {};
  const inv = {};
  for(const [k,v] of Object.entries(inv0)) inv[k] = Math.max(0, Math.floor(Number(v||0)));

  const needFish = new Map();
  const needMat  = new Map();

  const addNeed = (map, k, v) => {
    if(v <= 0) return;
    map.set(k, (map.get(k) || 0) + v);
  };

  const expandNeed = (item, qty, depth=0) => {
    qty = Math.max(0, Math.floor(Number(qty||0)));
    if(qty <= 0) return;
    if(depth > 40) return;

    // ✅ 중간재 재고 먼저 소비
    const have = Math.max(0, Math.floor(Number(inv[item] || 0)));
    if(have > 0){
      const use = Math.min(have, qty);
      inv[item] = have - use;
      qty -= use;
      if(qty <= 0) return;
    }

    const r = recipes[item];
    if(!r){
      if(fishSet.has(item)) addNeed(needFish, item, qty);
      else addNeed(needMat, item, qty);
      return;
    }
    const crafts = qtyToCrafts(item, qty);
    for(const [ing, q] of Object.entries(r)){
      expandNeed(ing, crafts * Number(q||0), depth+1);
    }
  };

  // 최종품 9개에서 시작
  PRODUCTS.forEach((p, i)=>{
    const q = Math.max(0, Math.floor(Number(yFinal[i] || 0)));
    if(q) expandNeed(p.name, q, 0);
  });

  // fish 표 렌더 편의
  FISH_ROWS.forEach(f=>{
    if(!needFish.has(f)) needFish.set(f, 0);
  });

  return {needFish, needMat};
}



// ================================
// TAB1: 표기용 '필요 어패류/부재료' (중간재 재고 차감 반영)
// - 탭1은 계획(기대) 화면이라 "중간재 재고"는 이미 완성된 것으로 보고,
//   그 중간재를 만들기 위해 필요한 어패류/부재료는 '필요량'에서 차감해서 표기한다.
// - (최적화 자체는 기존 방식 유지, 표기만 정확하게)
// ================================
// 탭1 표기용: "중간재 재고를 먼저 소비"하고, 부족분만 재료로 분해해서 needFish/needMat 계산
function calcNetNeedsForExpectedWithMidInv(qtys){
  // qtys 안 주면 DOM에서 읽어도 되게
  if(!Array.isArray(qtys)){
    qtys = PRODUCTS.map((p, idx)=> Math.max(0, Math.floor(Number(document.getElementById(`qty_${idx}`)?.value || 0))));
  }

  // ✅ 탭1(기대값) 원칙:
  // - 중간재 재고는 "어패류 환산 credit"으로만 사용
  // - 부재료/블럭 등의 필요량(needMat)은 중간재 재고로 차감하지 않음
  const recipes = getAllRecipesForMid();
  const fishSet = new Set(FISH_ROWS);

  const needFish = new Map();
  const needMat  = new Map();

  const addNeed = (map, k, v) => {
    if(v <= 0) return;
    map.set(k, (map.get(k) || 0) + v);
  };

  // ✅ 재고 소비 없이 "총 필요량"만 전개
  const expandGross = (item, qty, depth=0) => {
    qty = Math.max(0, Math.floor(Number(qty||0)));
    if(qty <= 0) return;
    if(depth > 40) return;

    const r = recipes[item];
    if(!r){
      if(fishSet.has(item)) addNeed(needFish, item, qty);
      else addNeed(needMat, item, qty);
      return;
    }
    const crafts = qtyToCrafts(item, qty);
    for(const [ing, q] of Object.entries(r)){
      expandGross(ing, crafts * Number(q||0), depth+1);
    }
  };

  qtys.forEach((q, i)=>{
    const qq = Math.max(0, Math.floor(Number(q || 0)));
    if(!qq) return;
    expandGross(PRODUCTS[i].name, qq, 0);
  });

  // ✅ 중간재 재고의 어패류 환산 credit만 적용(needFish에만 적용)
  try{
    const credit = getFishCreditFromMidInv(); // { fishName: qty }
    for(const [fishName, c] of Object.entries(credit || {})){
      const cc = Math.max(0, Math.floor(Number(c || 0)));
      if(cc <= 0) continue;
      const before = Math.max(0, Math.floor(Number(needFish.get(fishName) || 0)));
      const after  = Math.max(0, before - cc);
      if(after > 0) needFish.set(fishName, after);
      else needFish.delete(fishName);
    }
  }catch(e){}

  // fish는 표에서 항상 모든 행이 필요하니 0도 채워줌(렌더 편의)
  FISH_ROWS.forEach(f=>{
    if(!needFish.has(f)) needFish.set(f, 0);
  });

  return {needFish, needMat};
}

// ================================
// 중간재 재고: localStorage 기반
// ================================
const LS_KEY_MIDINV = "DDTY_MIDINV_V1";

const LS_KEY_MIDINV_SAVED_AT = "DDTY_MIDINV_SAVED_AT_V1";

function anyMidInv(inv){
  return Object.values(inv || {}).some(v => Number(v) > 0);
}

function updateMidInvBadge(){
  const inv = loadMidInv();
  const els = [
    document.getElementById("midInvBadge"),
    document.getElementById("midInvBadgeA"),
  ].filter(Boolean);

  if(els.length === 0) return;

  if(!anyMidInv(inv)){
    els.forEach(e => e.textContent = "미입력");
    return;
  }

  const t = Number(localStorage.getItem(LS_KEY_MIDINV_SAVED_AT) || 0);
  const d = t ? new Date(t) : null;
  const hhmm = d ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}` : "";
  els.forEach(e => e.textContent = hhmm ? `저장됨 ${hhmm}` : "저장됨");
}

function clearMidInvAll(){
  localStorage.removeItem(LS_KEY_MIDINV);
  localStorage.removeItem(LS_KEY_MIDINV_SAVED_AT);
}



function updateMidInvHint(){
  // 두 패널 모두 갱신
  const hintEls = document.querySelectorAll("#midInvDetails .midHint, #midInvDetailsA .midHint");

  let sum = 0;
  try{
    const credit = getFishCreditFromMidInv();
    for(const v of Object.values(credit || {})){
      sum += Number(v || 0);
    }
  }catch(e){}

  const n = Math.max(0, Math.floor(sum));
  hintEls.forEach(h=>{
    h.textContent = (n > 0) ? `어패류 환산 +${n}` : `필요할 때만 열어서 입력`;
  });
}

function renderMidInvGrid(){
  const hosts = [
    document.getElementById("midInvGrid"),
    document.getElementById("midInvGridA"),
  ].filter(Boolean);

  if(hosts.length === 0) return;

  const inv = loadMidInv();

  const buildMidSectionHtml = (sec)=>{
    const rows = (sec.items || []).map(name => {
      const v = Math.max(0, Math.floor(Number(inv[name] ?? 0)));
      return `
        <div class="midInvRow">
          <div class="midLabel">${matLabel(name,false)}</div>
          <input type="number" min="0" step="1"
                 value="${v}" data-mid="${name}"/>
        </div>
      `;
    }).join("");

    return `
      <div class="midSec">
        <div class="midSecTitle">${sec.title}</div>
        <div class="midSecGrid">${rows}</div>
      </div>
    `;
  };

  const midHtml = (MID_SECTIONS || []).map(buildMidSectionHtml).join("");

  // ✅ 핵심: 완성품은 PRODUCTS에서 직접 뽑음
  const finalItems = PRODUCTS.map(p => p.name);

  const finalRows = finalItems.map(name => {
    const v = Math.max(0, Math.floor(Number(inv[name] ?? 0)));
    const label =
      (typeof productLabel === "function")
        ? productLabel(name,false)
        : matLabel(name,false);

    return `
      <div class="midInvRow">
        <div class="midLabel">${label}</div>
        <input type="number" min="0" step="1"
               value="${v}" data-mid="${name}"/>
      </div>
    `;
  }).join("");

  const html =
    midHtml +
    `
    <div class="midSec">
      <div class="midSecTitle">완성품</div>
      <div class="midSecGrid">
        ${finalRows}
      </div>
    </div>
    `;

  hosts.forEach(h => h.innerHTML = html);

  // 이벤트 바인딩
  hosts.forEach(host=>{
    host.querySelectorAll('input[data-mid]').forEach(inp=>{
      const name = inp.getAttribute("data-mid");

      const commit = ()=>{
        const v = Math.max(0, Math.floor(Number(inp.value || 0)));
        inp.value = String(v);

        setMidInvQty(name, v);

        // 다른 패널과 동기화
        document.querySelectorAll(
          `input[data-mid="${CSS.escape(name)}"]`
        ).forEach(x=>{
          if(x !== inp) x.value = String(v);
        });

        try{ recalcFromCurrent(); }catch(e){}
        try{ updateTotalsActual(); }catch(e){}
        updateMidInvHint();
        updateMidInvBadge();
      };

      inp.addEventListener("change", commit);
      inp.addEventListener("blur", commit);
    });
  });

  updateMidInvHint();
  updateMidInvBadge();
}

function bindMidInvResetButtons(){
  const btns = [
    document.getElementById("midInvReset"),
    document.getElementById("midInvResetA"),
  ].filter(Boolean);

  btns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(!confirm("중간재 재고를 모두 0으로 초기화할까요?")) return;
      clearMidInvAll();
      renderMidInvGrid();
      try{ recalcFromCurrent(); }catch(e){}
      try{ updateTotalsActual(); }catch(e){}
      updateMidInvHint();
      updateMidInvBadge();
    });
  });
}

function loadMidInv(){
  const raw = localStorage.getItem(LS_KEY_MIDINV);
  if(!raw) return {};
  try{
    const obj = JSON.parse(raw);
    return (obj && typeof obj === "object") ? obj : {};
  }catch(e){
    return {};
  }
}

function saveMidInv(obj){
  localStorage.setItem(LS_KEY_MIDINV, JSON.stringify(obj || {}));
  localStorage.setItem(LS_KEY_MIDINV_SAVED_AT, String(Date.now())); // ✅ 추가
}


function getMidInvQty(name){
  const inv = loadMidInv();
  const v = Number(inv[name] ?? 0);
  return Math.max(0, Math.floor(v || 0));
}

function setMidInvQty(name, qty){
  const inv = loadMidInv();
  inv[name] = Math.max(0, Math.floor(Number(qty || 0)));
  saveMidInv(inv);
}


// 중간재 1개를 만들 때 들어가는 "어패류"만 전개해서 모으기
function expandToFishOnly(itemName, qty, ALL, out){
  const recipe = ALL[itemName];
  if(!recipe){
    if(isFishItem(itemName)){
      out[itemName] = (out[itemName] || 0) + qty;
    }
    return;
  }
  const crafts = qtyToCrafts(itemName, qty);
  for(const [child, cqty] of Object.entries(recipe)){
    expandToFishOnly(child, crafts * cqty, ALL, out);
  }
}

// 중간재 재고 전체 → 어패류 절약분 합산
function getFishCreditFromMidInv(){
  const ALL = getAllRecipesForMid();
  const fishCredit = {}; // { "굴 ★": n, ... }

  for(const mid of MID_ITEMS){
    const q = getMidInvQty(mid);
    if(q <= 0) continue;
    expandToFishOnly(mid, q, ALL, fishCredit);
  }
  return fishCredit;
}


// ================================
// 제작량 y(9개 최종품) → 전체 재료 필요량 계산 (부재료/중간재 포함)
// 반환: { items: [{name, qty}], totals: { [name]: qty } }
// ================================
function calcMatNeed(y) {
  const yy = Array.isArray(y) ? y.map(v => Number(v || 0)) : Array(9).fill(0);

  // --- 유틸 ---
  const add = (totals, name, qty) => {
    if (!qty) return;
  if (isFishItem(name)) return;
    totals[name] = (totals[name] || 0) + qty;
  };

  // --- 레시피 정의 (위키 최신: 일부 2개 생산) ---
  const R1 = {
    // 1성 정수(1회 제작 시 2개 생산)
    "수호의 정수 ★": { "굴 ★": 2, "점토": 1 },
    "파동의 정수 ★": { "소라 ★": 2, "모래": 3 },
    "혼란의 정수 ★": { "문어 ★": 2, "흙": 4 },
    "생명의 정수 ★": { "미역 ★": 2, "자갈": 2 },
    "부식의 정수 ★": { "성게 ★": 2, "화강암": 1 },

    // 1성 핵(1개 생산)
    "물결 수호의 핵 ★": { "수호의 정수 ★": 1, "파동의 정수 ★": 1, "익히지 않은 새우": 1 },
    "파동 오염의 핵 ★": { "파동의 정수 ★": 1, "혼란의 정수 ★": 1, "익히지 않은 도미": 1 },
    "질서 파괴의 핵 ★": { "혼란의 정수 ★": 1, "생명의 정수 ★": 1, "익히지 않은 청어": 1 },
    "활력 붕괴의 핵 ★": { "생명의 정수 ★": 1, "부식의 정수 ★": 1, "금붕어": 1 },
    "침식 방어의 핵 ★": { "부식의 정수 ★": 1, "수호의 정수 ★": 1, "농어": 1 },

    // 1성 최종품
    "영생의 아쿠티스 ★": { "물결 수호의 핵 ★": 1, "질서 파괴의 핵 ★": 1, "활력 붕괴의 핵 ★": 1 },
    "크라켄의 광란체 ★": { "질서 파괴의 핵 ★": 1, "활력 붕괴의 핵 ★": 1, "파동 오염의 핵 ★": 1 },
    "리바이던의 깃털 ★": { "침식 방어의 핵 ★": 1, "파동 오염의 핵 ★": 1, "물결 수호의 핵 ★": 1 }
  };

  const R2 = {
    // 2성 에센스(1회 제작 시 2개 생산)
    "수호 에센스 ★★": { "굴 ★★": 2, "해초": 2, "네더랙": 8 },
    "파동 에센스 ★★": { "소라 ★★": 2, "해초": 2, "마그마 블록": 4 },
    "혼란 에센스 ★★": { "문어 ★★": 2, "해초": 2, "영혼 흙": 4 },
    "생명 에센스 ★★": { "미역 ★★": 2, "해초": 2, "진홍빛 자루": 2 },
    "부식 에센스 ★★": { "성게 ★★": 2, "해초": 2, "뒤틀린 자루": 2 },

    // 2성 결정/코어/최종품(1개 생산)
    "활기 보존의 결정 ★★": { "수호 에센스 ★★": 1, "생명 에센스 ★★": 1, "켈프": 3, "청금석 블록": 1 },
    "파도 침식의 결정 ★★": { "파동 에센스 ★★": 1, "부식 에센스 ★★": 1, "켈프": 3, "레드스톤 블록": 1 },
    "방어 오염의 결정 ★★": { "혼란 에센스 ★★": 1, "수호 에센스 ★★": 1, "켈프": 3, "철 주괴": 1 },
    "격류 재생의 결정 ★★": { "생명 에센스 ★★": 1, "파동 에센스 ★★": 1, "켈프": 3, "금 주괴": 1 },
    "맹독 혼란의 결정 ★★": { "부식 에센스 ★★": 1, "혼란 에센스 ★★": 1, "켈프": 3, "다이아몬드": 1 },

    "해구 파동의 코어 ★★": { "활기 보존의 결정 ★★": 1, "파도 침식의 결정 ★★": 1, "격류 재생의 결정 ★★": 1 },
    "침묵의 심해 비약 ★★": { "파도 침식의 결정 ★★": 1, "격류 재생의 결정 ★★": 1, "맹독 혼란의 결정 ★★": 1 },
    "청해룡의 날개 ★★": { "방어 오염의 결정 ★★": 1, "맹독 혼란의 결정 ★★": 1, "활기 보존의 결정 ★★": 1 }
  };

  const R3 = {
    // 3성 엘릭서(1개 생산)
    "수호의 엘릭서 ★★★": { "굴 ★★★": 1, "불우렁쉥이": 1, "유리병": 3, "엔드 돌": 1 },
    "파동의 엘릭서 ★★★": { "소라 ★★★": 1, "불우렁쉥이": 1, "유리병": 3, "엔드 석재 벽돌": 1 },
    "혼란의 엘릭서 ★★★": { "문어 ★★★": 1, "불우렁쉥이": 1, "유리병": 3, "후렴과": 4 },
    "생명의 엘릭서 ★★★": { "미역 ★★★": 1, "불우렁쉥이": 1, "유리병": 3, "튀긴 후렴과": 4 },
    "부식의 엘릭서 ★★★": { "성게 ★★★": 1, "불우렁쉥이": 1, "유리병": 3, "퍼퍼 블록": 1 },

    // 3성 영약(1개 생산)
    "불멸 재생의 영약 ★★★": { "수호의 엘릭서 ★★★": 1, "생명의 엘릭서 ★★★": 1, "말린 켈프": 5, "발광 열매": 2, "죽은 관 산호 블록": 1 },
    "파동 장벽의 영약 ★★★": { "파동의 엘릭서 ★★★": 1, "수호의 엘릭서 ★★★": 1, "말린 켈프": 5, "발광 열매": 2, "죽은 사방 산호 블록": 1 },
    "타락 침식의 영약 ★★★": { "혼란의 엘릭서 ★★★": 1, "부식의 엘릭서 ★★★": 1, "말린 켈프": 5, "발광 열매": 2, "죽은 거품 산호 블록": 1 },
    "생명 광란의 영약 ★★★": { "생명의 엘릭서 ★★★": 1, "혼란의 엘릭서 ★★★": 1, "말린 켈프": 5, "발광 열매": 2, "죽은 불 산호 블록": 1 },
    "맹독 파동의 영약 ★★★": { "부식의 엘릭서 ★★★": 1, "파동의 엘릭서 ★★★": 1, "말린 켈프": 5, "발광 열매": 2, "죽은 뇌 산호 블록": 1 },

    // 3성 최종품
    "아쿠아 펄스 파편 ★★★": { "불멸 재생의 영약 ★★★": 1, "파동 장벽의 영약 ★★★": 1, "맹독 파동의 영약 ★★★": 1 },
    "나우틸러스의 손 ★★★": { "파동 장벽의 영약 ★★★": 1, "생명 광란의 영약 ★★★": 1, "불멸 재생의 영약 ★★★": 1 },
    "무저의 척추 ★★★": { "타락 침식의 영약 ★★★": 1, "맹독 파동의 영약 ★★★": 1, "생명 광란의 영약 ★★★": 1 }
  };

  const ALL = { ...R1, ...R2, ...R3 };

  function expand(itemName, qty) {
    const recipe = ALL[itemName];
    if (!recipe) {
      // 기본 재료
      add(totals, itemName, qty);
      return;
    }

    // ✅ 배치 생산(2개 생산) 반영: 필요한 개수(qty) -> 제작 횟수(crafts)
    const crafts = qtyToCrafts(itemName, qty);

    // 중간재: 하위 재료로 분해 (제작 횟수 기준)
    for (const [child, cqty] of Object.entries(recipe)) {
      expand(child, crafts * cqty);
    }
  }

  // 최종품에서 시작
  for (let i = 0; i < PRODUCTS.length; i++) {
    const q = yy[i] || 0;
    if (q > 0) expand(PRODUCTS[i], q);
  }

  // --- 표시 순서(레시피 순서대로) ---
  const order = [
    // 1티어: 굴/소라/문어/미역/성게 기본 + 그 다음 생선류
    "굴 ★","점토",
    "소라 ★","모래",
    "문어 ★","흙",
    "미역 ★","자갈",
    "성게 ★","화강암",
    "익히지 않은 새우","익히지 않은 도미","익히지 않은 청어","금붕어","농어",

    // 2티어 공통/블록/부재료
    "굴 ★★","소라 ★★","문어 ★★","미역 ★★","성게 ★★",
    "해초",
    "죽은 관 산호 블록","죽은 사방 산호 블록","죽은 거품 산호 블록","죽은 불 산호 블록","죽은 뇌 산호 블록",
    "먹물 주머니",
    "청금석 블록","레드스톤 블록","철 주괴","금 주괴","다이아몬드",

    // 3티어 공통/네더/꽃류
    "굴 ★★★","소라 ★★★","문어 ★★★","미역 ★★★","성게 ★★★",
    "불우렁쉥이","유리병",
    "네더랙","마그마 블록","영혼 흙","진홍빛 자루","뒤틀린 자루",
    "발광 먹물 주머니","발광 열매",
    "수레국화","민들레","데이지","양귀비","선애기별꽃"
  ];

  const items = [];

  // order에 있는 것 먼저
  for (const name of order) {
    if (totals[name]) items.push({ name, qty: totals[name] });
  }
  // 나머지(혹시 신규 재료가 생겼을 때) 뒤에 붙이기
  for (const [name, qty] of Object.entries(totals)) {
    if (!order.includes(name)) items.push({ name, qty });
  }

return totals;

}

// ================================
// 프리미엄 한정가 배율 (강화 단계 → 배율)
// ================================
function premiumMulFromLevel(level) {
  const map = { 0:1.0, 1:1.05, 2:1.07, 3:1.09, 4:1.12, 5:1.15, 6:1.20, 7:1.25, 8:1.30 };
  return map[level] ?? 1.0;
}

// ================================
// 탭2(실제 제작) 제약용 어패류 사용 계수 행렬
// - 행: (굴/소라/문어/미역/성게) x (★/★★/★★★) = 15종
// - 열: 연금품 9종 (★ 3, ★★ 3, ★★★ 3)
// 값: "연금품 1개 제작에 필요한 해당 어패류 개수"
// ================================
// ================================
// 탭2(실제 제작) 제약용 어패류 사용 계수 행렬
// - 반환값: 2D 배열 A[15][9]
// - 추가로 A.fishRows, A.products 메타도 붙여둠(필요 시 사용 가능)
// ================================
function buildFishMatrix() {
  // fish row order (15)
  const fishRows = [
    "굴★","굴★★","굴★★★",
    "소라★","소라★★","소라★★★",
    "문어★","문어★★","문어★★★",
    "미역★","미역★★","미역★★★",
    "성게★","성게★★","성게★★★"
  ];

  // product col order (9)
  const products = [
    "영생의 아쿠티스 ★",
    "크라켄의 광란체 ★",
    "리바이던의 깃털 ★",
    "해구 파동의 코어 ★★",
    "침묵의 심해 비약 ★★",
    "청해룡의 날개 ★★",
    "아쿠아 펄스 파편 ★★★",
    "나우틸러스의 손 ★★★",
    "무저의 척추 ★★★"
  ,
    "추출된 희석액"
  ];

  // 빈 벡터
  const col = () => Object.fromEntries(fishRows.map(k => [k, 0]));
  const req = {};

  // ★ tier (최종품 1개 기준 어패류 소모량 전개)
  req[products[0]] = { ...col(), "굴★":1, "소라★":1, "문어★":1, "미역★":2, "성게★":1 };
  req[products[1]] = { ...col(), "굴★":0, "소라★":1, "문어★":2, "미역★":2, "성게★":1 };
  req[products[2]] = { ...col(), "굴★":2, "소라★":2, "문어★":1, "미역★":0, "성게★":1 };

  // ★★ tier
  req[products[3]] = { ...col(), "굴★★":1, "소라★★":2, "문어★★":0, "미역★★":2, "성게★★":1 };
  req[products[4]] = { ...col(), "굴★★":0, "소라★★":2, "문어★★":1, "미역★★":1, "성게★★":2 };
  req[products[5]] = { ...col(), "굴★★":2, "소라★★":0, "문어★★":2, "미역★★":1, "성게★★":1 };

  // ★★★ tier
  req[products[6]] = { ...col(), "굴★★★":2, "소라★★★":2, "문어★★★":0, "미역★★★":1, "성게★★★":1 };
  req[products[7]] = { ...col(), "굴★★★":2, "소라★★★":1, "문어★★★":1, "미역★★★":2, "성게★★★":0 };
  req[products[8]] = { ...col(), "굴★★★":0, "소라★★★":1, "문어★★★":2, "미역★★★":1, "성게★★★":2 };


  // ================================
  // 추출된 희석액 (0티어) 어패류 전개
  // - 침식 방어의 핵 ★ x3  -> (★ tier) 영생의 아쿠티스 ★ (products[0])
  // - 방어 오염의 결정 ★★ x2 -> (★★ tier) 해구 파동의 코어 ★★ (products[3])
  // - 타락 침식의 영약 ★★★ x1 -> (★★★ tier) 아쿠아 펄스 파편 ★★★ (products[6])
  // ================================
  const dilution = { ...col() };

  for (const k in req[products[0]]) dilution[k] += req[products[0]][k] * 3;
  for (const k in req[products[3]]) dilution[k] += req[products[3]][k] * 2;
  for (const k in req[products[6]]) dilution[k] += req[products[6]][k] * 1;

  req["추출된 희석액"] = dilution;

  // A[15][N] 생성 (N = products.length)
  const A = fishRows.map(fr => products.map(p => (req[p] && req[p][fr]) || 0));

  // 메타 붙여두기(필요할 때 디버그/표시용)
  A.fishRows = fishRows;
  A.products = products;

  return A;
}


/* DDTYCOON Optimizer v4
 * - Enumerate stamina allocation blocks across 5 fish (sum = totalStamina/100)
 * - For each allocation, compute fish supply (inventory + expected catch with storm/star)
 * - Solve LP: maximize revenue with fish constraints (<= supply), x>=0
 * - Pick best allocation + craft quantities
 * - Render needs (fish + materials using decomposition)
 */

const MATERIAL_ICON_URL = {
  "점토": "https://static.wikia.nocookie.net/minecraft_gamepedia/images/3/38/Clay_JE1_BE1.png",
  "모래": "https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/71/Sand_JE5_BE3.png",
  "흙": "https://minecraft.wiki/images/Dirt.png",
  "자갈": "https://static.wikia.nocookie.net/minecraft_gamepedia/images/9/9d/Gravel_JE5_BE4.png",
  "화강암": "https://static.wikia.nocookie.net/minecraft_ko_gamepedia/images/0/0b/Polished_Granite_JE1_BE1.png",
 "익히지 않은 새우": "icons/shrimp.png",
 "익히지 않은 도미": "icons/bream.png",
 "익히지 않은 청어": "icons/herring.png",
 "금붕어": "icons/goldfish.png",
 "농어": "icons/bass.png",
  "해초": "https://static.wikia.nocookie.net/minecraft_ko_gamepedia/images/c/c5/Grass.png",
  "죽은 관 산호 블록": "https://minecraft.wiki/images/thumb/Tube_Coral_Block_JE2_BE1.png/150px-Tube_Coral_Block_JE2_BE1.png",
  "죽은 사방 산호 블록": "https://minecraft.wiki/images/thumb/Horn_Coral_Block_JE2_BE2.png/150px-Horn_Coral_Block_JE2_BE2.png",
  "죽은 거품 산호 블록": "https://minecraft.wiki/images/thumb/Bubble_Coral_Block_JE2_BE1.png/150px-Bubble_Coral_Block_JE2_BE1.png",
  "죽은 불 산호 블록": "https://minecraft.wiki/images/thumb/Fire_Coral_Block_JE2_BE1.png/150px-Fire_Coral_Block_JE2_BE1.png",
  "죽은 뇌 산호 블록": "https://minecraft.wiki/images/thumb/Brain_Coral_Block_JE2_BE1.png/150px-Brain_Coral_Block_JE2_BE1.png",
  "먹물 주머니": "https://minecraft.wiki/images/Ink_Sac_JE2_BE2.png",
  "청금석 블록": "https://minecraft.wiki/images/Block_of_Lapis_Lazuli_JE3_BE3.png",
  "레드스톤 블록": "https://minecraft.wiki/images/Block_of_Redstone_JE2_BE2.png",
  "철 주괴": "https://minecraft.wiki/images/Iron_Ingot_JE3_BE2.png",
  "금 주괴": "https://minecraft.wiki/images/Gold_Ingot_JE4_BE2.png",
  "다이아몬드": "https://minecraft.wiki/images/Diamond_JE3_BE3.png",
  "유리병": "https://minecraft.wiki/images/Glass_Bottle_JE2_BE2.png",
  "네더랙": "https://static.wikia.nocookie.net/minecraft_ko_gamepedia/images/0/02/Netherrack_JE4_BE2.png",
  "마그마 블록": "https://ru.minecraft.wiki/images/thumb/%D0%9C%D0%B0%D0%B3%D0%BC%D0%BE%D0%B2%D1%8B%D0%B9_%D0%B1%D0%BB%D0%BE%D0%BA.png/160px-%D0%9C%D0%B0%D0%B3%D0%BC%D0%BE%D0%B2%D1%8B%D0%B9_%D0%B1%D0%BB%D0%BE%D0%BA.png?7243c",
  "영혼 흙": "https://static.wikia.nocookie.net/minecraft_ko_gamepedia/images/8/86/Soul_Soil_JE1.png",
  "진홍빛 자루": "https://kkukowiki.kr/images/9/91/%EC%A7%84%ED%99%8D%EB%B9%9B%EC%9E%90%EB%A3%A8.gif",
  "뒤틀린 자루": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_vytHwPLMa46iNFxvxPA9eZiLZyDj9jzvTQ&s",
  "켈프": "https://static.wikia.nocookie.net/minecraft_gamepedia/images/0/09/Kelp_%28item%29_JE1_BE2.png",
  "말린 켈프": "https://static.wikia.nocookie.net/minecraft_gamepedia/images/1/1a/Dried_Kelp_JE1_BE2.png",
  "튀긴 후렴과": "https://minecraft.wiki/images/Popped_Chorus_Fruit_JE2_BE2.png",
  "후렴과": "https://minecraft.wiki/images/Chorus_Fruit_JE2_BE2.png",
  "엔드 석재 벽돌": "https://static.wikia.nocookie.net/minecraft_ko_gamepedia/images/7/72/End_Stone_Bricks_JE2_BE2.png",
  "퍼퍼 블록": "https://minecraft.wiki/images/Purpur_Block_JE2_BE2.png",
  "엔드 돌": "https://minecraft.wiki/images/End_Stone_JE3_BE2.png",
"불우렁쉥이": "https://i.namu.wiki/i/CBEgUc-J1DNSqRXuNRVe-pSAfCPgTGpusBPd6LB4U9EgufWNknGIXJUL5yV4YgO_Lcx563vo3ai_KiVJluhyig.webp",
  "발광 열매": "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20/assets/minecraft/textures/item/glow_berries.png",
  "참나무 잎": "https://minecraft.wiki/images/thumb/Oak_Leaves_JE4.png/150px-Oak_Leaves_JE4.png",
  "가문비나무 잎": "https://minecraft.wiki/images/thumb/Spruce_Leaves_JE2.png/150px-Spruce_Leaves_JE2.png",
 "자작나무 잎": "https://minecraft.wiki/images/thumb/Birch_Leaves_JE2.png/150px-Birch_Leaves_JE2.png",
"벚나무 잎": "https://minecraft.wiki/images/thumb/Cherry_Leaves_JE2.png/150px-Cherry_Leaves_JE2.png",
"아카시아나무 잎": "https://minecraft.wiki/images/thumb/Acacia_Leaves_JE2.png/150px-Acacia_Leaves_JE2.png",

// 어패류(등급) 아이콘
"굴 ★": "icons/fish/oyster.png",
"굴 ★★": "icons/fish/oyster.png",
"굴 ★★★": "icons/fish/oyster.png",

"소라 ★": "icons/fish/conch.png",
"소라 ★★": "icons/fish/conch.png",
"소라 ★★★": "icons/fish/conch.png",

"문어 ★": "icons/fish/octopus.png",
"문어 ★★": "icons/fish/octopus.png",
"문어 ★★★": "icons/fish/octopus.png",

"미역 ★": "icons/fish/kelp.png",
"미역 ★★": "icons/fish/kelp.png",
"미역 ★★★": "icons/fish/kelp.png",

"성게 ★": "icons/fish/urchin.png",
"성게 ★★": "icons/fish/urchin.png",
"성게 ★★★": "icons/fish/urchin.png",



  // ===== 중간재 아이콘 =====
  "수호의 정수 ★": "icons/mid/essence1_guard.png",
  "파동의 정수 ★": "icons/mid/essence1_wave.png",
  "혼란의 정수 ★": "icons/mid/essence1_chaos.png",
  "생명의 정수 ★": "icons/mid/essence1_life.png",
  "부식의 정수 ★": "icons/mid/essence1_corrosion.png",

  "물결 수호의 핵 ★": "icons/mid/core1_guard.png",
  "파동 오염의 핵 ★": "icons/mid/core1_wave.png",
  "질서 파괴의 핵 ★": "icons/mid/core1_chaos.png",
  "활력 붕괴의 핵 ★": "icons/mid/core1_life.png",
  "침식 방어의 핵 ★": "icons/mid/core1_corrosion.png",

  "수호 에센스 ★★": "icons/mid/essence2_guard.png",
  "파동 에센스 ★★": "icons/mid/essence2_wave.png",
  "혼란 에센스 ★★": "icons/mid/essence2_chaos.png",
  "생명 에센스 ★★": "icons/mid/essence2_life.png",
  "부식 에센스 ★★": "icons/mid/essence2_corrosion.png",

  "활기 보존의 결정 ★★": "icons/mid/crystal_guard.png",
  "파도 침식의 결정 ★★": "icons/mid/crystal_wave.png",
  "방어 오염의 결정 ★★": "icons/mid/crystal_chaos.png",
  "격류 재생의 결정 ★★": "icons/mid/crystal_life.png",
  "맹독 혼란의 결정 ★★": "icons/mid/crystal_corrosion.png",

  "수호의 엘릭서 ★★★": "icons/mid/essence3_guard.png",
  "파동의 엘릭서 ★★★": "icons/mid/essence3_wave.png",
  "혼란의 엘릭서 ★★★": "icons/mid/essence3_chaos.png",
  "생명의 엘릭서 ★★★": "icons/mid/essence3_life.png",
  "부식의 엘릭서 ★★★": "icons/mid/essence3_corrosion.png",

  "불멸 재생의 영약 ★★★": "icons/mid/elixir_regen.png",
  "파동 장벽의 영약 ★★★": "icons/mid/elixir_barrier.png",
  "타락 침식의 영약 ★★★": "icons/mid/elixir_corrupt.png",
  "생명 광란의 영약 ★★★": "icons/mid/elixir_frenzy.png",
  "맹독 파동의 영약 ★★★": "icons/mid/elixir_venom.png"

 
};




const PRODUCT_ICON_URL = {
  "영생의 아쿠티스": "icons/akutis.png",
  "크라켄의 광란체": "icons/kraken.png",
  "리바이던의 깃털": "icons/leviathan.png",
  "해구 파동의 코어": "icons/trench_core.png",
  "침묵의 심해 비약": "icons/silence_elixir.png",
  "청해룡의 날개": "icons/azure_dragon.png",
  "아쿠아 펄스 파편": "icons/aqua.png",
  "나우틸러스의 손": "icons/nautilus.png",
  "무저의 척추": "icons/abyss_tentacle.png",
  "추출된 희석액": "icons/bottle.png"
};

function stripStars(name){
  return name.replace(/★+/g, "").trim();
}



const FALLBACK_ICON_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="rgba(0,0,0,.08)"/>
    <path d="M7 13c3-5 7-5 10 0-3 3-7 3-10 0z" fill="rgba(0,0,0,.28)"/>
    <circle cx="15.5" cy="11" r="1" fill="rgba(0,0,0,.45)"/>
  </svg>`
);

function escHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}


// ================================
// 표시용 이름: 2개 생산 품목은 이름 뒤에 "×2" 표기
// (요구 수량 "×N" 과 헷갈리지 않게 생산량만 추가)
// ================================
function displayNameWithYield(name, includeYield=true){
  const raw = String(name || "").trim();
  const y = recipeYield(raw);
  if(!includeYield) return raw;
  return (y > 1) ? `${raw} ×${y}` : raw;
}


function productLabel(name, includeYield=true){
  const shown = displayNameWithYield(name, includeYield);
  const base = stripStars(name);
  const url = PRODUCT_ICON_URL[base];
  if(!url) return escHtml(shown);

  return `
    <span class="item-label">
      <img src="${url}" class="item-icon">
      <span>${escHtml(shown)}</span>
    </span>
  `;
}



function matLabel(name, includeYield=true){
  const shown = displayNameWithYield(name, includeYield);
  // ✅ 0티어 희석액 전용 아이콘
  let url;
  if(String(name).includes("추출된 희석액")){
    url = "icons/mid/bottle.png";
  }else{
    url = MATERIAL_ICON_URL[name] || MATERIAL_ICON_URL[stripStars(name)] || FALLBACK_ICON_SVG;
  }
  return `<span class="mat"><img class="icon" src="${url}" alt="" onerror="this.src='${FALLBACK_ICON_SVG}'"/>${escHtml(shown)}</span>`;
}


const PRODUCTS = [
{ name:"영생의 아쿠티스 ★", base:5159 },
  { name:"크라켄의 광란체 ★", base:5234 },
  { name:"리바이던의 깃털 ★", base:5393 },
  { name:"해구 파동의 코어 ★★", base:11131 },
  { name:"침묵의 심해 비약 ★★", base:11242 },
  { name:"청해룡의 날개 ★★", base:11399 },
  { name:"아쿠아 펄스 파편 ★★★", base:18985 },
  { name:"나우틸러스의 손 ★★★", base:19207 },
  { name:"무저의 척추 ★★★", base:19328 },
  { name:"추출된 희석액", base:18444, tier:0 },

];

const FISH_ROWS = [
  "굴 ★","굴 ★★","굴 ★★★",
  "소라 ★","소라 ★★","소라 ★★★",
  "문어 ★","문어 ★★","문어 ★★★",
  "미역 ★","미역 ★★","미역 ★★★",
  "성게 ★","성게 ★★","성게 ★★★"
];

const FISH_NAMES = ["굴","소라","문어","미역","성게"];


// 부재료 표시 순서(레시피 기준: 1티어 → 2티어 → 3티어)
const MAT_ORDER = ["점토", "모래", "흙", "자갈", "화강암", "익히지 않은 새우", "익히지 않은 도미", "익히지 않은 청어", "금붕어", "농어", "해초", "죽은 관 산호 블록", "죽은 사방 산호 블록", "죽은 거품 산호 블록", "죽은 불 산호 블록", "죽은 뇌 산호 블록", "먹물 주머니", "청금석 블록", "레드스톤 블록", "철 주괴", "금 주괴", "다이아몬드", "불우렁쉥이", "유리병", "네더랙", "마그마 블록", "영혼 흙", "진홍빛 자루", "뒤틀린 자루", "발광 먹물 주머니", "발광 열매", "수레국화", "민들레", "데이지", "양귀비", "선애기별꽃", "발광 먹물"];
function matRank(name){
  const i = MAT_ORDER.indexOf(name);
  return i >= 0 ? i : 9999;
}

/** Decomposition per final product (fish + materials) */
const DECOMP = {
  "영생의 아쿠티스 ★": {
    "굴 ★":1,
    "소라 ★":1,
    "문어 ★":1,
    "미역 ★":2,
    "성게 ★":1,
    "금붕어":1,
    "모래":3,
    "익히지 않은 새우":1,
    "익히지 않은 청어":1,
    "자갈":4,
    "점토":1,
    "화강암":1,
    "흙":4,
  },
  "크라켄의 광란체 ★": {
    "소라 ★":1,
    "문어 ★":2,
    "미역 ★":2,
    "성게 ★":1,
    "금붕어":1,
    "모래":3,
    "익히지 않은 도미":1,
    "익히지 않은 청어":1,
    "자갈":4,
    "화강암":1,
    "흙":8,
  },
  "리바이던의 깃털 ★": {
    "굴 ★":2,
    "소라 ★":2,
    "문어 ★":1,
    "성게 ★":1,
    "농어":1,
    "모래":6,
    "익히지 않은 도미":1,
    "익히지 않은 새우":1,
    "점토":2,
    "화강암":1,
    "흙":4,
  },
  "해구 파동의 코어 ★★": {
    "굴 ★★":1,
    "소라 ★★":2,
    "미역 ★★":2,
    "성게 ★★":1,
    "금 주괴":1,
    "레드스톤 블록":1,
    "먹물 주머니":3,
    "죽은 관 산호 블록":1,
    "죽은 뇌 산호 블록":1,
    "죽은 불 산호 블록":2,
    "죽은 사방 산호 블록":2,
    "청금석 블록":1,
    "해초":18,
  },
  "침묵의 심해 비약 ★★": {
    "소라 ★★":2,
    "문어 ★★":1,
    "미역 ★★":1,
    "성게 ★★":2,
    "금 주괴":1,
    "다이아몬드":1,
    "레드스톤 블록":1,
    "먹물 주머니":3,
    "죽은 거품 산호 블록":1,
    "죽은 뇌 산호 블록":2,
    "죽은 불 산호 블록":1,
    "죽은 사방 산호 블록":2,
    "해초":18,
  },
  "청해룡의 날개 ★★": {
    "굴 ★★":2,
    "문어 ★★":2,
    "미역 ★★":1,
    "성게 ★★":1,
    "다이아몬드":1,
    "먹물 주머니":3,
    "죽은 거품 산호 블록":2,
    "죽은 관 산호 블록":2,
    "죽은 뇌 산호 블록":1,
    "죽은 불 산호 블록":1,
    "철 주괴":1,
    "청금석 블록":1,
    "해초":18,
  },
  "아쿠아 펄스 파편 ★★★": {
    "굴 ★★★":2,
    "소라 ★★★":2,
    "미역 ★★★":1,
    "성게 ★★★":1,
    "네더랙":32,
    "뒤틀린 자루":4,
    "마그마 블록":16,
    "민들레":1,
    "발광 먹물 주머니":3,
    "발광 열매":6,
    "불우렁쉥이":6,
    "선애기별꽃":1,
    "수레국화":1,
    "유리병":18,
    "진홍빛 자루":4,
  },
  "나우틸러스의 손 ★★★": {
    "굴 ★★★":2,
    "소라 ★★★":1,
    "문어 ★★★":1,
    "미역 ★★★":2,
    "네더랙":32,
    "마그마 블록":8,
    "민들레":1,
    "발광 먹물 주머니":3,
    "발광 열매":6,
    "불우렁쉥이":6,
    "수레국화":1,
    "양귀비":1,
    "영혼 흙":8,
    "유리병":18,
    "진홍빛 자루":8,
  },
  "무저의 척추 ★★★": {
    "소라 ★★★":1,
    "문어 ★★★":2,
    "미역 ★★★":1,
    "성게 ★★★":2,
    "데이지":1,
    "뒤틀린 자루":8,
    "마그마 블록":8,
    "발광 먹물 주머니":3,
    "발광 열매":6,
    "불우렁쉥이":6,
    "선애기별꽃":1,
    "양귀비":1,
    "영혼 흙":16,
    "유리병":18,
    "진홍빛 자루":4,
  },
};

// fish usage matrix A[fishIdx][prodIdx]
const A = FISH_ROWS.map(fr => PRODUCTS.map(p => (DECOMP[p.name] && DECOMP[p.name][fr]) ? DECOMP[p.name][fr] : 0));

function clampInt(v, lo, hi){
  v = Number(v);
  if(!Number.isFinite(v)) return lo;
  v = Math.round(v);
  return Math.max(lo, Math.min(hi, v));
}
function premiumMultiplier(level){
  const map = {0:1.00, 1:1.05, 2:1.07, 3:1.09, 4:1.12, 5:1.15, 6:1.20, 7:1.25, 8:1.30};
  return map[level] ?? 1.00;
}
function stormProb(level){
  const map = {0:0.00, 1:0.05, 2:0.07, 3:0.10, 4:0.15, 5:0.20};
  return map[level] ?? 0.00;
}
function star3Bonus(level){
  const map = {0:0.00, 1:0.01, 2:0.03, 3:0.05, 4:0.07, 5:0.10, 6:0.15};
  return map[level] ?? 0.00;
}
function applyStarBonus(base, level){
  const bonus = star3Bonus(level);

  let p1 = Number(base.p1 || 0);
  let p2 = Number(base.p2 || 0);
  let p3 = Number(base.p3 || 0);

  // 방어
  if(!Number.isFinite(p1)) p1 = 0;
  if(!Number.isFinite(p2)) p2 = 0;
  if(!Number.isFinite(p3)) p3 = 0;

  return {
    p1,                 // ✅ 고정
    p2,                 // ✅ 고정
    p3: p3 + bonus      // ✅ 3성만 증가
  };
}

function baseDropFromTool(level){
  // level: representative value for range (select option value)
  const map = {3:3, 6:4, 9:5, 12:6, 14:7, 15:10};
  return map[level] ?? 5;
}

function fmtWon(n){
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
}

function fmtGold(n){
  return `${fmtWon(n)} G`;
}


// --- 가격을 등급(★/★★/★★★) 단위로 "최고가"로 통일 (탭1/탭2 공용) ---
function getTierFromName(name){
  if(!name) return 1;
  // ✅ 0티어: 추출된 희석액은 별(★)이 없으므로 예외 처리
  if(String(name).includes("추출된 희석액")) return 0;
  if (name.includes("★★★")) return 3;
  if (name.includes("★★")) return 2;
  return 1;
}
function equalizePricesWithinTierMax(prices){
  // prices: PRODUCTS와 같은 인덱스 정렬
  const maxByTier = {1:0,2:0,3:0};
  for(let i=0;i<PRODUCTS.length;i++){
    const t = getTierFromName(PRODUCTS[i].name);
    const v = Number(prices[i]||0);
    if (v > (maxByTier[t]||0)) maxByTier[t] = v;
  }
  return prices.map((v,i)=>{
    const t = getTierFromName(PRODUCTS[i].name);
    const mx = maxByTier[t];
    return mx ? mx : Number(v||0);
  });
}





function fmtSmart(n, maxD = 2){
  const v = Number(n);
  if(!Number.isFinite(v)) return "-";
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-9){
    return r.toLocaleString();
  }
  // round to maxD decimals to avoid float noise, then print with locale separators
  const vv = Number(v.toFixed(maxD));
  return vv.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: maxD });
}

function fmtNum(n, maxD = 4){
  return fmtSmart(n, maxD);
}
function set64(x){
  x = Math.max(0, Math.floor(x));
  const sets = Math.floor(x/64);
  const rem = x % 64;
  if(sets===0) return `${rem}개`;
  if(rem===0) return `${sets}세트`;
  return `${sets}세트 ${rem}개`;
}

/** -------- UI build -------- */
const craftBody = document.querySelector("#craftTbl tbody");
const invBody = document.querySelector("#invTbl tbody");
const allocBody = document.querySelector("#allocTbl tbody");

function buildTables(){
  craftBody.innerHTML = "";
  PRODUCTS.forEach((p, idx)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
<td><span class="tipName" data-tipname="${p.name}">${productLabel(p.name)}</span></td>
      <td class="mono">${fmtGold(p.base)}</td>
      <td class="mono" id="final_${idx}">-</td>
      <td><input type="number" min="0" step="1" value="0" style="width:120px;max-width:100%" id="qty_${idx}"></td>
      <td class="mono" id="rev_${idx}">0</td>
    `;
    craftBody.appendChild(tr);
  });

  invBody.innerHTML = "";
  const __ord = __fishOrderedIndices();
  let __lastT = null;
  __ord.forEach(i=>{
    const name = FISH_ROWS[i];
    const t = __fishStarCount(name);
    if(t !== __lastT){
      __lastT = t;
      const trH = document.createElement("tr");
      trH.className = `tier-sep tier-${t}`;
      trH.innerHTML = `<td colspan="2" class="tier-title">${__tierLabel(t)}</td>`;
      invBody.appendChild(trH);
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${matLabel(name,false)}</td>
      <td><span class="qty-pair">
        <input type="number" min="0" step="1" value="0" data-setea="set" id="inv_set_${i}">
        <span class="unit set">세트</span>
        <input type="number" min="0" step="1" value="0" data-setea="ea" id="inv_ea_${i}">
        <span class="unit ea">개</span>
      </span></td>
    `;
    invBody.appendChild(tr);
  });
renderAlloc([0,0,0,0,0], 0, 15);
}
buildTables();

function readInputs(){
  const totalStamina = Number(document.getElementById("totalStamina").value) || 0;
  const staminaPerCast = Math.max(1, Number(document.getElementById("staminaPerCast").value) || 15);
  const toolLevel = Number(document.getElementById("toolLevel").value) || 9;

  const premiumLevel = clampInt(document.getElementById("premiumLevel").value, 0, 8);
  const stormLevel = clampInt(document.getElementById("stormLevel").value, 0, 5);
  const starLevel = clampInt(document.getElementById("starLevel").value, 0, 6);

  const p1 = Number(document.getElementById("p1").value) || 0;
  const p2 = Number(document.getElementById("p2").value) || 0;
  const p3 = Number(document.getElementById("p3").value) || 0;

  return { totalStamina, staminaPerCast, toolLevel, premiumLevel, stormLevel, starLevel, p1, p2, p3 };
}

function getDerived(){
  const inp = readInputs();
  const premiumMul = premiumMultiplier(inp.premiumLevel);
const stormP = stormProb(inp.stormLevel);
const baseDrop = baseDropFromTool(inp.toolLevel);

// (변경) 채집 1회(캐스트)당 확률 p로 드랍이 +1개 되는 모델 => 기대값: k + 1*p
const dropPerCast = baseDrop + stormP;


  const baseProbs = {p1:inp.p1, p2:inp.p2, p3:inp.p3};
  const probs = applyStarBonus(baseProbs, inp.starLevel);

  const casts = inp.totalStamina > 0 ? (inp.totalStamina / inp.staminaPerCast) : 0;
  const totalDrops = casts * dropPerCast;

  return {inp, premiumMul, stormP, baseDrop, dropPerCast, probs, casts, totalDrops};
}

function renderSummary(d){
  document.getElementById("outPremium").textContent = fmtSmart(d.premiumMul, 2);
  document.getElementById("outStorm").textContent   = fmtSmart(d.stormP, 2);
  document.getElementById("outDropPerCast").textContent = fmtSmart(d.dropPerCast, 2);
  document.getElementById("outCasts").textContent = fmtSmart(d.casts, 2);
  document.getElementById("outTotalDrops").textContent = fmtSmart(d.totalDrops, 2);

  document.getElementById("outP1").textContent = fmtSmart(d.probs.p1, 4);
  document.getElementById("outP2").textContent = fmtSmart(d.probs.p2, 4);
  document.getElementById("outP3").textContent = fmtSmart(d.probs.p3, 4);
}

function renderAlloc(blocks, castsPer100, staminaPerCast){
  allocBody.innerHTML = "";
  for(let i=0;i<5;i++){
    const tr = document.createElement("tr");
    const casts = blocks[i] * castsPer100;
    tr.innerHTML = `
      <td>${FISH_NAMES[i]}</td>
      <td class="mono">${blocks[i]}</td>
      <td class="mono">${blocks[i]*100}</td>
      <td class="mono">${fmtSmart(casts, 2)}</td>
    `;
    allocBody.appendChild(tr);
  }
}

/** -------- Simplex LP solver (max c^T x, Ax <= b, x>=0) -------- */
function simplexMax(A, b, c){
  const m = A.length;
  const n = c.length;

  // tableau size: (m+1) x (n+m+1)
  const cols = n + m + 1;
  const T = Array.from({length:m+1}, ()=>Array(cols).fill(0));

  // constraints
  for(let i=0;i<m;i++){
    for(let j=0;j<n;j++) T[i][j] = A[i][j];
    T[i][n+i] = 1; // slack
    T[i][cols-1] = b[i];
  }
  // objective row: maximize => put -c
  for(let j=0;j<n;j++) T[m][j] = -c[j];

  // basis: slack vars
  const basis = Array.from({length:m}, (_,i)=> n+i);

  const EPS = 1e-9;

  function pivot(row, col){
    const piv = T[row][col];
    if(Math.abs(piv) < EPS) return false;
    // normalize row
    for(let j=0;j<cols;j++) T[row][j] /= piv;
    // eliminate col in other rows
    for(let i=0;i<m+1;i++){
      if(i===row) continue;
      const f = T[i][col];
      if(Math.abs(f) < EPS) continue;
      for(let j=0;j<cols;j++){
        T[i][j] -= f * T[row][j];
      }
    }
    basis[row] = col;
    return true;
  }

  let iter = 0;
  const MAX_ITER = 4000;

  while(iter++ < MAX_ITER){
    // entering variable: most negative in objective row
    let col = -1;
    let minVal = -EPS;
    for(let j=0;j<cols-1;j++){
      const v = T[m][j];
      if(v < minVal){
        minVal = v;
        col = j;
      }
    }
    if(col === -1) break; // optimal

    // leaving variable: min ratio
    let row = -1;
    let best = Infinity;
    for(let i=0;i<m;i++){
      const a = T[i][col];
      if(a > EPS){
        const ratio = T[i][cols-1] / a;
        if(ratio < best - 1e-12){
          best = ratio; row = i;
        }
      }
    }
    if(row === -1){
      // unbounded
      return {status:"unbounded", x:Array(n).fill(0), value:Infinity};
    }
    pivot(row, col);
  }

  // extract solution for original vars
  const x = Array(n).fill(0);
  for(let i=0;i<m;i++){
    const varIdx = basis[i];
    if(varIdx < n){
      x[varIdx] = T[i][cols-1];
    }
  }
  const value = T[m][cols-1]; // because objective in tableau
  return {status:"optimal", x, value};
}


function floorAndGreedyIntegerize(A, supply, prices, xFrac){
  // Start with floor
  const n = prices.length;
  const m = supply.length;
  const x = xFrac.map(v => Math.max(0, Math.floor(v + 1e-9)));

  // keep original for normalization (leftover-minimization tie-breaker)
  const supply0 = supply.slice();

  // remaining resources
  const rem = supply.slice();
  for(let i=0;i<m;i++){
    let used = 0;
    for(let j=0;j<n;j++) used += A[i][j]*x[j];
    rem[i] = rem[i] - used;
  }

  function fits(j){
    for(let i=0;i<m;i++){
      if(rem[i] + 1e-9 < A[i][j]) return false;
    }
    return true;
  }
  function consume(j){
    for(let i=0;i<m;i++) rem[i] -= A[i][j];
  }

  // Greedy: maximize (revenue density) with a tiny bonus to also reduce leftovers.
  // This helps choose between near-equivalent crafts so more fish types get consumed
  // without sacrificing revenue in any meaningful way.
  const MAX_ADD = 20000;
  let steps = 0;

  const maxP = prices.reduce((a,b)=>Math.max(a, b||0), 0);
  const EPS = maxP * 0.01; // 1% of max price (small tie-breaker scale)
  const BONUS_CAP = maxP * 0.05; // hard cap to avoid distortion

  while(steps++ < MAX_ADD){
    let best = -1;
    let bestScore = -1;

    for(let j=0;j<n;j++){
      if(!fits(j)) continue;

      // scarcity-weighted cost: sum (a_ij / max(rem_i,1))
      let cost = 0;
      // abundance bonus: prefer consuming resources that are currently left a lot
      let use = 0;

      for(let i=0;i<m;i++){
        const a = A[i][j];
        if(a<=0) continue;
        cost += a / Math.max(1, rem[i]);

        const denom = Math.max(1, supply0[i]);
        use += a * (rem[i] / denom);
      }

      // tiny bonus: among similar revenue choices, favor the one that consumes leftover more
      let bonus = EPS * use;
      if(bonus > BONUS_CAP) bonus = BONUS_CAP;

      const score = (prices[j] + bonus) / Math.max(1e-9, cost);

      if(score > bestScore){
        bestScore = score;
        best = j;
      }
    }

    if(best === -1) break;
    x[best] += 1;
    consume(best);
  }

  // objective value
  let value = 0;
  for(let j=0;j<n;j++) value += prices[j]*x[j];
  return {x, value, rem};
}

function computeSupplyForBlocks(blocks, d){
  // inventory
  const supply = Array(FISH_ROWS.length).fill(0);
  for(let i=0;i<FISH_ROWS.length;i++){
    const inv = Math.max(0, Math.floor(Number(_readSetEa("inv", i)) || 0));
    supply[i] = inv;
  }

  // expected catch
  const castsPer100 = 100 / Math.max(1, d.inp.staminaPerCast);
  for(let f=0; f<5; f++){
    const casts = blocks[f] * castsPer100;
    const drops = casts * d.dropPerCast; // total fish items expected from that fish (independent of star)
    const base = f*3;
    supply[base+0] += drops * d.probs.p1;
    supply[base+1] += drops * d.probs.p2;
    supply[base+2] += drops * d.probs.p3;
  }

  // ✅ 중간재 재고가 절약해주는 어패류를 supply에 가산
  const fishCredit = getFishCreditFromMidInv();
  for(const [fishName, qty] of Object.entries(fishCredit)){
    const idx = FISH_ROWS.indexOf(fishName);
if(idx >= 0) supply[idx] += Math.max(0, Math.floor(Number(qty || 0)));

  }


  return supply;
}

function optimize(){
  const d = getDerived();
  renderSummary(d);

  const blocksTotal = Math.floor(d.inp.totalStamina / 100);
  if(blocksTotal <= 0){
    alert("총 스태미나가 너무 작습니다.");
    return;
  }

  // prices with premium
  let prices = PRODUCTS.map(p => p.base * d.premiumMul);
  prices = equalizePricesWithinTierMax(prices);

  // TAB1 uses only the original 9 final products (exclude dilution from LP)
  const N_TAB1 = 9;
  prices = prices.slice(0, N_TAB1);
// enumerate all compositions of blocksTotal into 5 parts
  let best = {rev:-1, blocks:[0,0,0,0,0], y:Array(PRODUCTS.length).fill(0), supply:null};

  const m = FISH_ROWS.length;
  const n = PRODUCTS.length;

  // enumerate using 4 nested loops (faster than recursion)
  for(let a=0; a<=blocksTotal; a++){
    for(let b=0; b<=blocksTotal-a; b++){
      for(let c=0; c<=blocksTotal-a-b; c++){
        for(let d4=0; d4<=blocksTotal-a-b-c; d4++){
          const e = blocksTotal - a - b - c - d4;
          const blocks = [a,b,c,d4,e];

          const supply = computeSupplyForBlocks(blocks, d);

          // Solve LP: maximize prices^T y subject to A*y <= supply, y>=0
          const res = simplexMax(A, supply, prices);
          if(res.status !== "optimal") continue;

          // 제작량 정수 강제: floor + 잔여 재고로 greedy 추가
          const intRes = floorAndGreedyIntegerize(A, supply, prices, res.x);
          const rev = intRes.value;

          if(rev > best.rev + 1e-6){
            best = {rev, blocks, y:intRes.x, supply};
          }
        }
      }
    }
  }

  // render alloc
  const castsPer100 = 100 / Math.max(1, d.inp.staminaPerCast);
  renderAlloc(best.blocks, castsPer100, d.inp.staminaPerCast);

  // set craft quantities (editable)
  PRODUCTS.forEach((p, idx)=>{
    document.getElementById(`qty_${idx}`).value = Math.max(0, Math.floor((idx < 9 ? (best.y[idx]||0) : 0)));
  });

  // update derived tables
  recalcFromCurrent();
}

function recalcFromCurrent(){
  const d = getDerived();
  renderSummary(d);

  let revenueSum = 0;

  const needFish = new Map();
  const needMat  = new Map();

  PRODUCTS.forEach((p, idx)=>{
const finalPrice = Math.round(p.base * d.premiumMul);
document.getElementById(`final_${idx}`).textContent = fmtGold(finalPrice);

const craftQty = Math.max(0, Number(document.getElementById(`qty_${idx}`).value) || 0);
const invQty   = getMidInvQty(p.name);
const qty      = craftQty + invQty;

const rev = finalPrice * qty;

revenueSum += rev;
document.getElementById(`rev_${idx}`).textContent = fmtGold(rev);


    const dec = DECOMP[p.name];
    if(dec){
      for(const [k,v] of Object.entries(dec)){
        const add = v * qty;
        if(FISH_ROWS.includes(k)){
          needFish.set(k, (needFish.get(k)||0) + add);
        }else{
          needMat.set(k, (needMat.get(k)||0) + add);
        }
      }
    }
  });

  document.getElementById("revSum").textContent = fmtGold(revenueSum);
  document.getElementById("outRevenue").textContent = fmtGold(revenueSum);

  // --- Trade context (expected) ---
  try{
    const qtyArr = PRODUCTS.map((_, idx)=> Math.max(0, Number(document.getElementById(`qty_${idx}`).value)||0));
    const priceArr = PRODUCTS.map(p=> Math.round(p.base * d.premiumMul));
    window.__lastExpectedTradeCtx = {kind:"expected", baseRevenue: revenueSum, qtyArr, priceArr};
    updateTradeForActiveTab();
  }catch(e){}

  
  // ✅ 표기용 필요량: 중간재 재고는 이미 완성된 것으로 보고(=필요량에서 차감)
  try{
    const nn = calcNetNeedsForExpectedWithMidInv();
    if(nn && nn.needFish && nn.needMat){
      needFish.clear(); nn.needFish.forEach((v,k)=> needFish.set(k,v));
      needMat.clear();  nn.needMat.forEach((v,k)=>  needMat.set(k,v));
    }
  }catch(e){ /* 표시만 실패해도 UI는 계속 */ }

// inventory fish
  const invFish = new Map();
  FISH_ROWS.forEach((name, i)=>{
    invFish.set(name, Math.max(0, Math.floor(Number(_readSetEa("inv", i)) || 0)));
  });

  // render need fish
  const fishTBody = document.querySelector("#needFishTbl tbody");
    fishTBody.innerHTML = "";
    FISH_ROWS.forEach((name)=>{
      const need = Math.max(0, Math.floor(Number(needFish.get(name)||0)));
      const inv = Math.max(0, Math.floor(Number(invFish.get(name)||0)));
      const lack = Math.max(0, need - inv);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${matLabel(name,false)}</td>
        <td class="mono ${inv===0?'zero':''}">${fmtSet64(inv)}</td>
        <td class="mono ${need===0?'zero':''}">${fmtSet64(need)}</td>
        <td class="mono ${lack>0?'neg':'zero'}">${fmtSet64(lack)}</td>
      `;
      fishTBody.appendChild(tr);
    });

  // render materials
  const matTBody = document.querySelector("#needMatTbl tbody");
  matTBody.innerHTML = "";
  const mats = Array.from(needMat.entries()).sort((a,b)=> (matRank(a[0]) - matRank(b[0])) || (b[1]-a[1]) || a[0].localeCompare(b[0]));
  mats.forEach(([name, qty])=>{
    if(qty <= 1e-9) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${matLabel(name,false)}</td>
      <td class="mono right">${fmtSet64(qty)}</td>
    `;
    matTBody.appendChild(tr);
  });
}


/** -------- Actual(채집 후) panel -------- */
let LAST_ACTUAL = null;
const LS_KEY_BASE = "ddtycoon_baseInv_v1";



const LS_KEY_EXPECTED = "ddtycoon_expectedInv_v1";
const LS_KEY_CRAFTCHECK = "ddtycoon_craftcheck_v1";

function getExpectedInv(){
  return FISH_ROWS.map((_, i)=> Math.max(0, Math.floor(_readSetEa("inv", i))));
}
function setExpectedInv(arr){
  if(!Array.isArray(arr) || arr.length !== FISH_ROWS.length) return;
  arr.forEach((v,i)=>{ 
    const el = document.getElementById(`inv_${i}`);
    if(el) el.value = Math.max(0, Math.floor(Number(v||0))); 
  });
}
function saveExpectedInv(){
  localStorage.setItem(LS_KEY_EXPECTED, JSON.stringify(getExpectedInv()));
}
function loadExpectedInv(){
  const raw = localStorage.getItem(LS_KEY_EXPECTED);
  if(!raw) return;
  try{
    const arr = JSON.parse(raw);
    if(Array.isArray(arr) && arr.length===FISH_ROWS.length){
        }
  }catch(e){}
}

// 탭1(기댓값) 재고 → 탭2(기존 재고) 자동 복사
function syncExpectedToBase(ev){
  if(ev && ev.type && ev.type !== "click") return;
  const arr = getExpectedInv();
  arr.forEach((v,i)=>{ _writeSetEa("base", i, v); });
  updateTotalsActual();
}



function buildInvActual(){
  const tb = document.querySelector("#invActualTbl tbody");
  tb.innerHTML = "";

  const __ord = __fishOrderedIndices();
  let __lastT = null;

  __ord.forEach(i=>{
    const label = FISH_ROWS[i];
    const t = __fishStarCount(label);

    if(t !== __lastT){
      __lastT = t;
      const trH = document.createElement("tr");
      trH.className = `tier-sep tier-${t}`;
      trH.innerHTML = `<td colspan="4" class="tier-title">${__tierLabel(t)}</td>`;
      tb.appendChild(trH);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
<td>${matLabel(label)}</td>
      <td><span class="qty-pair">
        <input id="base_set_${i}" data-setea="set" type="number" min="0" step="1" value="0"/>
        <span class="unit set">세트</span>
        <input id="base_ea_${i}" data-setea="ea" type="number" min="0" step="1" value="0"/>
        <span class="unit ea">개</span>
      </span></td>
      <td><span class="qty-pair">
        <input id="harv_set_${i}" data-setea="set" type="number" min="0" step="1" value="0"/>
        <span class="unit set">세트</span>
        <input id="harv_ea_${i}" data-setea="ea" type="number" min="0" step="1" value="0"/>
        <span class="unit ea">개</span>
      </span></td>
      <td class="right" id="tot_${i}">0</td>
    `;
    tb.appendChild(tr);
  });

  // change listeners (existing behavior)
  FISH_ROWS.forEach((_, i)=>{
    ["base_set_","base_ea_","harv_set_","harv_ea_"].forEach(p=>{
      document.getElementById(`${p}${i}`)?.addEventListener("change", updateTotalsActual);
    });
  });

  updateTotalsActual();
}


function updateTotalsActual(){
  FISH_ROWS.forEach((_, i)=>{
    const b = _readSetEa("base", i);
    const h = _readSetEa("harv", i);
    const t = Math.max(0, Math.floor(b) + Math.floor(h));
    const el = document.getElementById(`tot_${i}`);
    if(el) el.textContent = String(t);
  });
}


function saveBaseInv(){
  // baseInv 저장

  const base = FISH_ROWS.map((_, i)=> Math.max(0, Math.floor(_readSetEa("base", i))));
  localStorage.setItem(LS_KEY_BASE, JSON.stringify(base));
  // 탭1에도 동일하게 저장
  localStorage.setItem(LS_KEY_EXPECTED, JSON.stringify(base));
}

function loadBaseInv(){
  const raw = localStorage.getItem(LS_KEY_BASE);
  if(!raw) return;
  try{
    const arr = JSON.parse(raw);
    if(Array.isArray(arr) && arr.length === FISH_ROWS.length){
      arr.forEach((v,i)=>{ document.getElementById(`base_${i}`).value = Math.max(0, Math.floor(Number(v||0))); });
      updateTotalsActual();
    }
  }catch(e){}
}

function getActualSupply(){
  const supply = FISH_ROWS.map((_, i)=> Number(document.getElementById(`tot_${i}`).textContent || 0));
   // ✅ 중간재 재고가 절약해주는 어패류를 supply에 가산
  const fishCredit = getFishCreditFromMidInv();
  for(const [fishName, qty] of Object.entries(fishCredit)){
    const idx = FISH_ROWS.indexOf(fishName);
if(idx >= 0) supply[idx] += Math.max(0, Math.floor(Number(qty || 0)));

  }

 return supply.map(v=>Math.max(0, Math.floor(v)));
}

// ================================
// REAL INVENTORY SIMULATION (CLAMP)
// - Enforces real inventory for LP plan
// ================================
function simulateByInventoryFromLP(x, items){
  const recipes = getAllRecipesForMid();
  const inv = {};
  // fish supply (base+harvest + fish credit)
  try{
    const supply = getActualSupply();
    FISH_ROWS.forEach((name, idx)=>{ inv[name] = Math.max(0, Math.floor(Number(supply[idx]||0))); });
  }catch(e){}
  // mid inventory stored
  try{
    const mid = (typeof loadMidInv === 'function') ? (loadMidInv()||{}) : {};
    for(const [k,v] of Object.entries(mid)){
      inv[k] = (inv[k]||0) + Math.max(0, Math.floor(Number(v||0)));
    }
  }catch(e){}

  const yld = (name)=> Math.max(1, (typeof recipeYield==='function') ? recipeYield(name) : 1);
  const crafts = {};

  (items||[]).forEach((name, idx)=>{
    const want = Math.max(0, Math.floor(Number(x[idx]||0)));
    if(!want){ crafts[name]=0; return; }
    const r = recipes[name];
    if(!r){ crafts[name]=0; return; }

    let maxByInv = want;
    for(const [ing, per0] of Object.entries(r)){
      const per = Math.max(0, Math.floor(Number(per0||0)));
      if(per<=0) continue;
      if(!(ing in inv)) continue;
      const have = Math.max(0, Math.floor(Number(inv[ing]||0)));
      maxByInv = Math.min(maxByInv, Math.floor(have / per));
      if(maxByInv<=0) break;
    }

    const doCraft = Math.max(0, Math.min(want, maxByInv));
    crafts[name] = doCraft;

    // consume
    for(const [ing, per0] of Object.entries(r)){
      const per = Math.max(0, Math.floor(Number(per0||0)));
      if(per<=0) continue;
      if(!(ing in inv)) continue;
      inv[ing] = Math.max(0, Math.floor(Number(inv[ing]||0)) - per*doCraft);
    }
    // produce
    inv[name] = (inv[name]||0) + yld(name)*doCraft;
  });

  return { crafts, inv };
}


function renderActualResult(y, prices, supply, usedFish){
  // craft table
  const tb = document.querySelector("#craftTblA tbody");
  tb.innerHTML = "";

  // ✅ 표시용(실제가): base * premiumMul (등급 통일 전)
  const premiumLevel = Number(document.getElementById("premiumLevel")?.value || 0);
  const premiumMul = premiumMulFromLevel(premiumLevel);
  const viewPrices = PRODUCTS.map(p => Math.round(Number(p.base || 0) * premiumMul));

  let sum = 0;

  // ✅ 티어별(★) 헤더 + 원래 PRODUCTS 순서 유지
  const __idxs = PRODUCTS.map((_,i)=>i).sort((a,b)=>{
    const ta = getTierFromName(PRODUCTS[a].name);
    const tb = getTierFromName(PRODUCTS[b].name);
    return (ta - tb) || (a - b);
  });
  let __lastT = null;

  __idxs.forEach((i)=>{
    const p = PRODUCTS[i];
    const t = getTierFromName(p.name);

    if(t !== __lastT){
      __lastT = t;
      const trH = document.createElement("tr");
      trH.className = `tier-sep tier-${t}`;
      trH.innerHTML = `<td colspan="5" class="tier-title">${__tierLabel(t)}</td>`;
      tb.appendChild(trH);
    }

    const qty = Math.max(0, Math.floor(y[i]||0));
    const invQty = getMidInvQty(p.name);
    const sellQty = qty + invQty;

    const unitView = viewPrices[i];          // ✅ 표기용 단가
    const rev = sellQty * unitView;
    sum += rev;

    const tr = document.createElement("tr");
    const ck = getCraftCheck(i);

    tr.innerHTML =
`<td><span class="tipName"
      data-tipname="${p.name}"
      data-tipkind="final"
      data-tipqty="${qty}"
    >${productLabel(p.name)}</span></td>
<td class="right">${fmtGold(unitView)}</td>
<td class="right">${sellQty}</td>

<td class="right">${fmtGold(rev)}</td>` +
`<td class="center checkCell">
   <label class="checkbox">
     <input class="chk" type="checkbox" ${ck?"checked":""} data-idx="${i}">
   </label>
 </td>`;

    tb.appendChild(tr);
  });


  document.getElementById("revSumA").textContent = fmtGold(sum);
  // === FORCE_SYNC_EXPECTED_FROM_TRADE ===
  try{
    const top = document.getElementById("revBadgeA");
    const tradeTotal = document.getElementById("revSumTradeA");
    const baseTotal  = document.getElementById("revSumA");
    if(top){
      if(tradeTotal && tradeTotal.textContent && tradeTotal.textContent.trim() !== "0 G"){
        top.textContent = tradeTotal.textContent;
      }else if(baseTotal){
        top.textContent = baseTotal.textContent;
      }
    }
  }catch(e){}


  // --- Trade context (actual) ---
  try{
    const qtyArr = PRODUCTS.map((_, idx)=> Math.max(0, Math.floor(Number(y[idx]||0))));

    // ✅ 무역 보너스도 "표시용(실제가)" 기준으로 계산되게 넘김
    const priceArr = viewPrices.map(v => Math.round(Number(v||0)));

    window.__lastActualTradeCtx = {kind:"actual", baseRevenue: sum, qtyArr, priceArr};
    updateTradeForActiveTab();
  }catch(e){}

const badge = document.getElementById("revBadgeA");
const tradeTotal = document.getElementById("revSumTradeA");

if(badge){
  if(tradeTotal && tradeTotal.textContent){
    badge.textContent = tradeTotal.textContent; // 무역 포함
  }else{
    badge.textContent = fmtGold(sum); // 무역 미적용 fallback
  }
}


  
  const {needFish, needMat} = calcNetNeedsForActualWithMidInv(y);
  renderNeedFishTableTo("#needFishTblA tbody", needFish, supply);

  // ✅ 중간재 필요 제작량: 티어 헤더 포함
  let craftPlan = [];
if (window.LAST_ACTUAL && LAST_ACTUAL.sim && LAST_ACTUAL.sim.crafts) {
  const sim = LAST_ACTUAL.sim;
  craftPlan = MID_ITEMS.map(name=>{
    const c = Math.max(0, Math.floor(sim.crafts[name]||0));
    const yld = Math.max(1, recipeYield(name));
    return { name, crafts:c, craft:c*yld, inv:(typeof getMidInvQty==='function')?getMidInvQty(name):0 };
  }).filter(r=> r.craft>0 || r.inv>0);
} else {
  craftPlan = calcNetCraftPlanFromActual(y);
}

  renderNeedCraftTableTieredTo("#needCraftTblA tbody", craftPlan);

  // ✅ 부재료: '중간재 제작 순서(craftPlan)' 기준으로 누적
  // - 여기서 "정렬" 하지 않음 (Map 삽입 순서가 곧 표시 순서)
  // - 중간재/어패류는 제외하고 '진짜 부재료'만 집계
  const recipesAll = getAllRecipesForMid();
  const fishSet = new Set(FISH_ROWS);
  const needMatByTier = {1:new Map(), 2:new Map(), 3:new Map()};

  (craftPlan||[]).forEach(r=>{
    const midName = r?.name;
    const craftNeedQty = Math.max(0, Math.floor(Number(r?.craft || 0))); // 결과 개수 기준
    if(!midName || craftNeedQty<=0) return;

    const recipe = recipesAll[midName];
    if(!recipe) return;

    // 제작 횟수(crafts) 기준으로 재료 소모 계산 (x2 생산 반영)
    const crafts = (typeof qtyToCrafts === "function") ? qtyToCrafts(midName, craftNeedQty) : craftNeedQty;
    if(crafts<=0) return;

    const tier = getTierFromName(midName);
    const bucket = needMatByTier[tier] || needMatByTier[1];

    for(const [ing, per0] of Object.entries(recipe)){
      const per = Math.max(0, Math.floor(Number(per0||0)));
      if(per<=0) continue;

      // 어패류는 needFishTblA에서 처리
      if(fishSet.has(ing)) continue;

      // 중간재는 needCraftTblA에서 처리 (중복 집계 방지)
      if(typeof isMidItemName === "function" && isMidItemName(ing)) continue;

      const add = crafts * per;
      bucket.set(ing, (bucket.get(ing)||0) + add);
    }
  });

  renderNeedMatTableTieredTo("#needMatTblA tbody", needMatByTier);
}


function renderNeedFishTableTo(sel, needFish, supply){
  const tb = document.querySelector(sel);
  if(!tb) return;
  tb.innerHTML = "";

  const isMap = (needFish instanceof Map);

  FISH_ROWS.forEach((label, i)=>{
    const useRaw = isMap ? (needFish.get(label) || 0) : (needFish[i] || 0);
    const used = Math.round(Number(useRaw || 0));      // ✅ 소모
    const have = Math.floor(Number(supply[i] || 0));   // ✅ 재고
    const remain = Math.max(0, have - used);           // ✅ 잔여

    const tr = document.createElement("tr");
        const remCls  = remain > 0 ? "pos" : "muted";

    // 컬럼: 재고 / 소모 / 잔여
    tr.innerHTML =
      `<td>${matLabel(label)}</td>` +
      `<td class="right">${fmtSet64(have)}</td>` +
      `<td class="right">${fmtSet64(used)}</td>` +
      `<td class="right ${remCls}">${fmtSet64(remain)}</td>`;
    tb.appendChild(tr);
  });
}

function renderNeedMatTableTo(sel, needMat){
  const tb = document.querySelector(sel);
  if(!tb) return;
  tb.innerHTML = "";

  // ✅ Map / Object 둘 다 지원
  const entries = (needMat instanceof Map)
    ? Array.from(needMat.entries())
    : Object.entries(needMat || {});

  entries
    .sort((a,b)=> (matRank(a[0]) - matRank(b[0])) || a[0].localeCompare(b[0]))
    .forEach(([k, val])=>{
      const v = Math.round(Number(val || 0));
      if(v <= 0) return; // 0은 숨기고 싶지 않으면 이 줄 지워도 됨
      const set = fmtSet64(v);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${matLabel(k)}</td><td class="right">${set}</td>`;
      tb.appendChild(tr);
    });
}


// ===============================
// TAB2: 하위 제작 필요량(중간재) - 재고 반영
// - 추천 제작량(y)로부터 하위(정수/핵/에센스/결정/엘릭서/영약) 총 필요량을 전개
// - 중간재 재고(loadMidInv)를 먼저 소진하고, 부족분만 "추가 제작"으로 집계
// ===============================
function isMidItemName(name){
  // MID_SECTIONS 정의 순서를 그대로 사용
  for(const sec of MID_SECTIONS){
    if(sec.items && sec.items.includes(name)) return true;
  }
  return false;
}

function calcNetCraftPlanFromActual(yFinal){
  const recipes = getAllRecipesForMid(); // 최종품 포함(키:아이템명, 값:재료맵)
  const inv0 = (typeof loadMidInv === "function") ? (loadMidInv() || {}) : {};
  const inv = {};
  for(const [k,v] of Object.entries(inv0)) inv[k] = Math.max(0, Math.floor(Number(v||0)));

  const gross = {}; // 총 필요
  const net   = {}; // 추가 제작(재고 반영)

  const add = (obj, k, v) => {
    if(v <= 0) return;
    obj[k] = (obj[k] || 0) + v;
  };

  const expandGross = (item, qty, depth=0) => {
    qty = Math.max(0, Math.floor(Number(qty||0)));
    if(qty <= 0) return;
    if(depth > 60) return;

    if(isMidItemName(item)) add(gross, item, qty);

    const r = recipes[item];
    if(!r) return;
    for(const [mat, per] of Object.entries(r)){
      expandGross(mat, qty * Number(per||0), depth+1);
    }
  };

  const expandNet = (item, qty, depth=0) => {
    qty = Math.max(0, Math.floor(Number(qty||0)));
    if(qty <= 0) return;
    if(depth > 60) return;

    const r = recipes[item];
    if(!r) return;

    // ✅ 중간재면 재고를 먼저 소비하고, 부족분만 제작/전개
    if(isMidItemName(item)){
      const have = Math.max(0, Math.floor(Number(inv[item] || 0)));
      const use = Math.min(have, qty);
      if(use > 0) inv[item] = have - use;
      qty -= use;
      if(qty <= 0) return;

      add(net, item, qty);
    }

    for(const [mat, per] of Object.entries(r)){
      expandNet(mat, qty * Number(per||0), depth+1);
    }
  };

  PRODUCTS.forEach((p,i)=>{
    const qty = Math.max(0, Math.floor(Number(yFinal[i]||0)));
    if(!qty) return;
    expandGross(p.name, qty, 0);
    expandNet(p.name, qty, 0);
  });

  // 출력용 rows: MID_SECTIONS 순서로, 필요/재고/추가제작이 있는 것만
  const rows = [];
  for(const sec of MID_SECTIONS){
    for(const name of (sec.items || [])){
      const need = Math.max(0, Math.floor(Number(gross[name] || 0)));
      const invv = Math.max(0, Math.floor(Number(inv0[name] || 0)));
      const craft = Math.max(0, Math.floor(Number(net[name] || 0)));
      if(need <= 0 && invv <= 0 && craft <= 0) continue;
      rows.push({ name, need, inv: invv, craft });
    }
  }
  return rows;
}

function renderNeedCraftTableTo(sel, rows){
  const tb = document.querySelector(sel);
  if(!tb) return;
  tb.innerHTML = "";

  (rows || []).forEach(r=>{
    const tr = document.createElement("tr");

    // r.craft : 필요한 '제작 결과 개수' 기준
    // r.inv   : 재고 개수
    const craftNeedQty = Math.max(0, Math.floor(Number(r.craft || 0)));
    const invQty       = Math.max(0, Math.floor(Number(r.inv   || 0)));

    if(craftNeedQty <= 0 && invQty <= 0) return;

    // x2 / xN 제작 아이템 처리
    // - 툴팁(재료 계산)은 제작 횟수(crafts) 기준
    // - 표시는 실제 생산 개수 기준
    const yieldPerCraft =
      (typeof recipeYield === "function")
        ? Math.max(1, recipeYield(r.name))
        : 1;

    const crafts =
      (typeof qtyToCrafts === "function")
        ? qtyToCrafts(r.name, craftNeedQty)
        : Math.ceil(craftNeedQty / yieldPerCraft);

    const shownQty = crafts * yieldPerCraft;
    const totalQty = shownQty + invQty;

    const craftCls = shownQty > 0 ? "neg" : "muted";

    tr.innerHTML =
      `<td>
        <span class="tipName"
          data-tipname="${r.name}"
          data-tipqty="${crafts}"
        >${matLabel(r.name)}</span>
      </td>` +
      `<td class="right ${craftCls}">${fmtSet64(shownQty)}</td>` +
      `<td class="right">${fmtSet64(invQty)}</td>` +
      `<td class="right">${fmtSet64(totalQty)}</td>`;

    tb.appendChild(tr);
  });
}

// ===============================
// TAB2: Actual optimization with MID inventory balance (NO fish-credit)
// ===============================

// (중요) 탭2에서는 getActualSupply()를 쓰지 않는다.
// getActualSupply()가 mid credit을 더하고 있을 수 있으니, DOM에서 base_ + harv_만 직접 읽는다.
function readActualFishSupplyNoMid(){
  const out = Array(FISH_ROWS.length).fill(0);
  for(let i=0;i<FISH_ROWS.length;i++){
    const base = Math.max(0, Math.floor(_readSetEa("base", i)));
    const harv = Math.max(0, Math.floor(_readSetEa("harv", i)));
    out[i] = base + harv;
  }
  return out;
}

// resources(행) = fish(15) + mid items 전체
// items(열)     = recipes의 모든 산출물(중간재 + 최종품 9개 포함)
// 제약          = 소비 - 생산 <= 보유량  (생산은 자기 자신 -1)
function buildActualBalanceLP(pricesFinal){
  const fishNames = FISH_ROWS.slice();
  const midNames  = MID_ITEMS.slice();
  const resources = fishNames.concat(midNames);

  const fishSupply = readActualFishSupplyNoMid(); // ✅ mid credit 없음
  const midInv = loadMidInv();                    // ✅ 중간재 재고(그대로)

  // "중간재+최종품 레시피" 맵
const TIP_RECIPES = getAllRecipesForMid();

function getRecipeForTip(name){
  return TIP_RECIPES[name] || null;
}

  // ✅ LP main recipes: include mid + finals (incl. dilution)
  const recipes = getAllRecipesForMid();


  const items = Object.keys(recipes);
  const A = resources.map(()=> Array(items.length).fill(0));
  const b = resources.map(()=> 0);

  // b(보유량)
  for(let i=0;i<fishNames.length;i++) b[i] = Number(fishSupply[i] || 0);
  for(let j=0;j<midNames.length;j++){
    const nm = midNames[j];
    b[fishNames.length + j] = Math.max(0, Math.floor(Number(midInv[nm] || 0)));
  }

  // A(소비-생산)
  items.forEach((item, colIdx)=>{
    const ing = recipes[item] || {};

    // 재료 소비: +qty
    for(const [k, qty] of Object.entries(ing)){
      const rIdx = resources.indexOf(k);
      if(rIdx >= 0) A[rIdx][colIdx] += Number(qty || 0);
    }

    // 자신 생산: -recipeYield(item)
    const selfIdx = resources.indexOf(item);
    if(selfIdx >= 0) A[selfIdx][colIdx] += -recipeYield(item);
  });

  // 목적함수 c: 최종품만 가격, 중간재는 0
  const c = items.map(()=> 0);
  PRODUCTS.forEach((p, i)=>{
    const idx = items.indexOf(p.name);
    if(idx >= 0) c[idx] = pricesFinal[i];
  });

  return {A, b, c, items, resources, fishSupply};
}

// A*x 의 fish 부분(첫 15행) = 실제 어패류 사용량
function calcFishUsedFromLP(A, x){
  const fishCount = FISH_ROWS.length;
  const used = Array(fishCount).fill(0);
  for(let i=0;i<fishCount;i++){
    let s = 0;
    for(let j=0;j<x.length;j++) s += (A[i][j] || 0) * (x[j] || 0);
    used[i] = Math.max(0, Math.round(s));
  }
  return used;
}

function optimizeActual(){
  updateTotalsActual();

  // prices use premium level only (storm/star irrelevant after harvest)
  const premiumLevel = Number(document.getElementById("premiumLevel").value || 0);
  const premiumMul = premiumMulFromLevel(premiumLevel);
  let prices = PRODUCTS.map(p=> Math.round(p.base * premiumMul));
  prices = equalizePricesWithinTierMax(prices);

  // ✅ 탭2는 "재고 밸런스 LP"로 풂 (중간재를 중간재로 사용)
  const {A, b, c, items, fishSupply} = buildActualBalanceLP(prices);

  const res = simplexMax(A, b, c);
  if(res.status !== "optimal"){
    alert("최적화 실패: 입력 재고를 확인해줘.");
    return;
  }

  const intRes = floorAndGreedyIntegerize(A, b, c, res.x);

  // ✅ 기존 UI는 최종품 9개만 그리므로 yFinal만 추출
  const yFinal = PRODUCTS.map(p=>{
    const idx = items.indexOf(p.name);
    return idx >= 0 ? (intRes.x[idx] || 0) : 0;
  });

  LAST_ACTUAL = {
    x: intRes.x,          // 전체 변수(중간재 제작량 포함)
    y: yFinal,            // 최종품만
    prices,
    fishSupply,
    A
  };

const usedFish = calcFishUsedFromLP(LAST_ACTUAL.A, LAST_ACTUAL.x);

// ✅ clamp LP plan by real inventory before rendering anything
let yReal = yFinal;
try{
  if(Array.isArray(intRes.x) && Array.isArray(items)){
    const sim = simulateByInventoryFromLP(intRes.x, items);
    // build yReal from crafts of final products (PRODUCTS)
    yReal = PRODUCTS.map(p=>{
      const c = Math.max(0, Math.floor(sim.crafts[p.name]||0));
      return c * Math.max(1, recipeYield(p.name));
    });
    // stash for render stage too
    LAST_ACTUAL.sim = sim;
  }
}catch(e){}
renderActualResult(yReal, prices, fishSupply, usedFish);


}

 

// ===============================
// TAB2: Actual optimization with MID inventory balance (NO fish-credit)
// ===============================

// (중요) 탭2에서는 getActualSupply()를 쓰지 않는다.
// getActualSupply()가 mid credit을 더하고 있을 수 있으니, DOM에서 base_ + harv_만 직접 읽는다.
function readActualFishSupplyNoMid(){
  const out = Array(FISH_ROWS.length).fill(0);
  for(let i=0;i<FISH_ROWS.length;i++){
    const base = Math.max(0, Math.floor(_readSetEa("base", i)));
    const harv = Math.max(0, Math.floor(_readSetEa("harv", i)));
    out[i] = base + harv;
  }
  return out;
}



// resources(행) = fish(15) + mid items 전체
// items(열)     = recipes의 모든 산출물(중간재 + 최종품 9개 포함)
// 제약          = 소비 - 생산 <= 보유량  (생산은 자기 자신 -1)
function buildActualBalanceLP(pricesFinal){
  const fishNames = FISH_ROWS.slice();
  const midNames  = MID_ITEMS.slice(); // 네 프로젝트에 이미 존재
  const resources = fishNames.concat(midNames);

  const fishSupply = readActualFishSupplyNoMid(); // ✅ mid credit 없음
  const midInv = loadMidInv();                    // ✅ 중간재 재고(그대로)

  // 네 프로젝트에 이미 있는 "중간재+최종품 레시피" 함수 사용
  const recipes = getAllRecipesForMid(); // { itemName: {ingredientName: qty, ...}, ... }

  const items = Object.keys(recipes);
  const A = resources.map(()=> Array(items.length).fill(0));
  const b = resources.map(()=> 0);

  // b 채우기
  for(let i=0;i<fishNames.length;i++) b[i] = Number(fishSupply[i] || 0);
  for(let j=0;j<midNames.length;j++){
    const nm = midNames[j];
    b[fishNames.length + j] = Math.max(0, Math.floor(Number(midInv[nm] || 0)));
  }

  // A 채우기: (소비 +) (생산 -)
  items.forEach((item, colIdx)=>{
    const ing = recipes[item] || {};

    // 재료 소비
    for(const [k, qty] of Object.entries(ing)){
      const rIdx = resources.indexOf(k);
      if(rIdx >= 0) A[rIdx][colIdx] += Number(qty || 0);
    }

    // 자신 생산(배치 생산/yield 반영)
    // 소비-생산 <= 보유량 형태이므로, 생산량만큼 음수로 넣는다.
    const selfIdx = resources.indexOf(item);
    if(selfIdx >= 0) A[selfIdx][colIdx] += -recipeYield(item);
  });

  // 목적함수 c: 최종품만 가격, 중간재는 0
  const c = items.map(()=> 0);
  PRODUCTS.forEach((p, i)=>{
    const idx = items.indexOf(p.name);
    if(idx >= 0) c[idx] = pricesFinal[i];
  });

  return {A, b, c, items, resources, fishSupply};
}

// A*x 의 fish 부분(첫 15행) = 실제 어패류 순소비량(양수면 소모, 음수면 생산인데 fish는 생산 없으니 거의 양수)
function calcFishUsedFromLP(A, x){
  const fishCount = FISH_ROWS.length;
  const used = Array(fishCount).fill(0);
  for(let i=0;i<fishCount;i++){
    let s = 0;
    for(let j=0;j<x.length;j++) s += (A[i][j] || 0) * (x[j] || 0);
    used[i] = Math.max(0, Math.round(s));
  }
  return used;
}



function getCraftChecks(){
  const raw = localStorage.getItem(LS_KEY_CRAFTCHECK);
  if(!raw) return {};
  try{ const obj = JSON.parse(raw); return obj && typeof obj==="object" ? obj : {}; }catch(e){ return {}; }
}
function getCraftCheck(i){
  const obj = getCraftChecks();
  return !!obj[i];
}
function setCraftCheck(i, v){
  const obj = getCraftChecks();
  obj[i] = !!v;
  localStorage.setItem(LS_KEY_CRAFTCHECK, JSON.stringify(obj));
}

// hooks
document.getElementById("btnOpt").addEventListener("click", () => {
  const btn = document.getElementById("btnOpt");
  setButtonLoading(btn, true, "최적화 중…");

  // 버튼 UI가 먼저 그려지게 한 프레임 넘김
  requestAnimationFrame(() => {
    try {
      optimize(); // ✅ 기존 함수 그대로 호출
    } finally {
      setButtonLoading(btn, false);
    }
  });
});

document.getElementById("btnSolveActual").addEventListener("click", () => {
  const btn = document.getElementById("btnSolveActual");
  setButtonLoading(btn, true, "계산 중…");

  requestAnimationFrame(() => {
    try {
      optimizeActual(); // ✅ 기존 함수 그대로 호출
    } finally {
      setButtonLoading(btn, false);
    }
  });
});


document.getElementById("craftTblA").addEventListener("change",(e)=>{
  const t = e.target;
  if(t && t.classList && t.classList.contains("chk")){
    const idx = Number(t.getAttribute("data-idx"));
    setCraftCheck(idx, t.checked);
  }
});


// tabs
const tabExpected = document.getElementById("tabExpected");
const tabActual   = document.getElementById("tabActual");
const tabRecipe   = document.getElementById("tabRecipe");

const panelExpected = document.getElementById("panelExpected");
const panelActual   = document.getElementById("panelActual");
const panelRecipe   = document.getElementById("panelRecipe");

function showPanel(which){
  // 기본: 다 숨김
  if(panelExpected) panelExpected.style.display = "none";
  if(panelActual)   panelActual.style.display   = "none";
  if(panelRecipe)   panelRecipe.style.display   = "none";

  // active 처리
  [tabExpected, tabActual, tabRecipe].filter(Boolean).forEach(t=>t.classList.remove("active"));

  if(which === "expected"){
    tabExpected?.classList.add("active");
    if(panelExpected) panelExpected.style.display = "block";
  }else if(which === "actual"){
    tabActual?.classList.add("active");
    if(panelActual) panelActual.style.display = "block";
  }else{ // recipe
    tabRecipe?.classList.add("active");
    if(panelRecipe) panelRecipe.style.display = "block";
    // 첫 진입 시 렌더/포커스
    try{ initRecipeUI(); }catch(e){}
    const inp = document.getElementById("recipeSearch");
    if(inp) inp.focus({preventScroll:true});
  }
  try{ updateTradeForActiveTab(); }catch(e){}
}
tabExpected?.addEventListener("click", ()=>showPanel("expected"));
tabActual?.addEventListener("click", ()=>showPanel("actual"));
tabRecipe?.addEventListener("click", ()=>showPanel("recipe"));



// --- Trade UI init ---
(function initTradeUI(){
  const el = getTradeEls();
  if(!el.member) return;

  // restore saved
  applyTradeCfgToUI(loadTradeCfg());

  // events
  el.member.addEventListener("change", ()=>{
    syncTradeRowsVisibility();
    readTradeCfgFromUI();
    updateTradeForActiveTab();
  });

  for(let i=1;i<=5;i++){
    el.req(i)?.addEventListener("input", ()=>{
      readTradeCfgFromUI();
      updateTradeForActiveTab();
    });
    el.pct(i)?.addEventListener("input", ()=>{
      readTradeCfgFromUI();
      updateTradeForActiveTab();
    });
  }

  el.btnClear?.addEventListener("click", ()=>{
    for(let i=1;i<=5;i++){
      if(el.req(i)) el.req(i).value = "";
      if(el.pct(i)) el.pct(i).value = "";
    }
    readTradeCfgFromUI();
    updateTradeForActiveTab();
  });

  // initial message
  updateTradeForActiveTab();
})();
document.getElementById("btnZero").addEventListener("click", ()=>{
  FISH_ROWS.forEach((_, i)=> _readSetEa("inv", i) = 0);
  buildInvActual();
loadExpectedInv();
syncExpectedToBase();
loadBaseInv();
recalcFromCurrent();
});
document.querySelectorAll("#panelExpected input,#panelExpected select").forEach(el=>{
  el.addEventListener("change", ()=>recalcFromCurrent());
});

// 탭1 재고 변경 시 탭2 기존재고에도 자동 반영 + 저장
FISH_ROWS.forEach((_, i)=>{
  const el = document.getElementById(`inv_${i}`);
  if(el){
    el.addEventListener("change", ()=>{ saveExpectedInv(); syncExpectedToBase(); });
  }
});


/* =========================
   Tooltip (hover + pin)
   - no flicker: mousemove only moves position
   - click pin / outside click close / ESC close
   ========================= */

(() => {
  const tip = document.getElementById("recipeTip");
  if (!tip) return;

  let pinned = false;
  let pinnedEl = null;   // 고정시킨 원본 요소(수량 갱신용)
  let lastHtml = "";     // 같은 내용이면 innerHTML 재세팅 방지

  // 레시피 테이블 lazy init
  let TIP_RECIPES = null;
  const getRecipe = (name) => {
    if (!TIP_RECIPES) {
      TIP_RECIPES = (typeof getAllRecipesForMid === "function") ? (getAllRecipesForMid() || {}) : {};
    }
    return TIP_RECIPES[name] || null;
  };

  // 완성품 판별(없으면 PRODUCTS 기반으로라도)
  const isFinalProductName = (name) => {
    if (typeof isFinalProduct === "function") return !!isFinalProduct(name);
    return (typeof PRODUCTS !== "undefined") && PRODUCTS.some(p => p.name === name);
  };

  // ✅ 툴팁 라벨: ★ 숨기지 않음(원본 그대로 표시)
  // - 완성품: productLabel 사용
  // - 중간재/재료: matLabel 사용
  function tipLabel(name) {
    const raw = String(name || "");
    if (isFinalProductName(raw)) {
      return (typeof productLabel === "function") ? productLabel(raw) : raw;
    }
    return (typeof matLabel === "function") ? matLabel(raw) : raw;
  }


  function clampPos(x, y) {
    const pad = 12;
    const rect = tip.getBoundingClientRect();
    let nx = x, ny = y;

    if (nx + rect.width > window.innerWidth - pad) nx = window.innerWidth - pad - rect.width;
    if (nx < pad) nx = pad;

    if (ny + rect.height > window.innerHeight - pad) ny = window.innerHeight - pad - rect.height;
    if (ny < pad) ny = pad;

    return { nx, ny };
  }

  function setPosNearCursor(clientX, clientY) {
    // 기본: 커서 위쪽에 띄우고, 위가 부족하면 아래로
    tip.style.left = (clientX + 14) + "px";
    tip.style.top  = (clientY + 14) + "px";

    const rect = tip.getBoundingClientRect();
    let x = clientX + 14;
    let y = clientY - rect.height - 14;
    if (y < 12) y = clientY + 18;

    const p = clampPos(x, y);
    tip.style.left = p.nx + "px";
    tip.style.top  = p.ny + "px";
  }

function buildTipHtml(name, meta) {
  const r = getRecipe(name);
  if (!r) return null;

  const kind  = meta?.kind || (isFinalProductName(name) ? "final" : "mid");
  const qty   = Math.max(0, Math.floor(Number(meta?.qty ?? 0)));
  const craft = Math.max(0, Math.floor(Number(meta?.craft ?? qty ?? 0)));
  const need  = Math.max(0, Math.floor(Number(meta?.need ?? craft ?? 0)));
  const inv   = Math.max(0, Math.floor(Number(meta?.inv || 0)));

  
  // ── 세트/개 텍스트(툴팁 배지용, HTML span 없이) ──
  function fmtSet64Text(n){
    n = Math.max(0, Math.floor(Number(n || 0)));
    const set = Math.floor(n / 64);
    const ea  = n % 64;
    if(set > 0 && ea > 0) return `${set} 세트 ${ea} 개`;
    if(set > 0) return `${set} 세트`;
    return `${ea} 개`;
  }

  // ── meta.qty / meta.craft 는 "제작 횟수"로 들어올 수 있음(표에서 data-tipqty=crafts)
  const __tipCrafts = Math.max(0, Math.floor(Number(meta?.qty ?? meta?.craft ?? 0)));
  const __tipYield  = (typeof recipeYield === "function") ? Math.max(1, recipeYield(name)) : 1;
  const __tipMakeQty = __tipCrafts * __tipYield;
// 레시피 수량 배수는 “추가 제작” 기준
  const mul = (kind === "final")
    ? Math.max(1, Math.floor(Number(qty ?? craft ?? 0)))
    : Math.max(1, craft);

  // ── 타이틀: 산출물이므로 yield(×2) 표시 유지 ──
  const titleHtml = (kind === "final")
    ? productLabel(name)
    : matLabel(name);

  // ── 배지 규칙 ──
  let badges = "";

  if (kind === "final") {
    const rec = Math.max(0, Number(qty || craft || 0));
    badges = (__tipMakeQty > 0)
      ? `<span class="tipBadge">${fmtSet64Text(__tipMakeQty)}</span>`
      : `<span class="tipBadge">레시피</span>`;
  } else {
    badges = (__tipMakeQty > 0)
      ? `<span class="tipBadge">${fmtSet64Text(__tipMakeQty)}</span>`
      : `<span class="tipBadge">레시피</span>`;
  }

  // ── 재료 목록: 소비 재료 → yield(×2) 숨김 ──
  const lines = Object.entries(r)
    .map(([mat, per]) => {
      const total = Math.max(0, Math.floor(Number(per || 0) * mul));
      return `
        <div class="tipRow">
          <div class="tipLeft"><span>${matLabel(mat, false)}</span></div>
          <div class="tipQty">${fmtSet64(total)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="tipTop">
      <div class="tipTitle">${titleHtml}</div>
      <div class="tipBadges">${badges}</div>
    </div>
    <div class="tipList">${lines}</div>
  `;
}



  function showTip(clientX, clientY, name, meta) {
    const html = buildTipHtml(name, meta);
    if (!html) return;

    // 내용이 바뀔 때만 innerHTML (깜빡임 방지 핵심)
    if (html !== lastHtml) {
      tip.innerHTML = html;
      lastHtml = html;
    }

    tip.hidden = false;
    setPosNearCursor(clientX, clientY);
  }

  function hideTip() {
    tip.hidden = true;
    tip.classList.remove("pinned");
    lastHtml = "";
  }

  function unpin() {
    pinned = false;
    pinnedEl = null;
    hideTip();
  }

  // ✅ hover
  document.addEventListener("pointerover", (e) => {
    if (pinned) return;
    const el = e.target.closest("[data-tipname]");
    if (!el) return;

    const name = el.getAttribute("data-tipname");
    const meta = {
      kind: el.getAttribute("data-tipkind") || undefined,
      qty:  el.getAttribute("data-tipqty"),
      craft:el.getAttribute("data-tipcraft"),
      need: el.getAttribute("data-tipneed"),
      inv:  el.getAttribute("data-tipinv"),
    };

    showTip(e.clientX, e.clientY, name, meta);
  });

  // ✅ move: 위치만 이동(내용 X)
  document.addEventListener("pointermove", (e) => {
    if (tip.hidden) return;
    if (pinned) return;
    setPosNearCursor(e.clientX, e.clientY);
  });

  // ✅ out: 숨김(고정 중이면 유지)
  document.addEventListener("pointerout", (e) => {
    if (pinned) return;
    const el = e.target.closest("[data-tipname]");
    if (!el) return;
    hideTip();
  });

  // ✅ click pin / outside click close
  document.addEventListener("click", (e) => {
    // tooltip 자체 클릭은 유지
    if (e.target.closest("#recipeTip")) return;

    const el = e.target.closest("[data-tipname]");
    if (el) {
      // 클릭한 항목 고정
      pinned = true;
      pinnedEl = el;
      tip.classList.add("pinned");

      const name = el.getAttribute("data-tipname");
      const meta = {
        kind: el.getAttribute("data-tipkind") || undefined,
        qty:  el.getAttribute("data-tipqty"),
        craft:el.getAttribute("data-tipcraft"),
        need: el.getAttribute("data-tipneed"),
        inv:  el.getAttribute("data-tipinv"),
      };

      showTip(e.clientX, e.clientY, name, meta);
      return;
    }

    // 다른 곳 클릭하면 닫기
    if (pinned) unpin();
  });

  // ✅ ESC 해제
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pinned) unpin();
  });

  // (선택) 아이콘 늦게 뜨는 거 줄이기: 미리 로드
  window.addEventListener("DOMContentLoaded", () => {
    try {
      const urls = [];
      if (typeof PRODUCT_ICON_URL === "object") urls.push(...Object.values(PRODUCT_ICON_URL));
      if (typeof MATERIAL_ICON_URL === "object") urls.push(...Object.values(MATERIAL_ICON_URL));
      urls.filter(Boolean).forEach(u => { const im = new Image(); im.src = u; });
    } catch (_) {}
  });
})();



buildInvActual();
renderMidInvGrid();   // ✅ 이 줄
bindMidInvResetButtons();
updateMidInvBadge();
loadExpectedInv();
syncExpectedToBase();
loadBaseInv();
recalcFromCurrent();
updateTotalsActual();




/* =========================
   TAB3: 연금 레시피 UI (복구)
   - index.html의 #panelRecipe/#recipeList 구조를 그대로 사용
   - 새 기능/리디자인 없이 "목록이 안 뜨는" 문제만 해결
   ========================= */

let __RECIPE_UI_INITED__ = false;

function initRecipeUI(){
  if(__RECIPE_UI_INITED__) return;
  __RECIPE_UI_INITED__ = true;

  const host = document.getElementById("recipeList");
  if(!host) return;

  // 데이터: 기존 레시피 맵 재사용(중간재 + 최종품 포함)
  const RECIPES = (typeof getAllRecipesForMid === "function") ? (getAllRecipesForMid() || {}) : {};
  const NAMES = Object.keys(RECIPES);

  const FINAL_SET = new Set(((typeof PRODUCTS !== "undefined") && Array.isArray(PRODUCTS)) ? PRODUCTS.map(p=>p.name) : []);

  const hostDlg = document.getElementById("recipeListDlg");

  const inp = document.getElementById("recipeSearch");
  const btnClear = document.getElementById("btnRecipeClear");

  const dlg = document.getElementById("recipeDialog");
  const btnPop = document.getElementById("btnRecipePopup");
  const btnClose = document.getElementById("btnRecipePopClose");
  const inpDlg = document.getElementById("recipeSearchDlg");
  const btnClearDlg = document.getElementById("btnRecipeClearDlg");

  const kindText = (name) => FINAL_SET.has(name) ? "완성품" : "중간재";
  const titleHtml = (name) => FINAL_SET.has(name)
    ? (typeof productLabel === "function" ? productLabel(name) : escapeHtml(name))
    : (typeof matLabel === "function" ? matLabel(name) : escapeHtml(name));

  function normQ(q){
    return String(q||"").trim().toLowerCase();
  }

  function matchRecipe(name, q){
    if(!q) return true;
    const nq = normQ(q);
    if(String(name).toLowerCase().includes(nq)) return true;
    const ing = RECIPES[name] || {};
    return Object.keys(ing).some(k => String(k).toLowerCase().includes(nq));
  }

  // ---- 섹션/정렬 정책 ----
  // index.html에 이미 있는 .recipeGroup/.recipeGroupTitle UI를 그대로 사용
  // 별(★) 단계별로: (중간재 2개) → (완성품) 순서 고정
  // 1티어: 정수/핵, 2티어: 에센스/결정, 3티어: 엘릭서/영약

  const SECTIONS = [];
  const used = new Set();

  const starCount = (name)=>{
    const m = String(name).match(/★+/);
    return m ? m[0].length : 0;
  };

  const kindKey = (name)=>{
    name = String(name);
    if(name.includes("정수")) return "mid1a";
    if(name.includes("핵")) return "mid1b";
    if(name.includes("에센스")) return "mid2a";
    if(name.includes("결정")) return "mid2b";
    if(name.includes("엘릭서")) return "mid3a";
    if(name.includes("영약")) return "mid3b";
    return "final";
  };

  const ORDER = [
    { tier:1, kind:"mid1a", title:"정수 ★" },
    { tier:1, kind:"mid1b", title:"핵 ★" },
    { tier:1, kind:"final", title:"1티어 완성품 ★" },

    { tier:2, kind:"mid2a", title:"에센스 ★★" },
    { tier:2, kind:"mid2b", title:"결정 ★★" },
    { tier:2, kind:"final", title:"2티어 완성품 ★★" },

    { tier:3, kind:"mid3a", title:"엘릭서 ★★★" },
    { tier:3, kind:"mid3b", title:"영약 ★★★" },
    { tier:3, kind:"final", title:"3티어 완성품 ★★★" },
  ];

  // NAMES는 RECIPES 키 목록(원본 삽입 순서 유지)
  ORDER.forEach(sec=>{
    const items = NAMES.filter(n=>{
      if(starCount(n) !== sec.tier) return false;
      if(kindKey(n) !== sec.kind) return false;
      return true;
    });
    if(items.length){
      items.forEach(n=>used.add(n));
      SECTIONS.push({ title: sec.title, items });
    }
  });

  // 나머지(혹시 누락된 레시피가 있다면): 기존처럼 가나다 정렬
  const rest = NAMES.filter(n => !used.has(n));
  if(rest.length){
    rest.sort((a,b)=> a.localeCompare(b, "ko"));
    SECTIONS.push({ title: "기타", items: rest });
  }

  function renderCards(items){
    return items.map(name=>{
      const ing = RECIPES[name] || {};
      const ingHtml = Object.entries(ing).map(([mat, qty])=>{
        const qn = Math.max(0, Math.floor(Number(qty||0)));
        // tooltip 호버/핀 동작을 그대로 사용하기 위해 data-tipname 부여
        return `
          <div class="recipeIng" data-tipname="${escapeHtml(mat)}" data-tipkind="mid">
            ${escapeHtml(mat)}
            <span class="qty">×${qn}</span>
          </div>
        `;
      }).join("");

      return `
        <div class="recipeCard">
          <div class="recipeCardTop">
            <div><span class="tipName" data-tipname="${escapeHtml(name)}" data-tipkind="${FINAL_SET.has(name) ? "final" : "mid"}">${titleHtml(name)}</span></div>
            <div class="recipeKind">${kindText(name)}</div>
          </div>
          <div class="recipeIngs">${ingHtml}</div>
        </div>
      `;
    }).join("");
  }

  function renderInto(el, q){
    if(!el) return;
    const qq = normQ(q);

    const groups = SECTIONS
      .map(sec=>{
        const items = sec.items.filter(n => matchRecipe(n, qq));
        return { title: sec.title, items };
      })
      .filter(g => g.items.length > 0);

    if(groups.length === 0){
      el.innerHTML = `<div class="small" style="padding:6px 2px;opacity:.75">검색 결과가 없습니다.</div>`;
      return;
    }

    const html = groups.map(g=>{
      const cards = renderCards(g.items);
      return `
        <div class="recipeGroup">
          <div class="recipeGroupTitle">${escapeHtml(g.title)}</div>
          <div class="recipeCards">${cards}</div>
        </div>
      `;
    }).join("");

    el.innerHTML = html;
  }

  function syncAndRender(from){
    // from: "main" | "dlg"
    const qMain = inp ? inp.value : "";
    const qDlg  = inpDlg ? inpDlg.value : "";
    const q = (from === "dlg") ? qDlg : qMain;

    // 서로 검색어 동기화(UX)
    if(from === "dlg" && inp) inp.value = q;
    if(from === "main" && inpDlg) inpDlg.value = q;

    renderInto(host, q);
    renderInto(hostDlg, q);
  }

  // 초기 렌더
  syncAndRender("main");

  // 이벤트: 메인
  if(inp){
    inp.addEventListener("input", ()=>syncAndRender("main"));
  }
  if(btnClear){
    btnClear.addEventListener("click", ()=>{
      if(inp) inp.value = "";
      if(inpDlg) inpDlg.value = "";
      syncAndRender("main");
      inp?.focus({preventScroll:true});
    });
  }

  // 이벤트: 다이얼로그(있으면)
  if(inpDlg){
    inpDlg.addEventListener("input", ()=>syncAndRender("dlg"));
  }
  if(btnClearDlg){
    btnClearDlg.addEventListener("click", ()=>{
      if(inp) inp.value = "";
      if(inpDlg) inpDlg.value = "";
      syncAndRender("dlg");
      inpDlg?.focus({preventScroll:true});
    });
  }

  // 다이얼로그 열기/닫기 (기존 UI 존재 시에만)
  if(btnPop && dlg && typeof dlg.showModal === "function"){
    btnPop.addEventListener("click", ()=>{
      try{ dlg.showModal(); }catch(e){}
      syncAndRender("main");
      inpDlg?.focus({preventScroll:true});
    });
  }
  if(btnClose && dlg){
    btnClose.addEventListener("click", ()=>{ try{ dlg.close(); }catch(e){} });
  }
}


// 아주 작은 HTML escape (data-* 안전)
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}



/* =========================
   TODO BAR (개인 체크리스트)
   - 로그인/서버 없이 localStorage에 저장
   - 매일 00:00 초기화 그룹 / 매일 03:00 초기화 그룹
   - 남은 시간 타이머 표시
   - B 정책: 기본 펼침, 해당 그룹 모두 체크되면 자동 접힘, 초기화 시 자동 펼침
   ========================= */

(function(){
  const TODO_SPEC = [
    {
      key: "daily00",
      title: "00:00 초기화",
      resetHour: 0,
      items: [
        { id: "vote",  label: "👍추천", link: "https://minelist.kr/servers/16527-ddingtycoon.kr/votes/new" },
        { id: "login", label: "🎁접속 보상" },
      ],
    },
    {
      key: "daily03",
      title: "03:00 초기화",
      resetHour: 3,
      items: [
        { id: "stam",  label: "⚡스태미나" },
        { id: "req",   label: "📝의뢰" },
    { id: "ocean", label: "🌊오션오더" },
        { id: "trade", label: "🚢무역" },
      ],
    },
  ];

  const LS_KEY = "dd_todo_state_v1";
  const LS_UI_KEY = "dd_todo_ui_v1";
  const INACTIVITY_MS = 10 * 60 * 1000; // 상호작용 없으면 자동 숨김(10분)
  let _inactTimer = null;


  // --- 체크 사운드 (로그인 없이/외부 파일 없이 WebAudio로 아주 짧게) ---
  let _audioCtx = null;
  let _audioArmed = false;

  function armAudioOnce(){
    if(_audioArmed) return;
    _audioArmed = true;
    try{
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if(_audioCtx.state === "suspended"){
        _audioCtx.resume().catch(()=>{});
      }
    }catch(_e){
      _audioCtx = null;
    }
  }

  // 유저 제스처가 한 번이라도 있으면 사운드 가능
  window.addEventListener("pointerdown", armAudioOnce, { once:true });
  window.addEventListener("keydown", armAudioOnce, { once:true });

  function playCheckTick(){
    if(!_audioCtx) return;
    try{
      if(_audioCtx.state === "suspended"){
        _audioCtx.resume().catch(()=>{});
      }
      const t0 = _audioCtx.currentTime;

      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t0);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

      osc.connect(gain);
      gain.connect(_audioCtx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.09);
    }catch(_e){}
  }

  function popAnim(labelEl){
    if(!labelEl) return;
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    labelEl.classList.remove("todoPop");
    // reflow to restart animation
    void labelEl.offsetWidth;
    labelEl.classList.add("todoPop");
  }


  function setupAutoHide(bar){
    if(!bar || bar.__todoAutoHideBound) return;
    bar.__todoAutoHideBound = true;

    const bump = ()=> resetInactivity(bar);

    // 페이지 어디서든 상호작용이면 타이머 갱신
    ["mousemove","mousedown","keydown","scroll","touchstart","pointerdown","wheel"].forEach(ev=>{
      window.addEventListener(ev, bump, { passive:true });
    });

    // 패널 내부 상호작용도 포함
    bar.addEventListener("mouseenter", bump, { passive:true });
    bar.addEventListener("click", bump);

    resetInactivity(bar);
  }

  function resetInactivity(bar){
    if(_inactTimer) clearTimeout(_inactTimer);
    _inactTimer = setTimeout(()=>{
      try{
        const ui = loadTodoUI();
        if(ui && !ui.hidden){
          bar.classList.add("hidden");
          saveTodoUI({ hidden:true });
        }
      }catch(_e){}
    }, INACTIVITY_MS);
  }


  function now(){ return new Date(); }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtRemain(ms){
    // HH:MM:SS
    const s = Math.max(0, Math.floor(ms/1000));
    const h = pad2(Math.floor(s/3600));
    const m = pad2(Math.floor((s%3600)/60));
    const sec = pad2(s%60);
    return `${h}:${m}:${sec}`;
  }

  function dayKeyForReset(hour){
    // "리셋 기준일" 키: 해당 hour 기준으로 하루가 시작되는 날짜 문자열(YYYY-MM-DD)
    const d = now();
    const base = new Date(d);
    base.setHours(hour,0,0,0);
    // 현재 시간이 리셋 시각 이전이면 "어제"가 아직 같은 사이클
    if(d < base) base.setDate(base.getDate()-1);
    return `${base.getFullYear()}-${pad2(base.getMonth()+1)}-${pad2(base.getDate())}`;
  }

  function nextResetAt(hour){
    const d = now();
    const t = new Date(d);
    t.setHours(hour,0,0,0);
    if(d >= t) t.setDate(t.getDate()+1);
    return t;
  }

  function loadState(){
    try{
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {};
    }catch(_){ return {}; }
  }

  function loadTodoUI(){
    try{
      const raw = localStorage.getItem(LS_UI_KEY);
      if(!raw) return { hidden:false };
      const u = JSON.parse(raw);
      return { hidden: !!u.hidden };
    }catch(_e){
      return { hidden:false };
    }
  }

  function saveTodoUI(u){
    try{ localStorage.setItem(LS_UI_KEY, JSON.stringify({ hidden: !!u.hidden })); }catch(_e){}
  }
  function saveState(state){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(state||{})); }catch(_){}
  }

  function ensureCycle(state, groupKey, resetHour){
    state[groupKey] = state[groupKey] || { cycleDay:"", checked:{} , collapsed:false };
    const cycleDay = dayKeyForReset(resetHour);
    if(state[groupKey].cycleDay !== cycleDay){
      // 초기화
      state[groupKey].cycleDay = cycleDay;
      state[groupKey].checked = {};
      state[groupKey].collapsed = false; // 초기화 시 자동 펼침
    }
  }

  function isAllChecked(state, groupKey, items){
    const checked = state[groupKey]?.checked || {};
    return items.every(it => !!checked[it.id]);
  }

  function mountTodoBar(){
    // 이미 있으면 스킵
    if(document.getElementById("todoBar")) return;

    const tabs = document.querySelector(".tabs");
    if(!tabs) return;

    // style inject (기존 UI를 크게 바꾸지 않는 최소 스타일)
    if(!document.getElementById("todoBarStyle")){
      const st = document.createElement("style");
      st.id = "todoBarStyle";
      st.textContent = `
#todoBar{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
  width: min(260px, calc(100vw - 32px));
  pointer-events: auto;
}
#todoBar .todoCard{
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 14px;
  padding: 8px 10px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.08);
}
#todoBar .todoHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom: 6px;
}
#todoBar .todoTitle{
  font-weight: 700;
  font-size: 13px;
}
#todoBar .todoHint{
  font-size: 11px;
  opacity: 0.75;
}
#todoBar .todoToggle{
  border: 1px solid rgba(0,0,0,0.10);
  background: rgba(255,255,255,0.60);
  border-radius: 10px;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
#todoBar .todoToggle:hover{ background: rgba(255,255,255,0.80); }
#todoBar .groups{
  display:flex;
  flex-direction:column;
  gap:8px;
  max-height: 42vh;
  overflow:auto;
  padding-right: 4px;
}
#todoBar .group{
  border-top: 1px solid rgba(0,0,0,0.06);
  padding-top: 8px;
}
#todoBar .group:first-child{
  border-top: 0;
  padding-top: 0;
}
#todoBar .gTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  cursor:pointer;
  user-select:none;
}
#todoBar .gName{
  font-weight: 700;
  font-size: 12px;
}
#todoBar .timer{
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  opacity: 0.75;
  white-space: nowrap;
}
#todoBar .items{
  margin-top: 6px;
  display:flex;
  flex-wrap:wrap;
  gap:8px 12px;
}
#todoBar label.todoItem{
  display:inline-flex;
  align-items:center;
  gap:6px;
  flex: 0 0 auto;
  cursor: pointer;
  white-space: nowrap;
}
#todoBar label.todoItem input[type=checkbox]{
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  transform: none !important;
  margin: 0;
}
#todoBar label.todoItem span{ display:inline; }
#todoBar label.todoItem a{ text-decoration: underline; }
#todoBar label.todoItem.todoPop{ animation: todoPop 180ms ease-out; }
@keyframes todoPop { 0%{ transform: scale(1); } 60%{ transform: scale(1.06); } 100%{ transform: scale(1); } }
@media (prefers-reduced-motion: reduce){
  #todoBar label.todoItem.todoPop{ animation: none; }
}

#todoBar .collapsed .items{ display:none; }
#todoBar .doneHint{
  font-size: 12px;
  opacity: 0.75;
}
#todoBar label{ flex: initial !important; width: auto !important; }

#todoBar.hidden{ width:auto; display:flex; justify-content:flex-end; }
#todoBar.hidden .todoCard{ display:none; }
#todoBar .todoMini{
  display:none;
  background: rgba(255,255,255,0.72);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 999px;
  padding: 8px 10px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.08);
  font-size: 12px;
  cursor: pointer;
  user-select:none;
}
#todoBar.hidden .todoMini{ display:inline-flex; align-items:center; gap:8px; }
      `.trim();
      document.head.appendChild(st);
    }

    const bar = document.createElement("div");
    bar.id = "todoBar";
    bar.innerHTML = `
<div class="todoCard">
  <div class="todoHead">
    <div class="todoTitle">✅ TO-DO LIST</div>
    <div style="display:flex; align-items:center; gap:8px;">
      <div class="todoHint">완료 시 자동 접힘</div>
      <button type="button" class="todoToggle" id="todoHideBtn" title="숨기기">숨김</button>
    </div>
  </div>
  <div class="todoGroups groups" id="todoGroups"></div>
</div>
<div class="todoMini" id="todoMiniBtn" title="체크리스트 펼치기">✅ TO-DO</div>
    `.trim();

    tabs.parentNode.insertBefore(bar, tabs);

    // hide/show
    const ui = loadTodoUI();
    if(ui.hidden) bar.classList.add("hidden");
    const hideBtn = bar.querySelector("#todoHideBtn");
    const miniBtn = bar.querySelector("#todoMiniBtn");
    if(hideBtn) hideBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      bar.classList.add("hidden");
      saveTodoUI({ hidden:true });
    });
    if(miniBtn) miniBtn.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      bar.classList.remove("hidden");
      saveTodoUI({ hidden:false });
      resetInactivity(bar);
    });

    setupAutoHide(bar);
  }

  function renderTodo(state){
    const host = document.getElementById("todoGroups");
    if(!host) return;
    host.innerHTML = "";

    TODO_SPEC.forEach(g=>{
      const gState = state[g.key] || {checked:{}, collapsed:false};
      const allDone = isAllChecked(state, g.key, g.items);

      // B 정책: 모두 체크되면 자동 접힘(사용자가 다시 펼쳐도 다음 렌더에서 다시 접히지 않도록, collapsed만 강제 true)
      if(allDone) gState.collapsed = true;

      const group = document.createElement("div");
      group.className = "group" + (gState.collapsed ? " collapsed" : "");
      group.dataset.group = g.key;

      const arrow = gState.collapsed ? "▸" : "▾";
      const doneHint = allDone ? `<span class="doneHint">✔ 완료됨</span>` : ``;

      group.innerHTML = `
<div class="gTop" title="클릭해서 펼치기/접기">
  <div class="gName">${arrow} ${g.title} ${doneHint}</div>
  <div class="timer" id="timer_${g.key}">--:--:--</div>
</div>
<div class="items"></div>
      `.trim();

      const itemsHost = group.querySelector(".items");

      g.items.forEach(it=>{
        const id = `${g.key}__${it.id}`;
        const checked = !!(gState.checked && gState.checked[it.id]);

        const label = document.createElement("label");
        label.className = "todoItem";

        const labelText = it.link
          ? `${it.label} (<a href="${it.link}" target="_blank" rel="noopener noreferrer">링크</a>)`
          : it.label;

        label.innerHTML = `<input type="checkbox" id="${id}" ${checked ? "checked":""}/> <span>${labelText}</span>`;
        itemsHost.appendChild(label);

        const cb = label.querySelector("input");
        cb.addEventListener("change", ()=>{
          const st = loadState();
          ensureCycle(st, g.key, g.resetHour);
          st[g.key].checked = st[g.key].checked || {};
          st[g.key].checked[it.id] = !!cb.checked;


          // 체크 완료 시: 사운드 + 미세 애니메이션
          if(cb.checked){
            playCheckTick();
            popAnim(label);
          }
          resetInactivity(document.getElementById('todoBar'));

          // 완료되면 자동 접힘
          const doneNow = g.items.every(x => !!st[g.key].checked[x.id]);
          if(doneNow) st[g.key].collapsed = true;

          saveState(st);
          renderTodo(st);
        });
      });

      // 접기/펼치기(완료된 그룹은 펼쳐도 체크 하나라도 풀리면 다음 렌더에서 자동 펼침됨)
      group.querySelector(".gTop").addEventListener("click", (e)=>{
        // 링크 클릭은 토글 막기
        if(e.target && e.target.closest && e.target.closest("a")) return;

        const st = loadState();
        ensureCycle(st, g.key, g.resetHour);

        const allDone2 = g.items.every(x => !!(st[g.key].checked||{})[x.id]);
        // 완료된 상태에서는 접힘 유지(원하면 펼치기는 허용)
        st[g.key].collapsed = !st[g.key].collapsed;

        // 다만 완료되어 있는데 펼쳤다면, UI만 펼쳐진 상태로 두되(사용자 선택) 다음 렌더에서 강제로 접히지 않게:
        // -> B 정책과 충돌할 수 있어서, '완료된 그룹은 기본 접힘'만 유지하고 사용자 펼침은 허용
        // renderTodo에서 allDone이면 collapsed=true로 강제하므로 펼침이 다시 접힘으로 돌아감.
        // 사용자가 펼쳐볼 수 있게 하려면 강제 로직을 약하게 해야 함.
        // 여기서는 "완료되면 자동 접힘"만 보장하고, 사용자가 펼치면 유지되도록 강제 로직 제거.
        // 따라서 위에서 강제 true는 제거하고, 완료 시점에만 collapsed=true로 설정한다.
        // (renderTodo의 강제 true는 아래에서 제거됨)

        saveState(st);
        renderTodo(st);
      });

      host.appendChild(group);
      state[g.key] = gState; // keep updated
    });
  }

  function updateTimers(){
    const nowD = now();
    TODO_SPEC.forEach(g=>{
      const el = document.getElementById(`timer_${g.key}`);
      if(el){
        const nx = nextResetAt(g.resetHour);
        el.textContent = `${fmtRemain(nx - nowD)}`;
      }
    });
  }

  function tick(){
    // 사이클 변경(리셋) 감지 + 자동 초기화
    const st = loadState();
    let changed = false;
    TODO_SPEC.forEach(g=>{
      const before = st[g.key]?.cycleDay || "";
      ensureCycle(st, g.key, g.resetHour);
      if(before !== st[g.key].cycleDay) changed = true;
    });
    if(changed) saveState(st);

    renderTodo(st);
    updateTimers();
  }

  function initTodoBar(){
    mountTodoBar();
    const st = loadState();
    TODO_SPEC.forEach(g=>ensureCycle(st, g.key, g.resetHour));
    saveState(st);

    // render + timers
    renderTodo(st);
    updateTimers();

    // 1초마다 타이머, 10초마다 리셋 체크(1초 tick로 해도 부담 적지만, 안전하게 통합)
    setInterval(()=>{
      const st2 = loadState();
      let changed = false;
      TODO_SPEC.forEach(g=>{
        const before = st2[g.key]?.cycleDay || "";
        ensureCycle(st2, g.key, g.resetHour);
        if(before !== st2[g.key].cycleDay) changed = true;
      });
      if(changed){
        saveState(st2);
        renderTodo(st2);
      }
      updateTimers();
    }, 1000);
  }

  // renderTodo에서 "완료면 강제 접힘" 로직 제거(완료 시점에만 접힘 처리)
  // => 위에서 이미 완료 시 change 핸들러에서 collapsed=true로 처리.
  const _renderTodo = renderTodo;
  renderTodo = function(state){
    const host = document.getElementById("todoGroups");
    if(!host) return;
    host.innerHTML = "";
    TODO_SPEC.forEach(g=>{
      const gState = state[g.key] || {checked:{}, collapsed:false};
      const allDone = isAllChecked(state, g.key, g.items);

      const group = document.createElement("div");
      group.className = "group" + (gState.collapsed ? " collapsed" : "");
      group.dataset.group = g.key;

      const arrow = gState.collapsed ? "▸" : "▾";
      const doneHint = allDone ? `<span class="doneHint">✔ 완료됨</span>` : ``;

      group.innerHTML = `
<div class="gTop" title="클릭해서 펼치기/접기">
  <div class="gName">${arrow} ${g.title} ${doneHint}</div>
  <div class="timer" id="timer_${g.key}">--:--:--</div>
</div>
<div class="items"></div>
      `.trim();

      const itemsHost = group.querySelector(".items");

      g.items.forEach(it=>{
        const id = `${g.key}__${it.id}`;
        const checked = !!(gState.checked && gState.checked[it.id]);

        const label = document.createElement("label");
        label.className = "todoItem";

        const labelText = it.link
          ? `${it.label} (<a href="${it.link}" target="_blank" rel="noopener noreferrer">링크</a>)`
          : it.label;

        label.innerHTML = `<input type="checkbox" id="${id}" ${checked ? "checked":""}/> <span>${labelText}</span>`;
        itemsHost.appendChild(label);

        const cb = label.querySelector("input");
        cb.addEventListener("change", ()=>{
          const st = loadState();
          ensureCycle(st, g.key, g.resetHour);
          st[g.key].checked = st[g.key].checked || {};
          st[g.key].checked[it.id] = !!cb.checked;


          // 체크 완료 시: 사운드 + 미세 애니메이션
          if(cb.checked){
            playCheckTick();
            popAnim(label);
          }
          resetInactivity(document.getElementById('todoBar'));

          // 완료되면 자동 접힘
          const doneNow = g.items.every(x => !!st[g.key].checked[x.id]);
          if(doneNow) st[g.key].collapsed = true;
          // 하나라도 풀리면 자동 펼침
          if(!doneNow) st[g.key].collapsed = false;

          saveState(st);
          renderTodo(st);
        });
      });

      group.querySelector(".gTop").addEventListener("click", (e)=>{
        if(e.target && e.target.closest && e.target.closest("a")) return;
        const st = loadState();
        ensureCycle(st, g.key, g.resetHour);
        st[g.key].collapsed = !st[g.key].collapsed;
        saveState(st);
        renderTodo(st);
      });

      host.appendChild(group);
    });

    updateTimers();
  };

  // 앱 초기화 후 DOM이 있을 때 붙이기
  window.addEventListener("DOMContentLoaded", ()=>{
    try{ initTodoBar(); }catch(err){ console.warn("[todoBar] init failed", err); }
  });
})();




/* ===== Inventory UI render (mid/final, ★→★★→★★★) ===== */
(function(){
  if(typeof PRODUCTS === "undefined") return;

  const invMid = document.getElementById("invMidList");
  const invFin = document.getElementById("invFinalList");
  if(!invMid || !invFin) return;

  window.inventory = window.inventory || {};
  function saveInventory(){
    try{ localStorage.setItem("inventory_all", JSON.stringify(inventory)); }catch(e){}
  }
  function loadInventory(){
    try{
      const v = JSON.parse(localStorage.getItem("inventory_all")||"{}");
      if(v && typeof v==="object") inventory = v;
    }catch(e){}
  }
  loadInventory();

  function isFinalProduct(name){
    return (typeof FINAL_PRODUCTS!=="undefined") && FINAL_PRODUCTS.includes(name);
  }

  function renderInventory(){
    invMid.innerHTML = "";
    invFin.innerHTML = "";

    const list = PRODUCTS.slice().sort((a,b)=>{
      if(a.star !== b.star) return a.star - b.star; // ★ → ★★ → ★★★
      return 0;
    });

    list.forEach(p=>{
      const row = document.createElement("div");
      row.className = "invRow";
      row.innerHTML = `<span>${p.name}</span>
        <input type="number" min="0" value="${inventory[p.name]||0}">`;
      const input = row.querySelector("input");
      input.addEventListener("input", e=>{
        inventory[p.name] = Math.max(0, Number(e.target.value||0));
        saveInventory();
      });
      if(isFinalProduct(p.name)) invFin.appendChild(row);
      else invMid.appendChild(row);
    });
  }

  renderInventory();
})();


// ================================
// Deterministic placement: move trade card into TAB2 once
// ================================
document.addEventListener("DOMContentLoaded", function(){
  const tradeBox = document.getElementById("tradeBox");
  const tab2 = document.getElementById("tab2");
  const needMatCard = document.getElementById("needMatCard");
  if(!tradeBox || !tab2 || !needMatCard) return;

  // Move tradeBox right above needMatCard inside tab2
  const parent = needMatCard.parentNode;
  if(parent && tradeBox.parentNode !== parent){
    parent.insertBefore(tradeBox, needMatCard);
  }
});



/* ===== TOOLTIP REBIND PATCH (recipe tooltip fix) ===== */
function rebindRecipeTooltips(){
  document.querySelectorAll('[data-tip]').forEach(el=>{
    el.onmouseenter = null;
    el.onmouseleave = null;
    el.addEventListener('mouseenter', () => {
      if (typeof showTip === 'function') showTip(el);
    });
    el.addEventListener('mouseleave', () => {
      if (typeof hideTip === 'function') hideTip();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(rebindRecipeTooltips, 0);
});


// === Tab2 Premium note (display only) ===
(function(){
  function renderPremiumNote(){
    const src = document.getElementById("premiumLevel"); // Tab1 input
    const note = document.getElementById("premiumNoteA");
    if(!src || !note) return;
    const lvl = Number(src.value || 0);
    note.innerHTML =
      `• 프리미엄 한정가 <b>${lvl}강</b><br>` +
      `• 프리미엄 단계 변경은 <b>탭1</b>에서 입력하세요. 입력 후 <b>계산 버튼 재클릭</b> 필수.`;
  }
  document.addEventListener("input", (e)=>{
    if(e.target && e.target.id === "premiumLevel") renderPremiumNote();
  });
  renderPremiumNote();
})();



function renderTradeSummaryActual(){
  const box = document.getElementById("tradeSummaryActual");
  if(!box) return;

  const state = getActiveTradeSlots();

  if(!state.anyActive){
    box.style.display = "block";
    box.textContent = "무역 미적용 (탭1에서 슬롯 설정 없음)";
    return;
  }

  const lines = state.slots.map(s =>
    `슬롯 ${s.slot}: 요구 ${s.req}개 · ${s.pct}%`
  );

  box.style.display = "block";
  box.innerHTML =
    `<b>무역 적용 중</b><br>` +
    `멤버십: ${memberLabel(state.member)} · 슬롯 ${state.slotsOpen}개<br>` +
    lines.join("<br>");
}


try{ renderTradeSummaryActual(); }catch(e){};



// =====================================
// Time Alarm Toast (beige + sound)
// =====================================
(function initTimeAlarmToast(){

  // 하루 1회 표시용
  const SHOWN_KEY = "DDTY_TIME_ALARM_SHOWN_V1";

  function getShown(){
    try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || "{}"); }
    catch(e){ return {}; }
  }
  function markShown(key){
    const s = getShown();
    s[key] = true;
    localStorage.setItem(SHOWN_KEY, JSON.stringify(s));
  }

  // ---------- Toast Root ----------
  function ensureToastRoot(){
    let root = document.getElementById("toastRoot");
    if(root) return root;

    root = document.createElement("div");
    root.id = "toastRoot";
    root.style.cssText =
      "position:fixed;right:16px;bottom:64px;z-index:9999;" +
      "display:flex;flex-direction:column;gap:9px;pointer-events:none;";
    document.body.appendChild(root);
    return root;
  }

  // ---------- Animation (once) ----------
  if(!document.getElementById("toastNudgeStyle")){
    const style = document.createElement("style");
    style.id = "toastNudgeStyle";
    style.textContent = `
      @keyframes toastNudge {
        0%   { transform: translateY(12px); }
        40%  { transform: translateY(-4px); }
        70%  { transform: translateY(2px); }
        100% { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- Sound ----------
  function playToastSound(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.09;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.stop(ctx.currentTime + 0.45);
    }catch(e){}
  }

  // ---------- Toast ----------
  function showToast(msg){
    const root = ensureToastRoot();
    const t = document.createElement("div");
    t.textContent = `🔔 ${msg}`;
    t.style.cssText =
      "background:#fff6ea;color:#5a4632;" +
      "border:1px solid #e6d3b8;" +
      "padding:14px 18px;border-radius:13px;" +
      "font-size:15px;font-weight:600;" +
      "max-width:300px;" +
      "box-shadow:0 9px 24px rgba(0,0,0,.20);" +
      "opacity:0;animation:toastNudge .45s ease-out forwards;";

    root.appendChild(t);
    requestAnimationFrame(()=>{ t.style.opacity = "1"; });
    playToastSound();

    setTimeout(()=>{
      t.style.opacity = "0";
      setTimeout(()=>t.remove(),300);
    }, 8000);
  }

  // ---------- Time Check ----------
  function checkAlarms(){
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const d = now.toISOString().slice(0,10);
    const shown = getShown();

    // 21:55 낚시 대회
    if(h === 21 && m === 55){
      const k = d + "_2155";
      if(!shown[k]){
        showToast("낚시 대회 5분 전입니다");
        markShown(k);
      }
    }

    // 23:55 접속 보상
    if(h === 23 && m === 55){
      const k = d + "_2355";
      if(!shown[k]){
        showToast("접속 보상 초기화 5분 전입니다");
        markShown(k);
      }
    }
  }

  setInterval(checkAlarms, 30 * 1000);
})();


// ================================
// FIX: 재고 불러오기 버튼 바인딩 (id가 달라도 동작)
// - 우선순위: #btnLoadInv -> .btn-strong(텍스트 포함) -> 텍스트 매칭
// ================================
function _doSyncExpectedToBase(){
  const arr = (typeof getExpectedInv === "function") ? getExpectedInv() : null;
  if(!Array.isArray(arr)) return;

  arr.forEach((v,i)=>{
    if (typeof _writeSetEa === "function") _writeSetEa("base", i, v);
    else{
      const el = document.getElementById(`base_${i}`);
      if(el) el.value = v;
    }
  });

  if (typeof updateTotalsActual === "function") updateTotalsActual();
}

function _bindLoadInvButton(){
  // 1) exact id
  let btn = document.getElementById("btnLoadInv");
  if(btn){
    btn.addEventListener("click", syncExpectedToBase_click);
    return true;
  }

  // 2) class hint (CSS에 .btn-strong이 있음)
  const strongs = Array.from(document.querySelectorAll("button.btn-strong, .btn.btn-strong"));
  for(const b of strongs){
    const t = (b.textContent || "").replace(/\s+/g,"").trim();
    if(t.includes("재고") && (t.includes("불러") || t.includes("이월"))){
      b.addEventListener("click", syncExpectedToBase_click);
      return true;
    }
  }

  // 3) text fallback
  const btns = Array.from(document.querySelectorAll("button"));
  for(const b of btns){
    const t = (b.textContent || "").replace(/\s+/g," ").trim();
    if(
      t.includes("재고 불러") ||
      t.includes("재고불러") ||
      (t.includes("불러") && t.includes("재고")) ||
      t.includes("잔여 재고 이월") ||
      t.includes("재고 이월")
    ){
      b.addEventListener("click", syncExpectedToBase_click);
      return true;
    }
  }
  return false;
}

document.addEventListener("DOMContentLoaded", ()=>{
  try{ _bindLoadInvButton(); }catch(e){}
});
// ================================



// ================================
// FINAL FIX: 재고 불러오기 (문서 위임 + 클릭 전용)
// ================================

// 실제 작업 (confirm 없음)
function _doSyncExpectedToBase(){
  const arr = (typeof getExpectedInv === "function") ? getExpectedInv() : null;
  if(!Array.isArray(arr)) return;

  arr.forEach((v,i)=>{
    if (typeof _writeSetEa === "function") _writeSetEa("base", i, v);
    else{
      const el = document.getElementById(`base_${i}`);
      if(el) el.value = v;
    }
  });

  if (typeof updateTotalsActual === "function") updateTotalsActual();
}

// 클릭 전용 핸들러
function _handleLoadInvClick(){
  if(!window.confirm("탭1 재고를 탭2 기존 재고로 불러오시겠습니까?")) return;
  _doSyncExpectedToBase();
}

// 문서 위임: 어떤 렌더 타이밍에도 동작
document.addEventListener("click", function(e){
  const t = e.target;
  if(!t) return;

  // 버튼 자체 또는 버튼 안 요소 클릭 대응
  const btn = t.closest && t.closest("button");
  if(!btn) return;

  const txt = (btn.textContent || "").replace(/\s+/g," ").trim();
  if(
    btn.id === "btnLoadInv" ||
    txt.includes("재고 불러") ||
    txt.includes("재고불러") ||
    (txt.includes("불러") && txt.includes("재고")) ||
    txt.includes("잔여 재고 이월") ||
    txt.includes("재고 이월")
  ){
    e.preventDefault();
    _handleLoadInvClick();
  }
});
// ================================



// ================================
// FINAL FIX: 재고 초기화 버튼 (세트/개 대응, 문서 위임)
// ================================

function _doResetInventory(){
  // 탭1 (기댓값)
  if (typeof FISH_ROWS !== "undefined"){
    FISH_ROWS.forEach((_, i)=>{
      if (typeof _writeSetEa === "function"){
        _writeSetEa("inv", i, 0);
      } else {
        const el = document.getElementById(`inv_${i}`);
        if(el) el.value = 0;
      }
    });
  }

  // 탭2 (기존 + 오늘 채집)
  if (typeof FISH_ROWS !== "undefined"){
    FISH_ROWS.forEach((_, i)=>{
      if (typeof _writeSetEa === "function"){
        _writeSetEa("base", i, 0);
        _writeSetEa("harv", i, 0);
      } else {
        const b = document.getElementById(`base_${i}`);
        const h = document.getElementById(`harv_${i}`);
        if(b) b.value = 0;
        if(h) h.value = 0;
      }
      const t = document.getElementById(`tot_${i}`);
      if(t) t.textContent = "0";
    });
  }

  if (typeof updateTotalsActual === "function") updateTotalsActual();
}

function _handleResetInvClick(){
  if(!window.confirm("모든 재고를 초기화하시겠습니까?")) return;
  _doResetInventory();
}

// 문서 위임
document.addEventListener("click", function(e){
  const btn = e.target?.closest && e.target.closest("button");
  if(!btn) return;

  const txt = (btn.textContent || "").replace(/\s+/g," ").trim();
  if(
    btn.id === "btnResetInv" ||
    txt.includes("재고 초기화") ||
    txt.includes("재고초기화") ||
    (txt.includes("초기화") && txt.includes("재고"))
  ){
    e.preventDefault();
    _handleResetInvClick();
  }
});
// ================================



// ================================
// RECIPE TOOLTIP BADGE THEME FIX
// - tipBadge is a <span>, styled in index with beige colors.
// - Add blue-theme override via injected <style> (safe, append-only)
// ================================
(function(){
  const css = `
/* tipBadge (recipe tooltip) - blue theme override */
html[data-theme="blue"] .recipeTip .tipBadge{
  background: rgba(90,110,255,.10) !important;
  border: 1px solid rgba(90,110,255,.35) !important;
  color: rgba(55,75,190,.95) !important;
}
html[data-theme="blue"] .recipeTip .tipBadge.strong{
  background: rgba(90,110,255,.12) !important;
  border-color: rgba(90,110,255,.40) !important;
  color: rgba(55,75,190,.98) !important;
}
`;
  function inject(){
    if(document.getElementById("tipBadgeThemeFix")) return;
    const st = document.createElement("style");
    st.id = "tipBadgeThemeFix";
    st.textContent = css;
    document.head.appendChild(st);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
})();



// =============================
// TAB2: 하위 제작 필요량(중간재) - 티어 헤더 렌더
// - 기존 renderNeedCraftTableTo 로직(툴팁 qtyToCrafts 포함) 재사용
// =============================
function renderNeedCraftTableTieredTo(sel, rows){
  const tb = document.querySelector(sel);
  if(!tb) return;
  tb.innerHTML = "";

  const byTier = {1:[],2:[],3:[]};
  (rows||[]).forEach(r=>{
    const t = getTierFromName(r.name);
    (byTier[t] || byTier[1]).push(r);
  });

  [0, 1, 2, 3].forEach(t=>{
    const arr = byTier[t];
    if(!arr || arr.length===0) return;

    const trH = document.createElement("tr");
    trH.className = `tier-sep tier-${t}`;
    trH.innerHTML = `<td colspan="4" class="tier-title">${__tierLabel(t)}</td>`;
    tb.appendChild(trH);

    // 기존 행 렌더 그대로
    arr.forEach(r=>{
      const tr = document.createElement("tr");

      const craftNeedQty = Math.max(0, Math.floor(Number(r.craft || 0)));
      const invQty       = Math.max(0, Math.floor(Number(r.inv   || 0)));
      if(craftNeedQty <= 0 && invQty <= 0) return;

      const yieldPerCraft =
        (typeof recipeYield === "function")
          ? Math.max(1, recipeYield(r.name))
          : 1;

      const crafts =
        (typeof qtyToCrafts === "function")
          ? qtyToCrafts(r.name, craftNeedQty)
          : Math.ceil(craftNeedQty / yieldPerCraft);

      const shownQty = crafts * yieldPerCraft;
      const totalQty = shownQty + invQty;
      const craftCls = shownQty > 0 ? "neg" : "muted";

      tr.innerHTML =
        `<td>
          <span class="tipName"
            data-tipname="${r.name}"
            data-tipqty="${crafts}"
          >${matLabel(r.name)}</span>
        </td>` +
        `<td class="right ${craftCls}">${fmtSet64(shownQty)}</td>` +
        `<td class="right">${fmtSet64(invQty)}</td>` +
        `<td class="right">${fmtSet64(totalQty)}</td>`;

      tb.appendChild(tr);
    });
  });
}



// =============================
// TAB2: 부재료(needMat) - 티어 헤더 + 삽입순서 렌더(정렬 금지)
// =============================

function renderNeedMatTableTieredTo(sel, byTier){
  const tb = document.querySelector(sel);
  if(!tb) return;
  tb.innerHTML = "";

  [1,2,3].forEach(t=>{
    const m = byTier?.[t];
    if(!m || m.size===0) return;

    // Tier header
    const trH = document.createElement("tr");
    trH.className = `tier-sep tier-${t}`;
    trH.innerHTML = `<td colspan="2" class="tier-title">${__tierLabel(t)}</td>`;
    tb.appendChild(trH);

    let lastGroup = null;

    for(const [k, v0] of m.entries()){
      const v = Math.round(Number(v0||0));
      if(v<=0) continue;

      const g = MAT_GROUP_NAME(k);
      if(g && g !== lastGroup){
        const sub = document.createElement("tr");
        sub.className = "mat-subhead";
        sub.innerHTML = `<td colspan="2">${g}</td>`;
        tb.appendChild(sub);
        lastGroup = g;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${matLabel(k)}</td><td class="right">${fmtSet64(v)}</td>`;
      tb.appendChild(tr);
    }
  });
}



// =============================
// 부재료 소헤더 스타일
// =============================
const __matSubStyle = document.createElement("style");
__matSubStyle.textContent = `
  .mat-subhead td{
    padding:8px 8px;
    font-size:14px;
    font-weight:600;
    letter-spacing:0.02em;
    color:#444;
    background:transparent;
    border-top:1px solid rgba(0,0,0,.08);
  }
`;
document.head.appendChild(__matSubStyle);



function calculateExpectedRevenue() {
  // 희석액 매출량 계산 (기대 매출에 반영)
  const dilutionRevenue = calculateDilutionBonus();  // 희석액의 매출량 계산

  // 다른 완성품들의 매출량 계산 (기존 계산 로직)
  const otherRevenue = calculateOtherRevenue();  // 다른 완성품들의 매출량 계산

  // 총 기대 매출량 계산
  const totalRevenue = dilutionRevenue + otherRevenue;

  // UI에 반영 (탭1에서 보여주는 부분)
  updateUITab1(totalRevenue);  // 탭1 UI 업데이트
}

function calculateDilutionBonus() {
  const dilutionPrice = getDilutionPrice();  // 희석액 단가
  const dilutionQuantity = getDilutionQuantity();  // 희석액 수량
  const totalRevenue = dilutionPrice * dilutionQuantity;

  // 희석액이 경쟁할 때, 매출량이 더 높으면 생산되도록
  const otherProductsRevenue = calculateOtherProductsRevenue();  // 다른 완성품들의 매출 계산
  const dilutionEfficiency = totalRevenue / dilutionQuantity;  // 희석액의 효율 (단가와 수량)

  // 다른 완성품들이 더 효율적이라면 희석액을 생산하지 않음
  if (dilutionEfficiency > otherProductsRevenue) {
    return totalRevenue;  // 희석액이 더 많은 매출을 내는 경우만 생산
  } else {
    return 0;  // 매출이 더 낮으면 생산되지 않음
  }
}

function calculateActualRevenue() {
  // 실제 재고와 매출량 계산
  const actualRevenue = calculateOtherActualRevenue();  // 실제 매출량 계산 (다른 완성품들)

  // 희석액 매출량 계산
  const dilutionRevenue = calculateDilutionBonus();  // 희석액 매출량 계산

  // 총 실제 매출량 계산
  const totalRevenue = actualRevenue + dilutionRevenue;

  // UI에 반영 (탭2에서 보여주는 부분)
  updateUITab2(totalRevenue);  // 탭2 UI 업데이트
}

function calcMatNeed(y) {
  const yy = Array.isArray(y) ? y.map(v => Number(v || 0)) : Array(9).fill(0);

  // --- 유틸 ---
  const add = (totals, name, qty) => {
    if (!qty) return;
    if (isFishItem(name)) return;
    totals[name] = (totals[name] || 0) + qty;
  };

  // --- 레시피 정의 ---
  const R1 = {
    "수호의 정수 ★": { "굴 ★": 2, "점토": 1 },
    "파동의 정수 ★": { "소라 ★": 2, "모래": 3 },
    // 희석액을 제외 (경쟁을 위해 중간재 소모량에서 제외)
    "추출된 희석액": { "굴★": 1, "소라★": 1, "문어★": 1, "미역★": 1, "성게★": 1 },
  };

  const totals = {};

  // 각 완성품을 만드는 데 필요한 재료를 계산
  for (const [product, ingredients] of Object.entries(R1)) {
    Object.entries(ingredients).forEach(([ingredient, qty]) => {
      add(totals, ingredient, qty);  // 재료 추가
    });
  }

  return totals;  // 재료들 반환
}

function updateUITab1(result) {
  const resultElement = document.getElementById("resultDisplayTab1");  // 탭1 UI 요소
  resultElement.textContent = result ? result : "계산 오류";  // 결과 출력
}

function updateUITab2(result) {
  const resultElement = document.getElementById("resultDisplayTab2");  // 탭2 UI 요소
  resultElement.textContent = result ? result : "계산 오류";  // 결과 출력
}
