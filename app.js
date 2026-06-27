import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  update,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-nkaKxm-nwWaRcwKgqHdPX5I30fJwVr0",
  authDomain: "nha-kinh-84aa2.firebaseapp.com",
  databaseURL: "https://nha-kinh-84aa2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nha-kinh-84aa2",
  storageBucket: "nha-kinh-84aa2.firebasestorage.app",
  messagingSenderId: "282119761626",
  appId: "1:282119761626:web:8cdeddc726456cebcbbfe3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const labels = {
  ANHSANG: "ÁNH SÁNG",
  GT_AMDAT: "ĐỘ ẨM ĐẤT",
  GT_DOMAN: "ĐỘ MẶN",
  GT_PH: "pH",
  h: "ĐỘ ẨM KHÔNG KHÍ",
  t: "NHIỆT ĐỘ",

  BOM: "Máy bơm",
  DEN: "Đèn",
  DONG: "Đóng cửa",
  MO: "Mở cửa",
  QUAT: "Quạt",
  SUONG: "Phun sương",

  SET_AMDAT: "Cài đặt độ ẩm đất",
  SET_AS: "Cài đặt ánh sáng",
  SET_DOMAN: "Cài đặt độ mặn",
  SET_H: "Cài đặt độ ẩm không khí",
  SET_PHHIGH: "Ngưỡng pH cao",
  SET_PHLOW: "Ngưỡng pH thấp",
  SET_T: "Cài đặt nhiệt độ"
};

const deviceKeys = ["BOM", "DEN", "QUAT", "SUONG"];
const settingKeys = [
  "SET_AMDAT",
  "SET_AS",
  "SET_DOMAN",
  "SET_H",
  "SET_PHHIGH",
  "SET_PHLOW",
  "SET_T"
];

const MODE_AUTO = 1;
const MODE_MANUAL = 0;

const tabButtons = document.querySelectorAll(".tab-btn[data-tab]");
const tabContents = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("pageTitle");

const btnManual = document.getElementById("btnManual");
const btnAuto = document.getElementById("btnAuto");

let isUpdatingDevice = false;

const titleMap = {
  tongquan: "Tổng quan hệ thống",
  dieukhien: "Điều khiển thiết bị và ngưỡng",
  bieudo: "Biểu đồ dữ liệu cảm biến"
};

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;

    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tabId).classList.add("active");
    pageTitle.textContent = titleMap[tabId];
  });
});

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isAutoMode(data) {
  return Number(data?.MODE) === MODE_AUTO;
}

/* =========================
   MODE AUTO / MANUAL
========================= */
function renderMode(modeValue) {
  if (!btnManual || !btnAuto) return;

  btnManual.classList.remove("active", "manual");
  btnAuto.classList.remove("active");

  if (Number(modeValue) === MODE_AUTO) {
    btnAuto.classList.add("active");
  } else {
    btnManual.classList.add("active", "manual");
  }
}

window.setMode = async function (mode) {
  try {
    await update(ref(db, "/"), {
      MODE: Number(mode)
    });
    renderMode(Number(mode));
  } catch (error) {
    console.error("Lỗi cập nhật MODE:", error);
  }
};

if (btnManual) {
  btnManual.addEventListener("click", () => setMode(MODE_MANUAL));
}

if (btnAuto) {
  btnAuto.addEventListener("click", () => setMode(MODE_AUTO));
}

/* =========================
   GAUGE
========================= */
function getGaugeOptions(type) {
  const map = {
    anhsang: {
      min: 0,
      max: 15000,
      unit: " lux",
      zones: {
        green: [0, 5000],
        orange: [5000, 10000],
        red: [10000, 15000]
      }
    },
    amdat: {
      min: 0,
      max: 100,
      unit: "%",
      zones: {
        green: [60, 100],
        orange: [35, 60],
        red: [0, 35]
      }
    },
    doman: {
      min: 0,
      max: 1000,
      unit: " ppm",
      zones: {
        green: [0, 400],
        orange: [400, 700],
        red: [700, 1000]
      }
    },
    ph: {
      min: 0,
      max: 14,
      unit: "",
      zones: {
        green: [6.5, 8],
        orange: [5, 6.5],
        red: [8, 14]
      }
    },
    h: {
      min: 0,
      max: 100,
      unit: "%",
      zones: {
        green: [50, 80],
        orange: [35, 50],
        red: [80, 100]
      }
    },
    t: {
      min: 0,
      max: 60,
      unit: " °C",
      zones: {
        green: [20, 35],
        orange: [35, 42],
        red: [42, 60]
      }
    }
  };

  return map[type];
}

function getGaugeColor(type, value) {
  const cfg = getGaugeOptions(type);
  const v = Number(value) || 0;

  const inRange = (range) => v >= range[0] && v < range[1];

  if (type === "ph") {
    if (v >= cfg.zones.green[0] && v < cfg.zones.green[1]) return "#22c55e";
    if (v >= cfg.zones.orange[0] && v < cfg.zones.orange[1]) return "#f59e0b";
    return "#ef4444";
  }

  if (inRange(cfg.zones.green) || v === cfg.zones.green[1]) return "#22c55e";
  if (inRange(cfg.zones.orange) || v === cfg.zones.orange[1]) return "#f59e0b";
  return "#ef4444";
}

function getGaugeStatus(type, value) {
  const v = Number(value) || 0;
  const cfg = getGaugeOptions(type);

  if (type === "ph") {
    if (v >= cfg.zones.green[0] && v < cfg.zones.green[1]) {
      return { text: "Bình thường", className: "" };
    }
    if (v >= cfg.zones.orange[0] && v < cfg.zones.orange[1]) {
      return { text: "Cảnh báo", className: "warning" };
    }
    return { text: "Nguy hiểm", className: "danger" };
  }

  if (v >= cfg.zones.green[0] && v <= cfg.zones.green[1]) {
    return { text: "Bình thường", className: "" };
  }
  if (v >= cfg.zones.orange[0] && v <= cfg.zones.orange[1]) {
    return { text: "Cảnh báo", className: "warning" };
  }
  return { text: "Nguy hiểm", className: "danger" };
}

function updateGaugeStatus(elementId, type, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const status = getGaugeStatus(type, value);
  el.textContent = status.text;
  el.className = `gauge-status ${status.className}`;
}
function drawGauge(elementId, value, type) {
  const cfg = getGaugeOptions(type);
  const safeValue = Number(value) || 0;
  const barColor = getGaugeColor(type, safeValue);

  Plotly.react(
    elementId,
    [
      {
        type: "indicator",
        mode: "gauge+number",
        value: safeValue,
        number: {
          valueformat: ".0f",   // 👈 HIỂN THỊ SỐ THƯỜNG (không còn k)
          suffix: cfg.unit,
          font: {
            size: 34,
            color: "#0f172a"
          }
        },
        gauge: {
          shape: "angular",
          axis: {
            range: [cfg.min, cfg.max],
            tickmode: "linear",
            tick0: cfg.min,
            dtick: (cfg.max - cfg.min) / 10,
            tickformat: ".0f",   // 👈 TRỤC KHÔNG HIỂN THỊ k
            tickfont: {
              size: 8,
              color: "#64748b"
            }
          },
          bar: {
            color: barColor,
            thickness: 0.35
          },
          steps: [
            {
              range: [cfg.min, cfg.max],
              color: "#e5e7eb"
            }
          ],
          bgcolor: "#ffffff",
          borderWidth: 0,
          threshold: {
            line: {
              color: "#111827",
              width: 4
            },
            thickness: 0.75,
            value: safeValue
          }
        }
      }
    ],
    {
      paper_bgcolor: "white",
      margin: { l: 18, r: 18, t: 10, b: 0 }
    },
    {
      responsive: true,
      displayModeBar: false
    }
  );
}
function renderAllGauges(data) {
  drawGauge("gauge-anhsang", data.ANHSANG, "anhsang");
  drawGauge("gauge-amdat", data.GT_AMDAT, "amdat");
  drawGauge("gauge-doman", data.GT_DOMAN, "doman");
  drawGauge("gauge-ph", data.GT_PH, "ph");
  drawGauge("gauge-h", data.h, "h");
  drawGauge("gauge-t", data.t, "t");

  updateGaugeStatus("status-anhsang", "anhsang", data.ANHSANG);
  updateGaugeStatus("status-amdat", "amdat", data.GT_AMDAT);
  updateGaugeStatus("status-doman", "doman", data.GT_DOMAN);
  updateGaugeStatus("status-ph", "ph", data.GT_PH);
  updateGaugeStatus("status-h", "h", data.h);
  updateGaugeStatus("status-t", "t", data.t);
}

/* =========================
   DEVICE CONTROL
========================= */
function renderDeviceControls(data) {
  const container = document.getElementById("deviceControls");
  if (!container) return;

  const autoMode = isAutoMode(data);

  const normalDevicesHtml = deviceKeys.map((key) => {
    const current = toNumber(data[key], 0);
    const isOn = current === 1;

    return `
      <div class="device-item">
        <div>
          <div class="device-name">${labels[key]}</div>
          <small>
            ${
              autoMode
                ? "Đang ở chế độ AUTO - chạy theo ngưỡng đã cài"
                : `Trạng thái hiện tại: ${isOn ? "Bật" : "Tắt"}`
            }
          </small>
        </div>

        <button
          class="toggle-btn ${isOn ? "toggle-on" : "toggle-off"}"
          onclick="toggleDevice('${key}')"
          ${autoMode || isUpdatingDevice ? "disabled" : ""}
        >
          ${isOn ? "BẬT" : "TẮT"}
        </button>
      </div>
    `;
  }).join("");

  const moValue = toNumber(data.MO, 0);
  const dongValue = toNumber(data.DONG, 0);

  const doorStatusText =
    moValue === 1
      ? "Trạng thái hiện tại: Mở cửa"
      : dongValue === 1
        ? "Trạng thái hiện tại: Đóng cửa"
        : "Trạng thái hiện tại: Chưa chọn";

  const doorHtml = `
    <div class="device-item">
      <div>
        <div class="device-name">Điều khiển màn che</div>
        <small>
          ${
            autoMode
              ? "Đang ở chế độ AUTO - chạy theo ngưỡng đã cài"
              : doorStatusText
          }
        </small>
      </div>

      <div class="toggle-group">
        <button
          class="toggle-btn ${moValue === 1 ? "toggle-on" : "toggle-off"}"
          onclick="setDoorMode('MO')"
          ${autoMode || isUpdatingDevice ? "disabled" : ""}
        >
          MỞ
        </button>

        <button
          class="toggle-btn ${dongValue === 1 ? "toggle-on" : "toggle-off"}"
          onclick="setDoorMode('DONG')"
          ${autoMode || isUpdatingDevice ? "disabled" : ""}
        >
          ĐÓNG
        </button>
      </div>
    </div>
  `;

  container.innerHTML = normalDevicesHtml + doorHtml;
}

window.toggleDevice = async function (key) {
  try {
    if (isUpdatingDevice) return;
    isUpdatingDevice = true;

    const snapshot = await get(ref(db, "/"));
    if (!snapshot.exists()) return;

    const data = snapshot.val();

    if (Number(data.MODE) === MODE_AUTO) {
      console.warn("Đang ở chế độ AUTO, không điều khiển tay.");
      renderDeviceControls(data);
      return;
    }

    const currentValue = toNumber(data[key], 0);
    const nextValue = currentValue === 1 ? 0 : 1;
    const updates = { [key]: nextValue };

    renderDeviceControls({ ...data, ...updates });
    await update(ref(db, "/"), updates);

    const newSnapshot = await get(ref(db, "/"));
    if (newSnapshot.exists()) {
      renderDeviceControls(newSnapshot.val());
    }
  } catch (error) {
    console.error("Lỗi toggle thiết bị:", error);
  } finally {
    isUpdatingDevice = false;
  }
};

window.setDoorMode = async function (doorKey) {
  try {
    if (isUpdatingDevice) return;
    isUpdatingDevice = true;

    const snapshot = await get(ref(db, "/"));
    if (!snapshot.exists()) return;

    const data = snapshot.val();

    if (Number(data.MODE) === MODE_AUTO) {
      console.warn("Đang ở chế độ AUTO, không điều khiển tay.");
      renderDeviceControls(data);
      return;
    }

    const updates =
      doorKey === "MO"
        ? { MO: 1, DONG: 0 }
        : { DONG: 1, MO: 0 };

    renderDeviceControls({ ...data, ...updates });
    await update(ref(db, "/"), updates);

    const newSnapshot = await get(ref(db, "/"));
    if (newSnapshot.exists()) {
      renderDeviceControls(newSnapshot.val());
    }
  } catch (error) {
    console.error("Lỗi điều khiển cửa:", error);
  } finally {
    isUpdatingDevice = false;
  }
};

window.setDevice = async function (key, value) {
  try {
    const snapshot = await get(ref(db, "/"));
    if (!snapshot.exists()) return;

    const data = snapshot.val();

    if (Number(data.MODE) === MODE_AUTO) {
      console.warn("Đang ở chế độ AUTO, thiết bị chạy theo ngưỡng đã cài.");
      return;
    }

    const safeValue = Number(value) === 1 ? 1 : 0;
    const updates = {};

    if (key === "MO") {
      updates.MO = safeValue;
      updates.DONG = safeValue === 1 ? 0 : toNumber(data.DONG, 0);
    } else if (key === "DONG") {
      updates.DONG = safeValue;
      updates.MO = safeValue === 1 ? 0 : toNumber(data.MO, 0);
    } else {
      updates[key] = safeValue;
    }

    await update(ref(db, "/"), updates);
  } catch (error) {
    console.error("Lỗi cập nhật thiết bị:", error);
  }
};

/* =========================
   SETTINGS
========================= */
let settingsRenderedOnce = false;
let isEditingSettings = false;

function renderSettingControls(data) {
  const container = document.getElementById("settingControls");
  if (!container) return;

  if (!settingsRenderedOnce) {
    container.innerHTML = settingKeys.map((key) => {
      return `
        <div class="setting-item">
          <div class="setting-name">${labels[key]}</div>
          <input type="number" step="any" id="input-${key}" />
        </div>
      `;
    }).join("");

    settingKeys.forEach((key) => {
      const input = document.getElementById(`input-${key}`);
      if (!input) return;

      input.addEventListener("focus", () => {
        isEditingSettings = true;
      });

      input.addEventListener("blur", () => {
        setTimeout(() => {
          const active = document.activeElement;
          const stillEditing = settingKeys.some(
            (k) => active && active.id === `input-${k}`
          );
          isEditingSettings = stillEditing;
        }, 100);
      });

      input.addEventListener("input", () => {
        isEditingSettings = true;
      });
    });

    settingsRenderedOnce = true;
  }

  if (isEditingSettings) return;

  settingKeys.forEach((key) => {
    const input = document.getElementById(`input-${key}`);
    if (!input) return;

    const firebaseValue = data[key] ?? "";
    if (document.activeElement !== input) {
      input.value = firebaseValue;
    }
  });
}

const saveSettingsBtn = document.getElementById("saveSettingsBtn");
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", async () => {
    try {
      const updates = {};

      settingKeys.forEach((key) => {
        const input = document.getElementById(`input-${key}`);
        updates[key] = input && input.value !== "" ? Number(input.value) : 0;
      });

      isEditingSettings = false;
      await update(ref(db, "/"), updates);
    } catch (error) {
      console.error("Lỗi lưu cài đặt:", error);
    }
  });
}

/* =========================
   AI_GREEN
========================= */
const AI_GREEN_API_BASE = window.AI_GREEN_API_BASE
  || (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://127.0.0.1:8000"
    : "");
const AI_GREEN_ADVICE_API_URL = `${AI_GREEN_API_BASE}/analyze`;
const AI_GREEN_DIAGNOSIS_API_URL = `${AI_GREEN_API_BASE}/diagnose`;

const openAiGreenBtn = document.getElementById("openAiGreenBtn");
const aiGreenModal = document.getElementById("aiGreenModal");
const closeAiGreenBtn = document.getElementById("closeAiGreenBtn");
const aiModeButtons = document.querySelectorAll("[data-ai-mode]");
const aiModePanels = document.querySelectorAll("[data-ai-panel]");
const aiImageInput = document.getElementById("aiImageInput");
const aiImagePreview = document.getElementById("aiImagePreview");
const aiPreviewEmpty = document.getElementById("aiPreviewEmpty");
const openCameraBtn = document.getElementById("openCameraBtn");
const captureCameraBtn = document.getElementById("captureCameraBtn");
const aiCameraView = document.getElementById("aiCameraView");
const analyzeAiGreenBtn = document.getElementById("analyzeAiGreenBtn");
const aiResult = document.getElementById("aiResult");
const aiDiagnosisResult = document.getElementById("aiDiagnosisResult");

let aiSelectedImage = null;
let aiCameraStream = null;
let activeAiMode = "advice";

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function openAiGreenModal() {
  if (!aiGreenModal) return;
  aiGreenModal.classList.add("open");
  aiGreenModal.setAttribute("aria-hidden", "false");
  setAiMode("advice");
  refreshIcons();
}

function stopAiCamera() {
  if (!aiCameraStream) return;

  aiCameraStream.getTracks().forEach((track) => track.stop());
  aiCameraStream = null;

  if (aiCameraView) {
    aiCameraView.hidden = true;
    aiCameraView.srcObject = null;
  }

  if (captureCameraBtn) {
    captureCameraBtn.hidden = true;
  }
}

function closeAiGreenModal() {
  if (!aiGreenModal) return;
  aiGreenModal.classList.remove("open");
  aiGreenModal.setAttribute("aria-hidden", "true");
  stopAiCamera();
}

function setAiMode(mode) {
  activeAiMode = mode;

  aiModeButtons.forEach((button) => {
    const isActive = button.dataset.aiMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  aiModePanels.forEach((panel) => {
    panel.hidden = panel.dataset.aiPanel !== mode;
  });

  if (analyzeAiGreenBtn) {
    analyzeAiGreenBtn.innerHTML = mode === "diagnosis"
      ? `<i data-lucide="stethoscope"></i> Chẩn đoán bệnh`
      : `<i data-lucide="sparkles"></i> Phân tích ảnh`;
  }

  refreshIcons();
}

function setAiPreview(file) {
  if (!file || !aiImagePreview || !aiPreviewEmpty) return;

  aiSelectedImage = file;
  aiImagePreview.src = URL.createObjectURL(file);
  aiImagePreview.hidden = false;
  aiPreviewEmpty.hidden = true;
}

function setAiLoading(isLoading) {
  if (!analyzeAiGreenBtn) return;
  analyzeAiGreenBtn.disabled = isLoading;
  analyzeAiGreenBtn.innerHTML = isLoading
    ? `<i data-lucide="loader-circle"></i> Đang phân tích...`
    : activeAiMode === "diagnosis"
      ? `<i data-lucide="stethoscope"></i> Chẩn đoán bệnh`
      : `<i data-lucide="sparkles"></i> Phân tích ảnh`;
  refreshIcons();
}

function getActiveAiResultElement() {
  return activeAiMode === "diagnosis" ? aiDiagnosisResult : aiResult;
}

function renderAiError(message) {
  const resultEl = getActiveAiResultElement();
  if (!resultEl) return;
  resultEl.innerHTML = `<div class="ai-error">${message}</div>`;
}

function renderList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return `
    <section class="result-section">
      <h4>${title}</h4>
      <ul>
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderEnvironment(environment = {}) {
  const entries = [
    ["Nhiệt độ", environment.temperature],
    ["Độ ẩm", environment.humidity],
    ["Ánh sáng", environment.light],
    ["Nước/tưới", environment.water],
    ["Thông gió", environment.ventilation]
  ].filter(([, value]) => value);

  if (entries.length === 0) return "";

  return `
    <section class="result-section">
      <h4>Tư vấn môi trường</h4>
      <div class="environment-grid">
        ${entries.map(([label, value]) => `
          <div class="environment-item">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMarketInfo(market = {}) {
  const formatValue = (value) => {
    if (Array.isArray(value)) return value.join("; ");
    return value;
  };

  const entries = [
    ["Vùng/tỉnh phù hợp", formatValue(market.suitable_regions)],
    ["Năng suất tham khảo", market.yield_reference],
    ["Giá bán tham khảo", market.price_reference],
    ["Doanh thu/lợi nhuận ước tính", market.revenue_reference],
    ["Lưu ý thị trường", market.farmer_note]
  ].filter(([, value]) => value);

  if (entries.length === 0) return "";

  return `
    <section class="result-section">
      <h4>Vùng trồng và hiệu quả kinh tế</h4>
      <div class="environment-grid">
        ${entries.map(([label, value]) => `
          <div class="environment-item">
            <strong>${label}</strong>
            <span>${value}</span>
          </div>
        `).join("")}
      </div>
      ${market.source_note ? `<p class="muted-note">${market.source_note}</p>` : ""}
    </section>
  `;
}

function renderAiResult(result) {
  if (!aiResult) return;

  const advice = result.advice || {};
  const speciesName = result.species_name || advice.name_vi || "Chưa xác định";
  const scientificName = result.scientific_name || advice.scientific_name || "";

  aiResult.innerHTML = `
    <div class="result-head">
      <div>
        <h3>${speciesName}</h3>
        <p>${scientificName ? `${scientificName} · ` : ""}Độ khó: ${advice.difficulty || "Chưa đánh giá"}</p>
      </div>
    </div>

    <section class="result-section">
      <h4>Trồng được không?</h4>
      <p>${advice.can_grow || "Chưa đủ dữ liệu để tư vấn."}</p>
    </section>

    ${advice.overview ? `
      <section class="result-section">
        <h4>Tổng quan</h4>
        <p>${advice.overview}</p>
      </section>
    ` : ""}

    ${renderEnvironment(advice.environment)}
    ${renderMarketInfo(advice.market_info)}
    ${renderList("Giá thể phù hợp", advice.substrate)}
    ${renderList("Quy trình gợi ý", advice.growing_steps)}
    ${renderList("Lưu ý cho nông dân", advice.farmer_tips)}
    ${advice.harvest ? `
      <section class="result-section">
        <h4>Thu hoạch</h4>
        <p>${advice.harvest}</p>
      </section>
    ` : ""}
    ${result.warning ? `
      <section class="result-section warning-section">
        <h4>Cảnh báo model</h4>
        <p>${result.warning}</p>
      </section>
    ` : ""}
    ${result.mock_mode ? `
      <section class="result-section">
        <h4>Chế độ demo</h4>
        <p>Backend đang chạy mock mode. Khi có model nhận dạng 5 loại nấm đã train, đổi cấu hình API sang EfficientNet hoặc YOLO classification để phân tích thật.</p>
      </section>
    ` : ""}
    ${advice.note ? `
      <section class="result-section">
        <h4>Lưu ý</h4>
        <p>${advice.note}</p>
      </section>
    ` : ""}
  `;
}

function renderDiagnosisResult(result) {
  if (!aiDiagnosisResult) return;

  const advice = result.advice || {};
  const diagnosisName = result.diagnosis_name || advice.name_vi || "Chưa xác định";

  aiDiagnosisResult.innerHTML = `
    <div class="result-head">
      <div>
        <h3>${diagnosisName}</h3>
        <p>Mức độ: ${advice.severity || "Chưa đánh giá"}</p>
      </div>
    </div>

    ${advice.summary ? `
      <section class="result-section">
        <h4>Nhận định</h4>
        <p>${advice.summary}</p>
      </section>
    ` : ""}

    ${renderList("Dấu hiệu thường gặp", advice.signs)}
    ${renderList("Nguyên nhân có thể", advice.causes)}
    ${renderList("Việc nên làm", advice.actions)}
    ${renderEnvironment(advice.environment)}

    ${result.warning ? `
      <section class="result-section warning-section">
        <h4>Cảnh báo model</h4>
        <p>${result.warning}</p>
      </section>
    ` : ""}
    ${result.mock_mode ? `
      <section class="result-section">
        <h4>Chế độ demo</h4>
        <p>Backend đang chạy mock mode. Khi có model YOLO classification chẩn đoán, API sẽ dùng model thật.</p>
      </section>
    ` : ""}
    ${advice.note ? `
      <section class="result-section">
        <h4>Lưu ý</h4>
        <p>${advice.note}</p>
      </section>
    ` : ""}
  `;
}

if (openAiGreenBtn) {
  openAiGreenBtn.addEventListener("click", openAiGreenModal);
}

if (closeAiGreenBtn) {
  closeAiGreenBtn.addEventListener("click", closeAiGreenModal);
}

aiModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAiMode(button.dataset.aiMode);
  });
});

if (aiGreenModal) {
  aiGreenModal.querySelectorAll("[data-ai-close]").forEach((el) => {
    el.addEventListener("click", closeAiGreenModal);
  });
}

if (aiImageInput) {
  aiImageInput.addEventListener("change", () => {
    const file = aiImageInput.files?.[0];
    if (file) {
      setAiPreview(file);
      stopAiCamera();
    }
  });
}

if (openCameraBtn) {
  openCameraBtn.addEventListener("click", async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        renderAiError("Trình duyệt không hỗ trợ mở camera trực tiếp.");
        return;
      }

      aiCameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });

      aiCameraView.srcObject = aiCameraStream;
      aiCameraView.hidden = false;
      captureCameraBtn.hidden = false;
    } catch (error) {
      console.error("Lỗi mở camera:", error);
      renderAiError("Không mở được camera. Hãy kiểm tra quyền truy cập camera của trình duyệt.");
    }
  });
}

if (captureCameraBtn) {
  captureCameraBtn.addEventListener("click", () => {
    if (!aiCameraView || !aiCameraView.videoWidth) {
      renderAiError("Camera chưa sẵn sàng để chụp ảnh.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = aiCameraView.videoWidth;
    canvas.height = aiCameraView.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(aiCameraView, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `ai-green-${Date.now()}.jpg`, { type: "image/jpeg" });
      setAiPreview(file);
      stopAiCamera();
    }, "image/jpeg", 0.92);
  });
}

if (analyzeAiGreenBtn) {
  analyzeAiGreenBtn.addEventListener("click", async () => {
    if (!aiSelectedImage) {
      renderAiError("Bạn cần chọn ảnh hoặc chụp ảnh trước khi phân tích.");
      return;
    }

    try {
      setAiLoading(true);
      const formData = new FormData();
      formData.append("image", aiSelectedImage);

      const apiUrl = activeAiMode === "diagnosis" ? AI_GREEN_DIAGNOSIS_API_URL : AI_GREEN_ADVICE_API_URL;
      const response = await fetch(apiUrl, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API trả lỗi ${response.status}`);
      }

      const result = await response.json();
      if (activeAiMode === "diagnosis") {
        renderDiagnosisResult(result);
      } else {
        renderAiResult(result);
      }
      refreshIcons();
    } catch (error) {
      console.error("Lỗi AI_Green:", error);
      renderAiError("Chưa kết nối được AI_Green API. Hãy chạy backend Python ở cổng 8000 rồi thử lại.");
    } finally {
      setAiLoading(false);
    }
  });
}

/* =========================
   AUTO CONTROL THEO NGƯỠNG
========================= */
async function applyAutoControl(data) {
  if (!isAutoMode(data)) return;

  const updates = {};

  const soil = toNumber(data.GT_AMDAT);
  const light = toNumber(data.ANHSANG);
  const humidity = toNumber(data.h);
  const temp = toNumber(data.t);
  const salinity = toNumber(data.GT_DOMAN);
  const ph = toNumber(data.GT_PH);

  const setSoil = toNumber(data.SET_AMDAT);
  const setLight = toNumber(data.SET_AS);
  const setHumidity = toNumber(data.SET_H);
  const setTemp = toNumber(data.SET_T);
  const setSalinity = toNumber(data.SET_DOMAN);
  const setPhLow = toNumber(data.SET_PHLOW);
  const setPhHigh = toNumber(data.SET_PHHIGH);

  // Máy bơm: bật khi độ ẩm đất thấp hơn ngưỡng
  updates.BOM = soil < setSoil ? 1 : 0;

  // Đèn: bật khi ánh sáng thấp hơn ngưỡng
  updates.DEN = light < setLight ? 1 : 0;

  // Phun sương: bật khi độ ẩm không khí thấp hơn ngưỡng
  updates.SUONG = humidity < setHumidity ? 1 : 0;

  // Quạt: bật khi nhiệt độ cao hơn ngưỡng
  updates.QUAT = temp > setTemp ? 1 : 0;

  // Logic cửa:
  // Nếu độ mặn cao hơn ngưỡng hoặc pH ngoài khoảng cho phép => mở cửa
  // Ngược lại => đóng cửa
  const needOpenDoor =
    salinity > setSalinity || ph < setPhLow || ph > setPhHigh;

  if (needOpenDoor) {
    updates.MO = 1;
    updates.DONG = 0;
  } else {
    updates.DONG = 1;
    updates.MO = 0;
  }

  const currentState = {
    BOM: toNumber(data.BOM),
    DEN: toNumber(data.DEN),
    SUONG: toNumber(data.SUONG),
    QUAT: toNumber(data.QUAT),
    MO: toNumber(data.MO),
    DONG: toNumber(data.DONG)
  };

  const hasChanged = Object.keys(updates).some(
    (key) => toNumber(currentState[key]) !== toNumber(updates[key])
  );

  if (hasChanged) {
    await update(ref(db, "/"), updates);
  }
}

/* =========================
   CHARTS - CHART.JS
========================= */
const UPDATE_INTERVAL_MS = 5 * 1000;
const MAX_POINTS = 10;

const historyData = {
  labels: [],
  t: [],
  h: [],
  ANHSANG: [],
  GT_AMDAT: [],
  GT_DOMAN: [],
  GT_PH: []
};

let envChart = null;
let lightChart = null;
let soilChart = null;
let salinityChart = null;
let phChart = null;

function formatClock(date = new Date()) {
  return date.toLocaleTimeString("vi-VN");
}

function updateRealtimeUI(data) {
  renderAllGauges(data);
  renderDeviceControls(data);
  renderSettingControls(data);
  renderMode(data.MODE);
}

function clearHistory() {
  historyData.labels = [];
  historyData.t = [];
  historyData.h = [];
  historyData.ANHSANG = [];
  historyData.GT_AMDAT = [];
  historyData.GT_DOMAN = [];
  historyData.GT_PH = [];
}

function pushHistory(data, readAt = new Date()) {
  const timeLabel = formatClock(readAt);

  historyData.labels.push(timeLabel);
  historyData.t.push(toNumber(data.t, 0));
  historyData.h.push(toNumber(data.h, 0));
  historyData.ANHSANG.push(toNumber(data.ANHSANG, 0));
  historyData.GT_AMDAT.push(toNumber(data.GT_AMDAT, 0));
  historyData.GT_DOMAN.push(toNumber(data.GT_DOMAN, 0));
  historyData.GT_PH.push(toNumber(data.GT_PH, 0));

  if (historyData.labels.length > MAX_POINTS) {
    historyData.labels.shift();
    historyData.t.shift();
    historyData.h.shift();
    historyData.ANHSANG.shift();
    historyData.GT_AMDAT.shift();
    historyData.GT_DOMAN.shift();
    historyData.GT_PH.shift();
  }
}

function seedHistory(data, readAt = new Date()) {
  clearHistory();

  for (let i = MAX_POINTS - 1; i >= 0; i--) {
    const d = new Date(readAt.getTime() - i * UPDATE_INTERVAL_MS);
    pushHistory(data, d);
  }
}

function createChartOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#475569",
          boxWidth: 18,
          boxHeight: 3,
          usePointStyle: false
        }
      },
      tooltip: {
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        backgroundColor: "rgba(15,23,42,0.92)",
        borderColor: "rgba(255,255,255,0.12)",
        borderWidth: 1
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Thời gian đọc dữ liệu",
          color: "#334155",
          font: {
            size: 12,
            weight: "bold"
          }
        },
        ticks: {
          color: "#64748b",
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false
        },
        grid: {
          color: "#edf2f7"
        },
        border: {
          color: "#e2e8f0"
        }
      },
      y: {
        title: {
          display: true,
          text: yLabel,
          color: "#334155",
          font: {
            size: 12,
            weight: "bold"
          }
        },
        ticks: {
          color: "#64748b"
        },
        grid: {
          color: "#edf2f7"
        },
        border: {
          color: "#e2e8f0"
        }
      }
    }
  };
}

function buildOrUpdateLineChart(chartRef, canvasId, datasets, yLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  if (chartRef) {
    chartRef.destroy();
  }

  return new Chart(canvas, {
    type: "line",
    data: {
      labels: historyData.labels,
      datasets
    },
    options: createChartOptions(yLabel)
  });
}

function renderCharts() {
  envChart = buildOrUpdateLineChart(
    envChart,
    "chart-temp-humi",
    [
      {
        label: "Nhiệt độ (°C)",
        data: historyData.t,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.15)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#3b82f6"
      },
      {
        label: "Độ ẩm (%)",
        data: historyData.h,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.12)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#10b981"
      }
    ],
    "Giá trị đo"
  );

  lightChart = buildOrUpdateLineChart(
    lightChart,
    "chart-light",
    [
      {
        label: "Ánh sáng (lux)",
        data: historyData.ANHSANG,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.15)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#f59e0b"
      }
    ],
    "Lux"
  );

  soilChart = buildOrUpdateLineChart(
    soilChart,
    "chart-soil-moisture",
    [
      {
        label: "Độ ẩm đất (%)",
        data: historyData.GT_AMDAT,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.15)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#22c55e",
        pointBorderColor: "#22c55e"
      }
    ],
    "%"
  );

  salinityChart = buildOrUpdateLineChart(
    salinityChart,
    "chart-salinity",
    [
      {
        label: "Độ mặn (ppm)",
        data: historyData.GT_DOMAN,
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139,92,246,0.15)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#8b5cf6"
      }
    ],
    "ppm"
  );

  phChart = buildOrUpdateLineChart(
    phChart,
    "chart-ph",
    [
      {
        label: "pH",
        data: historyData.GT_PH,
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.15)",
        tension: 0.4,
        fill: false,
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#06b6d4",
        pointBorderColor: "#06b6d4"
      }
    ],
    "pH"
  );
}

/* =========================
   FETCH DATA
========================= */
async function fetchDataOnce() {
  try {
    const snapshot = await get(ref(db, "/"));
    if (!snapshot.exists()) return;

    let data = snapshot.val();
    const now = new Date();

    updateRealtimeUI(data);

    if (isAutoMode(data)) {
      await applyAutoControl(data);

      const newSnapshot = await get(ref(db, "/"));
      if (newSnapshot.exists()) {
        data = newSnapshot.val();
        updateRealtimeUI(data);
      }
    }

    if (historyData.labels.length === 0) {
      seedHistory(data, now);
    } else {
      pushHistory(data, now);
    }

    renderCharts();
    console.log("Đã cập nhật biểu đồ:", formatClock(now), data);
  } catch (error) {
    console.error("Lỗi đọc dữ liệu biểu đồ:", error);
  }
}

fetchDataOnce();
setInterval(fetchDataOnce, UPDATE_INTERVAL_MS);
