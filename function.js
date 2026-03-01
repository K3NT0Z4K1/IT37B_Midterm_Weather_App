import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getDatabase, ref, onValue }
                                  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

    // ── Firebase config ───────────────────────────────────────────────────────
    const firebaseConfig = {
      apiKey:      "AIzaSyDZSJaNdpgmYwdngMDn-1_EKkUVmtVNaRo",
      databaseURL: "https://weather-app-esp32-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };

    const app = initializeApp(firebaseConfig);
    const db  = getDatabase(app);

    // ── State ─────────────────────────────────────────────────────────────────
    const MAX_LIVE = 20;
    const MAX_HIST = 100;
    const HISTORY_KEY = "wx_history";

    let liveTemp = [], liveHum = [], liveLabels = [];
    let history  = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const tempVal  = document.getElementById("tempVal");
    const humVal   = document.getElementById("humVal");
    const tempSub  = document.getElementById("tempSub");
    const humSub   = document.getElementById("humSub");
    const dot      = document.getElementById("statusDot");
    const statusTx = document.getElementById("statusText");

    // ── Chart helpers ─────────────────────────────────────────────────────────
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: "#111827",
        borderColor: "rgba(34,211,238,.3)",
        borderWidth: 1,
        titleColor: "#94a3b8",
        bodyColor: "#e2e8f0",
        padding: 10,
        titleFont: { family: "'Syne Mono', monospace", size: 11 },
        bodyFont: { family: "'DM Sans', sans-serif", size: 13 }
      }},
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,.04)" },
          ticks: { color: "#4b5563", font: { family: "'Syne Mono', monospace", size: 10 }, maxTicksLimit: 8 }
        },
        yTemp: {
          type: "linear", position: "left",
          grid: { color: "rgba(255,255,255,.04)" },
          ticks: { color: "#22d3ee", font: { family: "'Syne Mono', monospace", size: 10 }, callback: v => v + "°" },
        },
        yHum: {
          type: "linear", position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: "#f59e0b", font: { family: "'Syne Mono', monospace", size: 10 }, callback: v => v + "%" },
        }
      }
    };

    function makeDataset(label, data, color, yAxisID) {
      return {
        label, data,
        yAxisID,
        borderColor: color,
        backgroundColor: color.replace(")", ",.08)").replace("rgb", "rgba"),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        tension: 0.4,
        fill: true,
      };
    }

    // Live chart
    const liveChart = new Chart(
      document.getElementById("liveChart"),
      {
        type: "line",
        data: {
          labels: liveLabels,
          datasets: [
            makeDataset("Temperature °C", liveTemp, "rgb(34,211,238)", "yTemp"),
            makeDataset("Humidity %",     liveHum,  "rgb(245,158,11)", "yHum"),
          ]
        },
        options: { ...chartDefaults }
      }
    );

    // History chart
    const histLabels = history.map(h => h.t);
    const histTemp   = history.map(h => h.temp);
    const histHum    = history.map(h => h.hum);

    const histChart = new Chart(
      document.getElementById("histChart"),
      {
        type: "line",
        data: {
          labels: histLabels,
          datasets: [
            makeDataset("Temperature °C", histTemp, "rgb(34,211,238)", "yTemp"),
            makeDataset("Humidity %",     histHum,  "rgb(245,158,11)", "yHum"),
          ]
        },
        options: { ...chartDefaults }
      }
    );

    // ── Time helper ───────────────────────────────────────────────────────────
    function timeNow() {
      const d = new Date();
      return d.getHours().toString().padStart(2,"0") + ":" +
             d.getMinutes().toString().padStart(2,"0") + ":" +
             d.getSeconds().toString().padStart(2,"0");
    }

    // ── Status helpers ────────────────────────────────────────────────────────
    function setStatus(state, msg) {
      dot.className = "dot " + state;
      statusTx.textContent = msg;
    }

    // ── Main listener ─────────────────────────────────────────────────────────
    let temp = null, hum = null;

    function tryUpdate() {
      if (temp === null || hum === null) return;

      const label = timeNow();

      // Update display cards
      tempVal.className = "metric-value";
      humVal.className  = "metric-value";
      tempVal.textContent = temp.toFixed(1);
      humVal.textContent  = hum.toFixed(1);

      // Comfort description
      const comfort = temp > 30 ? "🔥 Hot" : temp > 25 ? "☀️ Warm" : temp > 18 ? "😊 Comfortable" : "❄️ Cool";
      const humid   = hum > 80 ? "💦 Very humid" : hum > 60 ? "🌫️ Humid" : hum > 40 ? "👌 Comfortable" : "🏜️ Dry";
      tempSub.innerHTML = `<strong>${comfort}</strong> · Last update: ${label}`;
      humSub.innerHTML  = `<strong>${humid}</strong> · Last update: ${label}`;

      // ── Live chart (rolling window) ────────────────────────────────────────
      liveLabels.push(label);
      liveTemp.push(parseFloat(temp.toFixed(2)));
      liveHum.push(parseFloat(hum.toFixed(2)));
      if (liveLabels.length > MAX_LIVE) {
        liveLabels.shift(); liveTemp.shift(); liveHum.shift();
      }
      liveChart.update("active");

      // ── History chart + localStorage ──────────────────────────────────────
      history.push({ t: label, temp: parseFloat(temp.toFixed(2)), hum: parseFloat(hum.toFixed(2)) });
      if (history.length > MAX_HIST) history.shift();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

      histChart.data.labels   = history.map(h => h.t);
      histChart.data.datasets[0].data = history.map(h => h.temp);
      histChart.data.datasets[1].data = history.map(h => h.hum);
      histChart.update("active");

      setStatus("live", "Connected · " + label);
    }

    // Listen to temperature
    onValue(ref(db, "weather/temperature"), snap => {
      temp = snap.val();
      tryUpdate();
    }, err => {
      setStatus("error", "DB Error: " + err.message);
    });

    // Listen to humidity
    onValue(ref(db, "weather/humidity"), snap => {
      hum = snap.val();
      tryUpdate();
    }, err => {
      setStatus("error", "DB Error: " + err.message);
    });
