# Kentozaki Weather App

A minimal, real-time weather monitoring dashboard built with HTML, CSS, and JavaScript. Reads live temperature and humidity data from an ESP32 + DHT11 sensor via Firebase Realtime Database and displays it on a clean web interface hosted on GitHub Pages.

---

## Features

- 🌡️ Live temperature and humidity readings
- 📈 Live graph — rolling window of the last 20 readings
- 📊 History graph — stores up to 100 readings using localStorage
- 🟢 Connection status indicator
- 📱 Responsive — works on mobile and desktop
- ⚡ Auto-updates every 5 seconds (no page refresh needed)

---

## Tech Stack

| Part | Technology |
|---|---|
| Microcontroller | ESP32 (CP2101) |
| Sensor | DHT11 (Temperature & Humidity) |
| Database | Firebase Realtime Database |
| Frontend | HTML / CSS / JavaScript |
| Charts | Chart.js |
| Hosting | GitHub Pages |

---

## Hardware Setup

**DHT11 wiring:**

```
DHT11 Pin  →  ESP32 Pin
─────────────────────────
VCC        →  3.3V
GND        →  GND
DATA       →  D4 (GPIO4)
```

---

## Project Structure

```
kentozaki-weather-app/
├── index.html       # Main page structure
├── style.css        # All styling
├── function.js      # Firebase connection + chart logic
└── README.md        # This file
```

---

## How It Works

1. The **ESP32** reads temperature and humidity from the **DHT11** sensor every 5 seconds
2. It connects to **WiFi** and pushes the values to **Firebase Realtime Database** under `weather/temperature` and `weather/humidity`
3. The **website** listens to Firebase in real-time using the Firebase JavaScript SDK
4. When new data arrives, the **cards and charts update automatically**

```
ESP32 + DHT11  →  Firebase RTDB  →  Website Dashboard
```

---

## Firebase Database Rules

Make sure your Firebase Realtime Database rules allow public reading:

```json
{
  "rules": {
    ".read": true,
    ".write": false
  }
}
```

---

## Running Locally

Just open `index.html` in your browser. No server or build tools needed since Firebase is connected via CDN.

---

## Deployment

This project is hosted on **GitHub Pages**.

1. Push all files to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your site will be live at `https://your-username.github.io/your-repo-name/`

---

## ESP32 Arduino Code

**Libraries used:**
- `WiFi.h`
- `Firebase_ESP_Client.h`
- `DHT.h` (DHT kxn)
- `Adafruit Unified Sensor`

**Board settings in Arduino IDE:**
- Board: ESP32 Dev Module
- Upload Speed: 115200
- Flash Mode: DIO
- Flash Frequency: 40MHz

---

## Author

**Kentozaki** — Weather monitoring project using ESP32 and Firebase