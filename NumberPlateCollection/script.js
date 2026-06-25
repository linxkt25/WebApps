// -----------------------------
// DOM 要素の取得
// -----------------------------
const prefectureInput = document.getElementById("prefectureInput");
const input = document.getElementById("regionInput");
const plateInput = document.getElementById("plateInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("regionList");

const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsModal = document.getElementById("settingsModal");
const defaultPrefectureInput = document.getElementById("defaultPrefectureInput");
const defaultRegionInput = document.getElementById("defaultRegionInput");
const defaultPlateInput = document.getElementById("defaultPlateInput");
const defaultAddBtn = document.getElementById("defaultAddBtn");
const defaultRegionList = document.getElementById("defaultRegionList");
const saveDefaultBtn = document.getElementById("saveDefaultBtn");

// localStorage のキー
const REGIONS_KEY = "regions";
const DEFAULT_REGIONS_KEY = "defaultRegions";

// -----------------------------
// 保存
// -----------------------------
function persist() {
  localStorage.setItem(REGIONS_KEY, JSON.stringify(regions));
}

function persistDefaultRegions() {
  localStorage.setItem(DEFAULT_REGIONS_KEY, JSON.stringify(defaultRegions));
}

// -----------------------------
// 初期データを JSON から読み込む
// -----------------------------
async function loadDefaultRegionsFromJson() {
  try {
    const resp = await fetch("default-regions.json", { cache: "reload" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error("default-regions.json must be an array");
    return data;
  } catch (err) {
    console.warn("default-regions.json の読み込みに失敗しました:", err);
    // フォールバック（コード内で定義）
    return [
      { name: "北海道", checked: false },
      { name: "東京", checked: false },
      { name: "大阪", checked: false },
      { name: "福岡", checked: false },
      { name: "沖縄", checked: false }
    ];
  }
}

// localStorage からデフォルト地域を取得（なければ JSON）
let defaultRegions = [];
async function loadDefaultRegions() {
  const saved = JSON.parse(localStorage.getItem(DEFAULT_REGIONS_KEY));
  if (Array.isArray(saved) && saved.length > 0) {
    defaultRegions = saved;
    return;
  }

  defaultRegions = await loadDefaultRegionsFromJson();
  persistDefaultRegions();
}

// { name: string, checked: boolean }
let regions = JSON.parse(localStorage.getItem(REGIONS_KEY)) || [];

// -----------------------------
// 初期表示（localStorage になければ defaultRegions から読み込む）
// -----------------------------
(async () => {
  await loadDefaultRegions();

  if (!regions || regions.length === 0) {
    regions = defaultRegions.slice();
    persist();
  } else {
    // defaultRegions にあるが regions に存在しない項目を追加して表示する
    let changed = false;
    defaultRegions.forEach(def => {
      const defRegion = def.region || def.name || "";
      const normalizedDef = `${(def.prefecture||"")}|${defRegion}|${(def.plate||"")}`.toLowerCase();
      const exists = regions.some(r => {
        const rRegion = r.region || r.name || "";
        return `${(r.prefecture||"")}|${rRegion}|${(r.plate||"")}`.toLowerCase() === normalizedDef;
      });
      if (!exists) {
        regions.push({ prefecture: def.prefecture, region: defRegion, plate: def.plate, checked: false });
        changed = true;
      }
    });
    if (changed) persist();
  }

  render();
  renderDefaultSettings();
})();

// -----------------------------
// 設定画面表示
// -----------------------------
function toggleSettings(show) {
  settingsModal.classList.toggle("hidden", !show);
}

function renderDefaultSettings() {
  defaultRegionList.innerHTML = "";

  defaultRegions.forEach((r, index) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.justifyContent = "space-between";

    const title = document.createElement("span");
    title.textContent = `${r.prefecture || ""} / ${r.region || ""} / ${r.plate || ""}`;

    const del = document.createElement("button");
    del.textContent = "削除";
    del.addEventListener("click", () => {
      defaultRegions.splice(index, 1);
      renderDefaultSettings();
    });

    li.appendChild(title);
    li.appendChild(del);
    defaultRegionList.appendChild(li);
  });
}

openSettingsBtn.addEventListener("click", () => toggleSettings(true));
closeSettingsBtn.addEventListener("click", () => toggleSettings(false));

defaultAddBtn.addEventListener("click", () => {
  const prefecture = defaultPrefectureInput.value.trim();
  const region = defaultRegionInput.value.trim();
  const plate = defaultPlateInput.value.trim();
  if (!region) return;

  const normalized = `${prefecture}|${region}|${plate}`.toLowerCase();
  if (defaultRegions.some(r => `${r.prefecture || ""}|${r.region || ""}|${r.plate || ""}`.toLowerCase() === normalized)) {
    alert("この地域はすでにデフォルトリストに登録されています");
    return;
  }

  defaultRegions.push({ prefecture, region, plate, checked: false });
  defaultPrefectureInput.value = "";
  defaultRegionInput.value = "";
  defaultPlateInput.value = "";
  renderDefaultSettings();
});

saveDefaultBtn.addEventListener("click", () => {
  persistDefaultRegions();
  // 設定されたデフォルトをメインのリストに反映
  regions = defaultRegions.slice();
  persist();
  render();
  alert("デフォルト地域を保存しました。次回起動時に反映されます。");
});

// -----------------------------
// 「追加」ボタンの処理
// -----------------------------
addBtn.addEventListener("click", () => {
  const prefecture = prefectureInput.value.trim();
  const region = input.value.trim();
  const plate = plateInput.value.trim();
  if (!region) return;

  // 重複チェック（大文字小文字を区別しない）
  const normalized = `${prefecture}|${region}|${plate}`.toLowerCase();
  if (regions.some(r => `${r.prefecture || ""}|${r.region || r.name || ""}|${r.plate || ""}`.toLowerCase() === normalized)) {
    alert("この地域はすでに登録されています");
    return;
  }

  // 新規追加
  regions.push({ prefecture, region, plate, checked: false });
  persist();

  prefectureInput.value = "";
  input.value = "";
  plateInput.value = "";
  render();
});

// -----------------------------
// 表示更新
// -----------------------------
function render() {
  list.innerHTML = "";

  regions.forEach((r, index) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!r.checked;
    checkbox.addEventListener("change", () => {
      regions[index].checked = checkbox.checked;
      persist();
    });

    const title = document.createElement("div");
    title.style.textAlign = "left";

    const prefectureText = r.prefecture || "";
    const regionText = r.region || r.name || "";
    const plateText = r.plate || "";

    const prefectureEl = document.createElement("p");
    prefectureEl.textContent = `県: ${prefectureText}`;
    prefectureEl.style.margin = "0";
    prefectureEl.style.fontWeight = "600";

    const regionEl = document.createElement("p");
    regionEl.textContent = `地域: ${regionText}`;
    regionEl.style.margin = "0";

    const plateEl = document.createElement("p");
    plateEl.textContent = `ナンバープレート: ${plateText}`;
    plateEl.style.margin = "0";
    plateEl.style.color = "#333";

    title.appendChild(prefectureEl);
    title.appendChild(regionEl);
    title.appendChild(plateEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => {
      regions.splice(index, 1);
      persist();
      render();
    });

    li.appendChild(checkbox);
    li.appendChild(title);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// -----------------------------
// PWA: Service Worker 登録
// -----------------------------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js")
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW registration failed:", err));
}
