// ── State ────────────────────────────────────────────────────────
let isCelsius = true;
let lastWeatherData = null;
let lastForecastData = null;

// ── DOM References ───────────────────────────────────────────────
const cityInput     = document.getElementById("cityInput");
const searchBtn     = document.getElementById("searchBtn");
const locationBtn   = document.getElementById("locationBtn");
const unitBtn       = document.getElementById("unitBtn");
const loader        = document.getElementById("loader");
const errorDiv      = document.getElementById("error");
const errorMsg      = document.getElementById("errorMsg");
const weatherCard   = document.getElementById("weatherCard");
const forecastSec   = document.getElementById("forecastSection");
const forecastGrid  = document.getElementById("forecastGrid");

const cityName      = document.getElementById("cityName");
const countryDate   = document.getElementById("countryDate");
const weatherIcon   = document.getElementById("weatherIcon");
const conditionText = document.getElementById("conditionText");
const tempMain      = document.getElementById("tempMain");
const tempUnit      = document.getElementById("tempUnit");
const feelsLike     = document.getElementById("feelsLike");
const humidity      = document.getElementById("humidity");
const wind          = document.getElementById("wind");
const visibility    = document.getElementById("visibility");
const pressure      = document.getElementById("pressure");
const sunrise       = document.getElementById("sunrise");
const sunset        = document.getElementById("sunset");

// ── Helpers ──────────────────────────────────────────────────────
const toC  = (k) => (k - 273.15).toFixed(0);
const toF  = (k) => ((k - 273.15) * 9 / 5 + 32).toFixed(0);
const conv = (k) => isCelsius ? toC(k) : toF(k);

function formatTime(unix, offset) {
  const d = new Date((unix + offset) * 1000);
  let h = d.getUTCHours(), m = d.getUTCMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getDay(unix, offset) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date((unix + offset) * 1000).getUTCDay()];
}

function formatDate(offset) {
  const now = new Date(Date.now() + offset * 1000);
  return now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC"
  });
}

function showLoader() {
  loader.classList.remove("hidden");
  errorDiv.classList.add("hidden");
  weatherCard.classList.add("hidden");
  forecastSec.classList.add("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function showError(msg) {
  hideLoader();
  errorMsg.textContent = msg;
  errorDiv.classList.remove("hidden");
  weatherCard.classList.add("hidden");
  forecastSec.classList.add("hidden");
}

// ── API Fetch (goes through /api/weather serverless proxy) ────────
async function apiFetch(type, params) {
  const qs = new URLSearchParams({ type, ...params }).toString();
  const res = await fetch(`/api/weather?${qs}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

// ── Render Current Weather ────────────────────────────────────────
function renderWeather(data) {
  const tz = data.timezone;
  cityName.textContent      = data.name;
  countryDate.textContent   = `${data.sys.country} · ${formatDate(tz)}`;
  weatherIcon.src           = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  weatherIcon.alt           = data.weather[0].description;
  conditionText.textContent = data.weather[0].description;
  tempMain.textContent      = conv(data.main.temp);
  tempUnit.textContent      = isCelsius ? "°C" : "°F";
  feelsLike.textContent     = `Feels like ${conv(data.main.feels_like)}${isCelsius ? "°C" : "°F"}`;
  humidity.textContent      = `${data.main.humidity}%`;
  wind.textContent          = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  visibility.textContent    = `${(data.visibility / 1000).toFixed(1)} km`;
  pressure.textContent      = `${data.main.pressure} hPa`;
  sunrise.textContent       = formatTime(data.sys.sunrise, tz);
  sunset.textContent        = formatTime(data.sys.sunset, tz);
  weatherCard.classList.remove("hidden");
}

// ── Render 5-Day Forecast ─────────────────────────────────────────
function renderForecast(data, tz) {
  const today = new Date(Date.now() + tz * 1000).getUTCDay();
  const daily = {};

  data.list.forEach(item => {
    const key = new Date((item.dt + tz) * 1000).getUTCDay();
    if (!daily[key]) daily[key] = [];
    daily[key].push(item);
  });

  const days = Object.keys(daily)
    .map(Number)
    .sort((a, b) => ((a - today + 7) % 7) - ((b - today + 7) % 7))
    .slice(0, 5);

  forecastGrid.innerHTML = "";

  days.forEach(dayKey => {
    const items = daily[dayKey];
    const mid   = items[Math.floor(items.length / 2)];
    const high  = Math.max(...items.map(i => i.main.temp_max));
    const low   = Math.min(...items.map(i => i.main.temp_min));
    const label = dayKey === today ? "Today" : getDay(mid.dt, tz);

    const el = document.createElement("div");
    el.className = "forecast-item";
    el.innerHTML = `
      <span class="forecast-day">${label}</span>
      <img class="forecast-icon"
           src="https://openweathermap.org/img/wn/${mid.weather[0].icon}.png"
           alt="${mid.weather[0].description}" />
      <span class="forecast-high">${conv(high)}°</span>
      <span class="forecast-low">${conv(low)}°</span>
    `;
    forecastGrid.appendChild(el);
  });

  forecastSec.classList.remove("hidden");
}

// ── Fetch by City ─────────────────────────────────────────────────
async function fetchByCity(city) {
  if (!city.trim()) return;
  showLoader();
  try {
    const [w, f] = await Promise.all([
      apiFetch("weather",  { q: city }),
      apiFetch("forecast", { q: city }),
    ]);
    lastWeatherData  = w;
    lastForecastData = f;
    hideLoader();
    renderWeather(w);
    renderForecast(f, w.timezone);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  }
}

// ── Fetch by Coords ───────────────────────────────────────────────
async function fetchByCoords(lat, lon) {
  showLoader();
  try {
    const [w, f] = await Promise.all([
      apiFetch("weather",  { lat, lon }),
      apiFetch("forecast", { lat, lon }),
    ]);
    lastWeatherData  = w;
    lastForecastData = f;
    hideLoader();
    renderWeather(w);
    renderForecast(f, w.timezone);
  } catch (err) {
    showError(err.message || "Something went wrong. Please try again.");
  }
}

// ── Unit Toggle ──────────────────────────────────────────────────
unitBtn.addEventListener("click", () => {
  isCelsius = !isCelsius;
  if (lastWeatherData) {
    renderWeather(lastWeatherData);
    renderForecast(lastForecastData, lastWeatherData.timezone);
  }
});

// ── Search ───────────────────────────────────────────────────────
searchBtn.addEventListener("click", () => fetchByCity(cityInput.value));
cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") fetchByCity(cityInput.value);
});

// ── Geolocation ──────────────────────────────────────────────────
locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => showError("Location access denied. Please search manually.")
  );
});
