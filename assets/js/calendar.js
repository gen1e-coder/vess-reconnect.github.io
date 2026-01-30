document.addEventListener("DOMContentLoaded", () => {

const PROGRAMS_URL = "data/programs.seoul.json";

const calendarEl = document.getElementById("calendar");
const calTitleEl = document.getElementById("calTitle");
const dayListEl = document.getElementById("dayList");

const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");

const orgFilterEl = document.getElementById("orgFilter");
const districtFilterEl = document.getElementById("districtFilter");

const favOnlyEl = document.getElementById("favOnly");

const FAVORITES_KEY = "favoritePrograms";

function parseYmd(s) {
  // expects YYYY-MM-DD
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function expandPrograms(list) {
  const out = [];

  for (const p of list) {
    const favId =
      p.id || `${p.org || ""}__${p.title || ""}__${p.startDate || p.date || ""}__${p.endDate || ""}`;

    
    // Case 1: single-day program (already supported)
    if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
      out.push({...p, favId});
      continue;
    }

    // Case 2: range program using startDate/endDate
    if (p.startDate && p.endDate) {
      const start = parseYmd(p.startDate);
      const end = parseYmd(p.endDate);

      // guard: invalid dates or reversed range
      if (isNaN(start) || isNaN(end) || start > end) {
        console.warn("Invalid date range:", p);
        continue;
      }

      // expand each day
      const cur = new Date(start);
      while (cur <= end) {
        out.push({ ...p, date: formatYmd(cur), favId });
        cur.setDate(cur.getDate() + 1);
      }
      continue;
    }

    // weekly recurrence
    if (p.repeat?.type === "weekly") {
          const weekday = Number(p.repeat.weekday); // ✅ allow "5" or 5
          if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;

          // 3A) WITH start/end
          if (p.repeat.start && p.repeat.end) {
            const start = parseYmd(p.repeat.start);
            const end = parseYmd(p.repeat.end);
            if (isNaN(start) || isNaN(end) || start > end) continue;

            const curD = new Date(start);
            while (curD <= end) {
              if (curD.getDay() === weekday) out.push({ ...p, date: formatYmd(curD) });
              curD.setDate(curD.getDate() + 1);
            }
            continue;
          }

          // 3B) WITHOUT start/end → generate ONLY for the currently viewed month
          const year = current.getFullYear();
          const month = current.getMonth();
          const first = new Date(year, month, 1);
          const last = new Date(year, month + 1, 0);

          const curD = new Date(first);
          while (curD <= last) {
            if (curD.getDay() === weekday) out.push({ ...p, date: formatYmd(curD) });
            curD.setDate(curD.getDate() + 1);
          }
          continue;
        }

    // Optional: if you STILL have "date": "YYYY-MM-DD ~ YYYY-MM-DD"
    if (typeof p.date === "string" && p.date.includes("~")) {
      const parts = p.date.split("~").map(x => x.trim());
      if (parts.length === 2) {
        const start = parseYmd(parts[0]);
        const end = parseYmd(parts[1]);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          const cur = new Date(start);
          while (cur <= end) {
            out.push({ ...p, date: formatYmd(cur) });
            cur.setDate(cur.getDate() + 1);
          }
          continue;
        }
      }
    }

    // Otherwise ignore (no usable date)
    console.warn("Program missing valid date:", p);
  }

  return out;
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
}
function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}
function isFavorite(id) {
  return getFavorites().includes(id);
}
function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) favs = favs.filter((x) => x !== id);
  else favs.push(id);
  saveFavorites(favs);
  return favs.includes(id); // ✅ returns new state (true/false)
}


let filters = { org: "", district: "", favOnly: false };


let programs = [];
let current = new Date(); // current month

function ymd(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthTitle(dateObj) {
  const y = dateObj.getFullYear();
  const m = dateObj.getMonth() + 1;
  return `${y}년 ${m}월 프로그램 일정`;
}

function groupProgramsByDate(list) {
  const map = new Map();
  list.forEach((p) => {
    if (!p.date) return;
    if (!map.has(p.date)) map.set(p.date, []);
    map.get(p.date).push(p);
  });
  return map;
}

function renderDayList(dateStr, byDate) {
  const items = byDate.get(dateStr) || [];
  if (items.length === 0) {
    dayListEl.textContent = `${dateStr} 일정이 없습니다.`;
    return;
  }

  const html = items
  .map((p) => {
    const programId = p.favId || `${p.org || ""}__${p.title || ""}`;
    const favActive = isFavorite(programId);
    const favBtn = `
      <button
        class="fav-btn ${favActive ? "active" : ""}"
        data-id="${programId}"
        aria-label="즐겨찾기"
      >
        ${favActive ? "⭐ 즐겨찾기됨" : "☆ 즐겨찾기"}
      </button>
    `;
    const t = p.time ? `<span class="pill">${p.time}</span>` : "";
    const org = p.org ? `<span class="pill">${p.org}</span>` : "";
    const district = p.district ? `<span class="pill">${p.district}</span>` : "";
    const address = p.address
      ? (() => {
          const q = encodeURIComponent(p.address);
          const naverMap = `https://map.naver.com/v5/search/${q}`;

          return `
            <div class="day-meta">
              <span class="addr-text">📍 ${p.address}</span>
              <a
                class="map-btn"
                href="${naverMap}"
                target="_blank"
                rel="noopener"
                aria-label="네이버 지도에서 위치 보기"
              >
                🗺️ 네이버 지도 열기
              </a>
            </div>
          `;
        })()
      : "";

    let info = "";
    if (Array.isArray(p.info)) {
      info = `
        <ul class="day-info-list">
          ${p.info.map(line => {
            // detect URL
            const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
              const url = urlMatch[0];
              const text = line.replace(url, "").trim();
              return `
                <li>
                  ${text}
                  <a href="${url}" target="_blank" rel="noopener">${url}</a>
                </li>
              `;
            }
            return `<li>${line}</li>`;
          }).join("")}
        </ul>
      `;
    }
    
    const title = `<div class="day-title-text">${p.title || "프로그램"}</div>`;

    let link = "";

    if (p.link) {
      // enabled button
      link = `
        <a
          class="day-link-btn"
          href="${p.link}"
          target="_blank"
          rel="noopener"
          aria-label="참여 링크 열기"
        >
          <span class="link-icon">🔗</span>
          <span>참여 링크</span>
        </a>
      `;
    } else {
      // disabled button
      link = `
        <span
          class="day-link-btn disabled"
          aria-disabled="true"
        >
          <span class="link-icon">🔗</span>
          <span>참여 링크 없음</span>
        </span>
      `;
    }

    return `
      <div class="day-item">
        ${t} ${org} ${district}
        <div class="day-title">${title}</div>
        ${address}
        ${info}
        ${link}
        ${favBtn}
      </div>
    `;
  })
  .join("");

  dayListEl.innerHTML = html;
  dayListEl.querySelectorAll(".fav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;

      // toggle storage + get new state
      const active = toggleFavorite(id);

      // ✅ instantly update UI without reloading
      btn.classList.toggle("active", active);
      btn.textContent = active ? "⭐ 즐겨찾기됨" : "☆ 즐겨찾기";
    });
  });
}

function renderCalendar() {
  const filtered = expandPrograms(getFilteredPrograms());
  const byDate = groupProgramsByDate(filtered);

  // month range
  const year = current.getFullYear();
  const month = current.getMonth(); // 0-11
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  calTitleEl.textContent = monthTitle(current);

  // weekday headers + blanks
  const startDay = first.getDay(); // 0 Sun ... 6 Sat
  const totalDays = last.getDate();

  calendarEl.innerHTML = "";

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  weekdays.forEach((w) => {
    const el = document.createElement("div");
    el.className = "cal-weekday";
    el.textContent = w;
    calendarEl.appendChild(el);
  });

  // blanks
  for (let i = 0; i < startDay; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell muted";
    calendarEl.appendChild(blank);
  }

  // days
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = ymd(dateObj);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-cell";
    cell.dataset.date = dateStr;

    const hasEvents = byDate.has(dateStr);
    const count = hasEvents ? byDate.get(dateStr).length : 0;

    cell.innerHTML = `
      <div class="cal-daynum">${d}</div>
      ${hasEvents ? `<div class="cal-dot" aria-label="events">${count}</div>` : ""}
    `;

    // highlight today
    const todayStr = ymd(new Date());
    if (dateStr === todayStr) cell.classList.add("today");

    cell.addEventListener("click", () => {
      // clear selection
      document.querySelectorAll(".cal-cell.selected").forEach((x) => x.classList.remove("selected"));
      cell.classList.add("selected");
      renderDayList(dateStr, byDate);
    });

    calendarEl.appendChild(cell);
  }
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "ko"));
}

function populateSelect(selectEl, items, placeholder = "전체") {
  // keep first option, clear others
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

function getFilteredPrograms() {
  const favSet = new Set(getFavorites());

  return programs.filter((p) => {
    const okOrg = !filters.org || p.org === filters.org;
    const okDistrict = !filters.district || p.district === filters.district;

    // favorites-only filter
    const id = p.favId || `${p.org || ""}__${p.title || ""}`;
    const okFav = !filters.favOnly || favSet.has(id);

    return okOrg && okDistrict && okFav;
  });
}


async function loadPrograms() {
  try {
    const res = await fetch(PROGRAMS_URL);
    if (!res.ok) throw new Error("Failed to load programs JSON");
    const data = await res.json();
    programs = Array.isArray(data) ? data : [];
    // dropdown options (from program data)
    populateSelect(orgFilterEl, uniqueSorted(programs.map(p => p.org)), "전체");
    populateSelect(districtFilterEl, uniqueSorted(programs.map(p => p.district)), "전체");

    // reset filters
    filters.org = "";
    filters.district = "";
    orgFilterEl.value = "";
    districtFilterEl.value = "";

    renderCalendar();
  } catch (e) {
    console.error(e);
    dayListEl.textContent = "일정 데이터를 불러오지 못했어요. Live Server로 열었는지 확인해주세요.";
  }
}

prevBtn.addEventListener("click", () => {
  current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  renderCalendar();
});

nextBtn.addEventListener("click", () => {
  current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  current = new Date();
  renderCalendar();
});

orgFilterEl.addEventListener("change", () => {
  filters.org = orgFilterEl.value;
  renderCalendar();
  dayListEl.textContent = "날짜를 클릭하면 프로그램이 표시됩니다.";
});

districtFilterEl.addEventListener("change", () => {
  filters.district = districtFilterEl.value;
  renderCalendar();
  dayListEl.textContent = "날짜를 클릭하면 프로그램이 표시됩니다.";
});

if (favOnlyEl) {
  favOnlyEl.addEventListener("change", () => {
    filters.favOnly = favOnlyEl.checked;
    renderCalendar();
    dayListEl.textContent = "날짜를 클릭하면 프로그램이 표시됩니다.";
  });
}


loadPrograms();

});
