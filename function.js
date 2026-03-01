 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

    const firebaseConfig = {
      apiKey:      "AIzaSyDZSJaNdpgmYwdngMDn-1_EKkUVmtVNaRo",
      databaseURL: "https://weather-app-esp32-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };
    const app = initializeApp(firebaseConfig);
    const db  = getDatabase(app);

    // ── Date display ──────────────────────────────────────────────────────────
    const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    document.getElementById("dateDisplay").textContent =
      DAYS[now.getDay()] + ", " + now.getDate() + " " + MONTHS[now.getMonth()];

    // ── State ─────────────────────────────────────────────────────────────────
    const MAX_LIVE = 20, MAX_HIST = 100, KEY = "wx_kento_v2";
    let liveTemp = [], liveHum = [], liveLabels = [];
    let history  = JSON.parse(localStorage.getItem(KEY) || "[]");
    let temp = null, hum = null;
    let tempMin = Infinity, tempMax = -Infinity;
    let humMin  = Infinity, humMax  = -Infinity;

    // ── DOM ───────────────────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const tempVal   = $("tempVal"),  humVal  = $("humVal");
    const heatVal   = $("heatVal"),  heatSub = $("heatSub");
    const tempSub   = $("tempSub"),  humSub  = $("humSub");
    const tempMinEl = $("tempMin"),  tempMaxEl = $("tempMax");
    const humMinEl  = $("humMin"),   humMaxEl  = $("humMax");
    const dot       = $("statusDot"), statusTx = $("statusText");
    const lastUpd   = $("lastUpdate");
    const alertBanner = $("alertBanner");
    const alertIcon   = $("alertIcon");
    const alertText   = $("alertText");

    // ── Heat Index (Rothfusz equation) ────────────────────────────────────────
    function calcHeatIndex(T, RH) {
      // Only meaningful above 27°C
      if (T < 27) return T;
      const HI =
        -8.78469475556 +
        1.61139411 * T +
        2.33854883889 * RH +
        -0.14611605 * T * RH +
        -0.012308094 * T * T +
        -0.016424828 * RH * RH +
        0.002211732 * T * T * RH +
        0.00072546 * T * RH * RH +
        -0.000003582 * T * T * RH * RH;
      return Math.round(HI * 10) / 10;
    }

    // ── Alerts ────────────────────────────────────────────────────────────────
    function checkAlerts(t, h, hi) {
      if (t >= 38) {
        alertBanner.className = "alert-banner show danger";
        alertIcon.textContent = "🚨";
        alertText.innerHTML = "<strong>Extreme Heat!</strong> Temperature is " + t.toFixed(1) + "°C — dangerous conditions.";
      } else if (t >= 35 || hi >= 40) {
        alertBanner.className = "alert-banner show";
        alertIcon.textContent = "⚠️";
        alertText.innerHTML = "<strong>High Temperature Alert!</strong> It is very hot (" + t.toFixed(1) + "°C, feels like " + hi + "°C). Stay hydrated.";
      } else if (h >= 85) {
        alertBanner.className = "alert-banner show";
        alertIcon.textContent = "💧";
        alertText.innerHTML = "<strong>High Humidity Alert!</strong> Humidity is at " + h.toFixed(1) + "% — feels very muggy.";
      } else {
        alertBanner.className = "alert-banner";
      }
    }

    // ── Chart config ──────────────────────────────────────────────────────────
    const baseOpts = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#fff",
          borderColor: "#e5e5e3",
          borderWidth: 1,
          titleColor: "#888884",
          bodyColor: "#141414",
          padding: 10,
          titleFont: { family: "Inter", size: 10 },
          bodyFont: { family: "Inter", size: 12 },
        }
      },
      scales: {
        x: {
          grid: { color: "#f0f0ee" },
          ticks: { color: "#c8c8c4", font: { family: "Inter", size: 9 }, maxTicksLimit: 7 }
        },
        yTemp: {
          type: "linear", position: "left",
          grid: { color: "#f0f0ee" },
          ticks: { color: "#888884", font: { family: "Inter", size: 9 }, callback: v => v + "°" }
        },
        yHum: {
          type: "linear", position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: "#c8c8c4", font: { family: "Inter", size: 9 }, callback: v => v + "%" }
        }
      }
    };

    function ds(label, data, color, yAxisID, dashed) {
      return {
        label, data, yAxisID,
        borderColor: color,
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: dashed ? [4,3] : [],
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        tension: 0.35,
        fill: false,
      };
    }

    const liveChart = new Chart($("liveChart"), {
      type: "line",
      data: {
        labels: liveLabels,
        datasets: [
          ds("Temperature °C", liveTemp, "#141414", "yTemp", false),
          ds("Humidity %",     liveHum,  "#888884", "yHum",  true),
        ]
      },
      options: JSON.parse(JSON.stringify(baseOpts))
    });

    const histChart = new Chart($("histChart"), {
      type: "line",
      data: {
        labels: history.map(h => h.t),
        datasets: [
          ds("Temperature °C", history.map(h => h.temp), "#141414", "yTemp", false),
          ds("Humidity %",     history.map(h => h.hum),  "#888884", "yHum",  true),
        ]
      },
      options: JSON.parse(JSON.stringify(baseOpts))
    });

    // ── Chart toggle ──────────────────────────────────────────────────────────
    function applyToggle(chartObj, show) {
      chartObj.data.datasets[0].hidden = (show === "hum");
      chartObj.data.datasets[1].hidden = (show === "temp");
      chartObj.update();
    }

    document.querySelectorAll(".toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const group = btn.closest(".toggle-group");
        group.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const chartName = btn.dataset.chart;
        const show      = btn.dataset.show;
        applyToggle(chartName === "live" ? liveChart : histChart, show);
      });
    });

    // ── Export CSV ────────────────────────────────────────────────────────────
    $("exportBtn").addEventListener("click", () => {
      if (!history.length) { alert("No data to export yet!"); return; }
      const rows = ["Time,Temperature (°C),Humidity (%)"];
      history.forEach(r => rows.push(`${r.t},${r.temp},${r.hum}`));
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "kentozaki_weather_" + new Date().toISOString().slice(0,10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function timeNow() {
      const d = new Date();
      return d.getHours().toString().padStart(2,"0") + ":" +
             d.getMinutes().toString().padStart(2,"0") + ":" +
             d.getSeconds().toString().padStart(2,"0");
    }
    function setStatus(s, m) { dot.className = "dot " + s; statusTx.textContent = m; }

    // ── Main update ───────────────────────────────────────────────────────────
    function tryUpdate() {
      if (temp === null || hum === null) return;
      const label = timeNow();

      // Metric cards
      tempVal.className = humVal.className = heatVal.className = "metric-num";
      tempVal.textContent = temp.toFixed(1);
      humVal.textContent  = hum.toFixed(1);

      // Heat index
      const hi = calcHeatIndex(temp, hum);
      heatVal.textContent = hi;
      const hiDiff = (hi - temp).toFixed(1);
      heatSub.innerHTML = hi > temp
        ? `<strong>+${hiDiff}°</strong> above actual`
        : `Same as actual temp`;

      // Comfort labels
      const comfort = temp > 30 ? "Hot" : temp > 25 ? "Warm" : temp > 18 ? "Comfortable" : "Cool";
      const humid   = hum  > 80 ? "Very humid" : hum > 60 ? "Humid" : hum > 40 ? "Comfortable" : "Dry";
      tempSub.innerHTML = `<strong>${comfort}</strong> &nbsp;·&nbsp; ${label}`;
      humSub.innerHTML  = `<strong>${humid}</strong> &nbsp;·&nbsp; ${label}`;
      lastUpd.textContent = "Last update: " + label;

      // Min / Max
      if (temp < tempMin) tempMin = temp;
      if (temp > tempMax) tempMax = temp;
      if (hum  < humMin)  humMin  = hum;
      if (hum  > humMax)  humMax  = hum;
      tempMinEl.textContent = tempMin.toFixed(1);
      tempMaxEl.textContent = tempMax.toFixed(1);
      humMinEl.textContent  = humMin.toFixed(1);
      humMaxEl.textContent  = humMax.toFixed(1);

      // Alerts
      checkAlerts(temp, hum, hi);

      // Live chart
      liveLabels.push(label);
      liveTemp.push(+temp.toFixed(2));
      liveHum.push(+hum.toFixed(2));
      if (liveLabels.length > MAX_LIVE) { liveLabels.shift(); liveTemp.shift(); liveHum.shift(); }
      liveChart.update("active");

      // History + localStorage
      history.push({ t: label, temp: +temp.toFixed(2), hum: +hum.toFixed(2) });
      if (history.length > MAX_HIST) history.shift();
      localStorage.setItem(KEY, JSON.stringify(history));
      histChart.data.labels = history.map(h => h.t);
      histChart.data.datasets[0].data = history.map(h => h.temp);
      histChart.data.datasets[1].data = history.map(h => h.hum);
      histChart.update("active");

      setStatus("live", "Live · " + label);
    }

    onValue(ref(db, "weather/temperature"), s => { temp = s.val(); tryUpdate(); },
      e => setStatus("error", "Error: " + e.message));
    onValue(ref(db, "weather/humidity"),    s => { hum  = s.val(); tryUpdate(); },
      e => setStatus("error", "Error: " + e.message));