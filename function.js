import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

    const firebaseConfig = {
      apiKey:      "AIzaSyDZSJaNdpgmYwdngMDn-1_EKkUVmtVNaRo",
      databaseURL: "https://weather-app-esp32-default-rtdb.asia-southeast1.firebasedatabase.app/"
    };
    const app = initializeApp(firebaseConfig);
    const db  = getDatabase(app);

    // Date
    const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const n = new Date();
    document.getElementById("dateDisplay").textContent =
      days[n.getDay()] + ", " + n.getDate() + " " + months[n.getMonth()];

    const MAX_LIVE = 20, MAX_HIST = 100, KEY = "wx_kento_v1";
    let liveTemp = [], liveHum = [], liveLabels = [];
    let history = JSON.parse(localStorage.getItem(KEY) || "[]");
    let temp = null, hum = null;

    const tempVal  = document.getElementById("tempVal");
    const humVal   = document.getElementById("humVal");
    const tempSub  = document.getElementById("tempSub");
    const humSub   = document.getElementById("humSub");
    const dot      = document.getElementById("statusDot");
    const statusTx = document.getElementById("statusText");
    const lastUpd  = document.getElementById("lastUpdate");

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

    const liveChart = new Chart(document.getElementById("liveChart"), {
      type: "line",
      data: { labels: liveLabels, datasets: [ds("Temperature °C", liveTemp, "#141414", "yTemp", false), ds("Humidity %", liveHum, "#888884", "yHum", true)] },
      options: baseOpts
    });

    const histChart = new Chart(document.getElementById("histChart"), {
      type: "line",
      data: { labels: history.map(h=>h.t), datasets: [ds("Temperature °C", history.map(h=>h.temp), "#141414", "yTemp", false), ds("Humidity %", history.map(h=>h.hum), "#888884", "yHum", true)] },
      options: baseOpts
    });

    function timeNow() {
      const d = new Date();
      return d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0")+":"+d.getSeconds().toString().padStart(2,"0");
    }
    function setStatus(s, m) { dot.className="dot "+s; statusTx.textContent=m; }

    function tryUpdate() {
      if (temp===null||hum===null) return;
      const label = timeNow();
      tempVal.className = humVal.className = "metric-num";
      tempVal.textContent = temp.toFixed(1);
      humVal.textContent  = hum.toFixed(1);
      const comfort = temp>30?"Hot":temp>25?"Warm":temp>18?"Comfortable":"Cool";
      const humid   = hum>80?"Very humid":hum>60?"Humid":hum>40?"Comfortable":"Dry";
      tempSub.innerHTML = `<strong>${comfort}</strong> &nbsp;·&nbsp; ${label}`;
      humSub.innerHTML  = `<strong>${humid}</strong> &nbsp;·&nbsp; ${label}`;
      lastUpd.textContent = "Last update: " + label;

      liveLabels.push(label); liveTemp.push(+temp.toFixed(2)); liveHum.push(+hum.toFixed(2));
      if (liveLabels.length>MAX_LIVE){liveLabels.shift();liveTemp.shift();liveHum.shift();}
      liveChart.update("active");

      history.push({t:label,temp:+temp.toFixed(2),hum:+hum.toFixed(2)});
      if (history.length>MAX_HIST) history.shift();
      localStorage.setItem(KEY, JSON.stringify(history));
      histChart.data.labels=history.map(h=>h.t);
      histChart.data.datasets[0].data=history.map(h=>h.temp);
      histChart.data.datasets[1].data=history.map(h=>h.hum);
      histChart.update("active");
      setStatus("live","Live · "+label);
    }

    onValue(ref(db,"weather/temperature"),s=>{temp=s.val();tryUpdate();},e=>setStatus("error","Error: "+e.message));
    onValue(ref(db,"weather/humidity"),s=>{hum=s.val();tryUpdate();},e=>setStatus("error","Error: "+e.message));