/**
 * AgriAlert — Smart Farmer Weather Alert
 */
(function () {
    "use strict";

    const WMO_EMOJI = {
        0: "☀️",
        1: "🌤️",
        2: "⛅",
        3: "☁️",
        45: "🌫️",
        48: "🌫️",
        51: "🌦️",
        53: "🌦️",
        55: "🌧️",
        56: "🌨️",
        57: "🌨️",
        61: "🌧️",
        63: "🌧️",
        65: "⛈️",
        66: "🌨️",
        67: "🌨️",
        71: "❄️",
        73: "❄️",
        75: "❄️",
        77: "❄️",
        80: "🌦️",
        81: "🌧️",
        82: "⛈️",
        85: "🌨️",
        86: "🌨️",
        95: "⛈️",
        96: "⛈️",
        99: "⛈️",
    };

    function codeToEmoji(code) {
        if (code == null) return "🌤️";
        return WMO_EMOJI[code] || "🌤️";
    }

    function formatDateLong(d) {
        return d.toLocaleDateString("en-GB", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "Africa/Kigali",
        });
    }

    function shortWeekday(isoDateStr) {
        const d = new Date(isoDateStr + "T12:00:00");
        return d.toLocaleDateString("en-GB", {
            weekday: "short",
            timeZone: "Africa/Kigali",
        }).toUpperCase();
    }

    async function geocode(query) {
        const url =
            "https://geocoding-api.open-meteo.com/v1/search?name=" +
            encodeURIComponent(query.trim()) +
            "&count=5&language=en&format=json&country=RW";
        const res = await fetch(url);
        if (!res.ok) throw new Error("We could not look up that place. Try again in a moment.");
        const data = await res.json();
        if (!data.results || !data.results.length) {
            throw new Error(
                "No district matched. Check spelling or try another name in Rwanda."
            );
        }
        const r = data.results[0];
        return {
            lat: r.latitude,
            lon: r.longitude,
            name: r.name,
            admin1: r.admin1,
            country: r.country,
        };
    }

    function placeLabel(place) {
        const parts = [place.name];
        if (place.admin1) parts.push(place.admin1);
        if (place.country) parts.push(place.country);
        return parts.join(", ");
    }

    /** All Rwanda districts (plus “Kigali” for city-level search). Alphabetic. */
    var RWANDA_DISTRICTS = [
        "Bugesera",
        "Burera",
        "Gakenke",
        "Gasabo",
        "Gatsibo",
        "Gicumbi",
        "Gisagara",
        "Huye",
        "Kamonyi",
        "Karongi",
        "Kayonza",
        "Kicukiro",
        "Kigali",
        "Kirehe",
        "Muhanga",
        "Musanze",
        "Ngoma",
        "Ngororero",
        "Nyabihu",
        "Nyagatare",
        "Nyamagabe",
        "Nyamasheke",
        "Nyanza",
        "Nyarugenge",
        "Nyaruguru",
        "Rubavu",
        "Ruhango",
        "Rulindo",
        "Rusizi",
        "Rutsiro",
        "Rwamagana",
    ].sort(function (a, b) {
        return a.localeCompare(b, "en");
    });

    function initDistrictAutocomplete(input, btn, defaultQuery, runSearch) {
        var list = document.getElementById("district-suggestions");
        if (!input || !list) {
            return;
        }

        var activeIndex = -1;

        function getMatches() {
            var q = input.value.trim().toLowerCase();
            if (!q) {
                return RWANDA_DISTRICTS.slice();
            }
            return RWANDA_DISTRICTS.filter(function (d) {
                return d.toLowerCase().indexOf(q) >= 0;
            });
        }

        function updateActiveButtons() {
            var buttons = list.querySelectorAll(".district-suggestion-hit");
            buttons.forEach(function (b, i) {
                if (i === activeIndex) {
                    b.classList.add("is-active");
                } else {
                    b.classList.remove("is-active");
                }
            });
        }

        function renderList() {
            var m = getMatches();
            list.innerHTML = "";
            activeIndex = -1;
            if (!m.length) {
                list.hidden = true;
                input.setAttribute("aria-expanded", "false");
                return;
            }
            m.forEach(function (name) {
                var li = document.createElement("li");
                li.setAttribute("role", "presentation");
                var b = document.createElement("button");
                b.type = "button";
                b.className = "district-suggestion-hit";
                b.setAttribute("role", "option");
                b.textContent = name;
                b.addEventListener("mousedown", function (ev) {
                    ev.preventDefault();
                });
                b.addEventListener("click", function () {
                    pick(name);
                });
                li.appendChild(b);
                list.appendChild(li);
            });
            list.hidden = false;
            input.setAttribute("aria-expanded", "true");
        }

        function hideList() {
            list.hidden = true;
            activeIndex = -1;
            input.setAttribute("aria-expanded", "false");
            list.querySelectorAll(".district-suggestion-hit").forEach(function (b) {
                b.classList.remove("is-active");
            });
        }

        function pick(name) {
            input.value = name;
            hideList();
            runSearch(name);
        }

        function showList() {
            renderList();
        }

        input.addEventListener("focus", showList);
        input.addEventListener("input", showList);

        input.addEventListener("blur", function () {
            setTimeout(hideList, 220);
        });

        document.addEventListener("click", function (ev) {
            var field = input.closest(".search-field");
            if (field && !field.contains(ev.target)) {
                hideList();
            }
        });

        input.addEventListener("keydown", function (ev) {
            if (list.hidden) {
                if (ev.key === "Enter") {
                    ev.preventDefault();
                    runSearch(input.value.trim() || defaultQuery);
                }
                return;
            }

            var buttons = list.querySelectorAll(".district-suggestion-hit");
            var n = buttons.length;

            if (ev.key === "Escape") {
                ev.preventDefault();
                hideList();
                return;
            }
            if (ev.key === "ArrowDown") {
                ev.preventDefault();
                if (n === 0) {
                    return;
                }
                activeIndex = activeIndex < n - 1 ? activeIndex + 1 : 0;
                updateActiveButtons();
                if (buttons[activeIndex]) {
                    buttons[activeIndex].scrollIntoView({ block: "nearest" });
                }
                return;
            }
            if (ev.key === "ArrowUp") {
                ev.preventDefault();
                if (n === 0) {
                    return;
                }
                activeIndex = activeIndex > 0 ? activeIndex - 1 : n - 1;
                updateActiveButtons();
                if (buttons[activeIndex]) {
                    buttons[activeIndex].scrollIntoView({ block: "nearest" });
                }
                return;
            }
            if (ev.key === "Enter") {
                ev.preventDefault();
                if (activeIndex >= 0 && buttons[activeIndex]) {
                    pick(buttons[activeIndex].textContent);
                } else {
                    runSearch(input.value.trim() || defaultQuery);
                }
            }
        });

        if (btn) {
            btn.addEventListener("click", function () {
                hideList();
                runSearch(input.value.trim() || defaultQuery);
            });
        }
    }

    async function fetchWeather(lat, lon) {
        const params = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lon),
            timezone: "Africa/Kigali",
            current:
                "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            forecast_days: "6",
        });
        const url = "https://api.open-meteo.com/v1/forecast?" + params.toString();
        const res = await fetch(url);
        if (!res.ok) throw new Error("Weather information is temporarily unavailable.");
        return res.json();
    }

    var districtMap = null;
    var districtMarker = null;

    function getLeaflet() {
        return typeof window.L !== "undefined" ? window.L : null;
    }

    function initDistrictMap() {
        var L = getLeaflet();
        var el = document.getElementById("district-map");
        if (!L || !el || districtMap) {
            return;
        }
        districtMap = L.map(el, {
            scrollWheelZoom: false,
        });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(districtMap);
        districtMap.setView([-1.94995, 30.05885], 10);
        setTimeout(function () {
            if (districtMap) {
                districtMap.invalidateSize();
            }
        }, 200);
        window.addEventListener("resize", function () {
            if (districtMap) {
                districtMap.invalidateSize();
            }
        });
    }

    function setDistrictMapLocation(lat, lon, label) {
        var L = getLeaflet();
        if (!document.getElementById("district-map")) {
            return;
        }
        if (!L) {
            return;
        }
        initDistrictMap();
        if (!districtMap) {
            return;
        }
        var la = Number(lat);
        var lo = Number(lon);
        if (isNaN(la) || isNaN(lo)) {
            return;
        }
        if (districtMarker) {
            districtMap.removeLayer(districtMarker);
            districtMarker = null;
        }
        districtMarker = L.marker([la, lo]).addTo(districtMap);
        if (label) {
            districtMarker.bindPopup(label);
        }
        districtMap.setView([la, lo], 11);
        setTimeout(function () {
            if (districtMap) {
                districtMap.invalidateSize();
            }
        }, 120);
    }

    function setStatusBarSafe(isRisky) {
        const bar = document.getElementById("status-bar");
        if (!bar) return;
        const p = bar.querySelector("p");
        bar.classList.remove("status-safe", "status-warn");
        if (isRisky) {
            bar.classList.add("status-warn");
            if (p)
                p.innerHTML =
                    '<span class="pulse" aria-hidden="true">●</span> Weather watch — strong storms possible in the outlook';
        } else {
            bar.classList.add("status-safe");
            if (p)
                p.innerHTML =
                    '<span class="pulse" aria-hidden="true">●</span> Service active — Rwanda districts';
        }
    }

    function renderForecast(daily) {
        const grid = document.querySelector(".forecast-grid");
        if (!grid || !daily || !daily.time) return;

        const maxDays = Math.min(5, daily.time.length);
        grid.innerHTML = "";

        for (let i = 0; i < maxDays; i++) {
            const code = daily.weather_code[i];
            const emoji = codeToEmoji(code);
            const maxT = daily.temperature_2m_max[i];
            const label = shortWeekday(daily.time[i]);

            const card = document.createElement("article");
            card.className = "day-card";
            card.setAttribute("aria-label", label + " forecast");

            card.innerHTML =
                '<p class="day-name">' +
                label +
                '</p><div class="forecast-emoji" aria-hidden="true">' +
                emoji +
                '</div><p class="day-temp">' +
                Math.round(maxT) +
                "°C</p>";

            grid.appendChild(card);
        }
    }

    function updateDashboard(data, cityLine, lat, lon) {
        const cur = data.current;
        const daily = data.daily;

        const cityEl = document.getElementById("city-name");
        const dateEl = document.getElementById("current-date");
        const tempEl = document.getElementById("main-temp");
        const emojiEl = document.getElementById("main-weather-emoji");
        const rainEl = document.getElementById("rain-val");
        const highEl = document.getElementById("high-val");
        const humEl = document.getElementById("hum-val");
        const errEl = document.getElementById("weather-error");

        if (errEl) {
            errEl.textContent = "";
            errEl.classList.remove("is-visible");
        }

        if (cityEl) cityEl.textContent = cityLine;
        if (dateEl) dateEl.textContent = formatDateLong(new Date());

        if (cur && tempEl) {
            tempEl.textContent = Math.round(cur.temperature_2m) + "°C";
        }
        if (cur && emojiEl) {
            emojiEl.textContent = codeToEmoji(cur.weather_code);
        }

        const precipProb =
            cur.precipitation_probability != null
                ? Math.round(cur.precipitation_probability)
                : null;
        if (rainEl) {
            rainEl.textContent =
                precipProb != null ? precipProb + "%" : "—";
        }

        if (daily && daily.temperature_2m_max && daily.temperature_2m_max.length) {
            if (highEl) {
                highEl.textContent =
                    Math.round(daily.temperature_2m_max[0]) + "°C";
            }
        } else if (highEl) {
            highEl.textContent = "—";
        }

        if (cur && humEl) {
            humEl.textContent =
                cur.relative_humidity_2m != null
                    ? Math.round(cur.relative_humidity_2m) + "%"
                    : "—";
        }

        renderForecast(daily);

        let risky = false;
        if (daily && daily.weather_code) {
            const codes = daily.weather_code.slice(0, 5);
            risky = codes.some(function (c) {
                return c >= 65 || c === 95 || c === 96 || c === 99;
            });
        }
        setStatusBarSafe(!risky);

        if (
            typeof lat === "number" &&
            typeof lon === "number" &&
            !isNaN(lat) &&
            !isNaN(lon)
        ) {
            setDistrictMapLocation(lat, lon, cityLine);
        }
    }

    async function runWeatherSearch(query) {
        const btn = document.getElementById("get-weather-btn");
        const errEl = document.getElementById("weather-error");

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Searching…";
        }
        if (errEl) {
            errEl.textContent = "";
            errEl.classList.remove("is-visible");
        }

        try {
            const place = await geocode(query);
            const wx = await fetchWeather(place.lat, place.lon);
            updateDashboard(
                wx,
                placeLabel(place),
                Number(place.lat),
                Number(place.lon)
            );
        } catch (e) {
            if (errEl) {
                var m = e && e.message ? String(e.message) : "";
                var friendly =
                    m.indexOf("Failed to fetch") >= 0 ||
                    m.indexOf("NetworkError") >= 0 ||
                    m.indexOf("fetch") >= 0
                        ? "We could not reach the weather service. Check your connection and try again."
                        : m || "We could not load weather. Please try again.";
                errEl.textContent = friendly;
                errEl.classList.add("is-visible");
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "CHECK AREA";
            }
        }
    }

    function initIndex() {
        const input = document.getElementById("loc-input");
        const btn = document.getElementById("get-weather-btn");

        const defaultQuery = "Kigali";
        if (input && !input.value) input.value = defaultQuery;

        runWeatherSearch(input ? input.value : defaultQuery).catch(function () {});

        initDistrictAutocomplete(input, btn, defaultQuery, runWeatherSearch);
    }

    function initNav() {
        const toggle = document.getElementById("nav-toggle");
        const links = document.getElementById("nav-links");
        if (!toggle || !links) return;

        toggle.addEventListener("click", function () {
            const open = links.classList.toggle("is-open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });

        links.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                links.classList.remove("is-open");
                toggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    function formatIsoDate(iso) {
        if (!iso) return "—";
        try {
            const d = new Date(iso);
            return d.toLocaleString("en-GB", { timeZone: "Africa/Kigali" });
        } catch (e) {
            return iso;
        }
    }

    function loadRegistrations() {
        try {
            const raw = localStorage.getItem("agriAlertRegistrations");
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function renderAlertsTable() {
        const root = document.getElementById("alerts-root");
        if (!root) return;

        const rows = loadRegistrations();
        if (!rows.length) {
            root.innerHTML =
                '<p class="empty-state">You have no farm registrations yet. <a href="register.html">Register a farm</a>.</p>';
            return;
        }

        const head =
            "<thead><tr>" +
            "<th>Name</th><th>District</th><th>Crop</th><th>Mode</th><th>Contact</th><th>Registered</th>" +
            "</tr></thead>";
        const body = rows
            .map(function (r) {
                const contact =
                    [r.phone, r.email].filter(Boolean).join(" · ") || "—";
                return (
                    "<tr>" +
                    "<td>" +
                    escapeHtml(r.farmerName || "") +
                    "</td>" +
                    "<td>" +
                    escapeHtml(r.district || "") +
                    "</td>" +
                    "<td>" +
                    escapeHtml(r.crop || "") +
                    "</td>" +
                    "<td>" +
                    escapeHtml(r.alertMode || "") +
                    "</td>" +
                    "<td>" +
                    escapeHtml(contact) +
                    "</td>" +
                    "<td>" +
                    escapeHtml(formatIsoDate(r.registeredAt)) +
                    "</td>" +
                    "</tr>"
                );
            })
            .join("");

        root.innerHTML =
            '<div class="data-table-wrap"><table class="data-table">' +
            head +
            "<tbody>" +
            body +
            "</tbody></table></div>";
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function initAlerts() {
        renderAlertsTable();

        const clearBtn = document.getElementById("clear-registrations");
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                if (
                    window.confirm(
                        "Remove all farm registrations from this list?"
                    )
                ) {
                    localStorage.removeItem("agriAlertRegistrations");
                    renderAlertsTable();
                }
            });
        }
    }

    /** Use the same address as the mailto on the Contact page when you go live. */
    var CONTACT_EMAIL = "contact@agrialert.rw";

    function initContact() {
        const form = document.getElementById("contact-form");
        const msg = document.getElementById("contact-form-message");
        if (!form) return;

        form.addEventListener("submit", function (ev) {
            ev.preventDefault();

            const nameEl = document.getElementById("contact-name");
            const bodyEl = document.getElementById("contact-body");
            const emailEl = document.getElementById("contact-email");
            const subjEl = document.getElementById("contact-subject");

            const name = nameEl && nameEl.value.trim();
            const body = bodyEl && bodyEl.value.trim();
            const email = emailEl && emailEl.value.trim();
            const subject =
                (subjEl && subjEl.value.trim()) || "AgriAlert enquiry";

            if (!name || !body) {
                if (msg) {
                    msg.className = "error";
                    msg.textContent = "Please enter your name and message.";
                }
                return;
            }

            const mailBody =
                "Name: " +
                name +
                "\n" +
                (email ? "Reply to: " + email + "\n\n" : "\n") +
                body;

            const href =
                "mailto:" +
                CONTACT_EMAIL +
                "?subject=" +
                encodeURIComponent(subject) +
                "&body=" +
                encodeURIComponent(mailBody);

            window.location.href = href;

            if (msg) {
                msg.className = "success";
                msg.textContent =
                    "If your email program opens, review the message and send it when you are ready.";
            }
            form.reset();
        });
    }

    function initRegister() {
        const form = document.getElementById("registration-form");
        const msg = document.getElementById("form-message");

        if (!form) return;

        form.addEventListener("submit", function (ev) {
            ev.preventDefault();

            const name = document.getElementById("farmer-name");
            const phone = document.getElementById("farmer-phone");
            const email = document.getElementById("farmer-email");
            const district = document.getElementById("farmer-loc");
            const crop = document.getElementById("crop-type");
            const freq = form.querySelector('input[name="freq"]:checked');

            const nameVal = name && name.value.trim();
            const phoneVal = phone && phone.value.trim();
            const emailVal = email && email.value.trim();

            if (!nameVal) {
                if (msg) {
                    msg.className = "error";
                    msg.textContent = "Please enter your full name.";
                }
                return;
            }

            if (!phoneVal && !emailVal) {
                if (msg) {
                    msg.className = "error";
                    msg.textContent =
                        "Enter at least one contact: phone or email for alerts.";
                }
                return;
            }

            const entry = {
                farmerName: nameVal,
                phone: phoneVal || null,
                email: emailVal || null,
                district: district ? district.value : "",
                crop: crop ? crop.value : "",
                alertMode: freq ? freq.value : "instant",
                registeredAt: new Date().toISOString(),
            };

            let list = [];
            try {
                const raw = localStorage.getItem("agriAlertRegistrations");
                list = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(list)) list = [];
            } catch (e) {
                list = [];
            }
            list.push(entry);
            localStorage.setItem("agriAlertRegistrations", JSON.stringify(list));

            if (msg) {
                msg.className = "success";
                msg.textContent =
                    "Thank you. Your registration is recorded for " +
                    (district ? district.value : "your district") +
                    ".";
            }
            form.reset();
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initNav();

        if (document.body.classList.contains("page-register")) {
            initRegister();
        } else if (document.body.classList.contains("page-home")) {
            initIndex();
        } else if (document.body.classList.contains("page-alerts")) {
            initAlerts();
        } else if (document.body.classList.contains("page-contact")) {
            initContact();
        }
    });
})();
