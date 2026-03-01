# Kentozaki Weather App

A real-time weather monitoring web dashboard that reads live temperature and humidity data from a physical ESP32 microcontroller with a DHT11 sensor, stores it in Firebase cloud database, and displays it on a clean website hosted on GitHub Pages.

---

## What This Project Does

This project has two main parts working together:

**Part 1 — The Hardware (ESP32 + DHT11)**
A small microcontroller (ESP32) is connected to a temperature and humidity sensor (DHT11). Every 5 seconds it reads the current temperature and humidity, connects to WiFi, and sends the data up to a cloud database (Firebase).

**Part 2 — The Website (Dashboard)**
A webpage reads that data from Firebase in real-time and displays it visually — with live numbers, graphs, alerts, and more. No page refresh needed; it updates automatically every 5 seconds.

The flow looks like this:
```
DHT11 Sensor → ESP32 → WiFi → Firebase Database → Website Dashboard
```

---

## Features

### 🌡️ Live Temperature & Humidity Display
Shows the current temperature in °C and humidity in % as large, easy-to-read numbers. Below each value it shows a comfort label (e.g. Hot, Warm, Comfortable, Cool / Humid, Dry) and the exact time of the last update.

### 🌞 Heat Index (Feels Like)
Calculates and displays how hot it actually *feels* based on both temperature and humidity combined. This uses the **Rothfusz Heat Index Equation** — the same scientific formula used by official weather services. For example, 32°C with 80% humidity can feel like 38°C on your skin.

> Heat index is only calculated when temperature is above 27°C, which is when humidity starts significantly affecting how hot it feels.

### 📉 Min / Max Values
Tracks and displays the lowest and highest temperature and humidity recorded since the page was opened. Minimum values are shown in blue, maximum values in red.

### ⚠️ Threshold Alerts
Automatically shows a warning banner at the top of the page when conditions become concerning:
- **💧 High Humidity** — triggers when humidity exceeds 85%
- **⚠️ High Temperature Warning** — triggers when temperature reaches 35°C or heat index reaches 40°C
- **🚨 Extreme Heat Danger** — triggers when temperature reaches 38°C or above

The banner disappears automatically when conditions return to normal.

### 📈 Live Graph
A line chart showing the last 20 sensor readings. This is a rolling window — as new data comes in, the oldest point drops off the left side. Useful for seeing what is happening right now.

### 📊 History Graph
A line chart showing up to 100 past readings. The data is saved in the browser's local storage so it persists even if you refresh the page. Useful for spotting trends over a longer period.

### 🔀 Chart Toggle
Both charts have a **Both / Temp / Humidity** toggle button. You can isolate just the temperature line or just the humidity line to get a clearer view of each one individually.

### 📥 Export to CSV
A button on the History chart lets you download all stored readings as a `.csv` file. The file is named automatically with the current date (e.g. `kentozaki_weather_2025-03-01.csv`) and can be opened in Microsoft Excel or Google Sheets for further analysis.

---

## Tech Stack

| Component | Technology Used |
|---|---|
| Microcontroller | ESP32 (CP2101) |
| Sensor | DHT11 (Temperature & Humidity) |
| Cloud Database | Firebase Realtime Database |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| Hosting | GitHub Pages |
| Firebase SDK | Firebase JavaScript SDK v10 |

---

## Hardware Setup

**DHT11 wiring to ESP32:**

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
├── index.html       # Page structure and layout
├── style.css        # All visual styling
├── function.js      # Firebase connection, charts, and logic
└── README.md        # This file
```

---

## How The Code Works

### ESP32 Side (Arduino)
The ESP32 runs a loop that every 5 seconds:
1. Reads temperature and humidity from the DHT11 sensor
2. Validates the reading (skips if sensor returns an error)
3. Connects to Firebase using the API key
4. Writes the values to `weather/temperature` and `weather/humidity` in the database

### Website Side (JavaScript)
The website uses Firebase's `onValue()` listener which works like a subscription — the moment new data appears in the database, Firebase automatically pushes it to the browser without any manual refreshing.

When new data arrives:
1. The temperature and humidity cards update
2. The heat index is recalculated using the Rothfusz equation
3. Min/max records are updated if the new value breaks a record
4. Alerts are checked and shown or hidden accordingly
5. The live chart adds the new point and removes the oldest one
6. The history chart and localStorage are updated

### Heat Index Formula
The heat index is calculated using this scientific equation:

```
HI = -8.78 + 1.61T + 2.34RH - 0.15(T×RH) - 0.01(T²)
     - 0.02(RH²) + 0.002(T²×RH) + 0.001(T×RH²) - 0.000004(T²×RH²)
```
Where **T** = Temperature in °C and **RH** = Relative Humidity in %

---

## Firebase Database Rules

The Firebase Realtime Database rules are set so that:
- **Anyone can read** the data (so the website can display it publicly)
- **Only the ESP32 can write** using the API key (so no one can tamper with the data)

```json
{
  "rules": {
    ".read": true,
    ".write": false
  }
}
```

---

## Arduino IDE Settings

| Setting | Value |
|---|---|
| Board | ESP32 Dev Module |
| Upload Speed | 115200 |
| Flash Mode | DIO |
| Flash Frequency | 40MHz |

**Libraries required:**
- `WiFi.h`
- `Firebase_ESP_Client.h`
- `DHT.h` (DHT kxn v3.4.4)
- `Adafruit Unified Sensor`

---

## Deployment

The website is hosted for free on **GitHub Pages**:

1. All files are pushed to a public GitHub repository
2. GitHub Pages is enabled under **Settings → Pages → main branch**
3. The site is automatically live at `https://k3nt0z4k1.github.io/IT37B_Midterm_Weather_App/`

No servers, no hosting fees, no backend required.

---

## Author

**Kentozaki** — Weather monitoring project using ESP32, DHT11, Firebase, and GitHub Pages.