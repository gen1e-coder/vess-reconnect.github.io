const PROGRAMS_URL = "data/programs.seoul.json";

const calendarEl = document.getElementById("calendar");
const calTitleEl = document.getElementById("calTitle");
const dayListEl = document.getElementById("dayList");

const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");

const orgFilterEl = document.getElementById("orgFilter");
const districtFilterEl = document.getElementById("districtFilter");

let filters = {
  org: "",
  district: ""
};

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
    const t = p.time ? `<span class="pill">${p.time}</span>` : "";
    const org = p.org ? `<span class="pill">${p.org}</span>` : "";
    const district = p.district ? `<span class="pill">${p.district}</span>` : "";
    const address = p.address ? `<div class="day-meta">📍 ${p.address}</div>` : "";
    let info = "";
    if (Array.isArray(p.info)) {
      info = `
        <ul class="day-info-list">
          ${p.info.map(line => `<li>${line}</li>`).join("")}
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
      </div>
    `;
  })
  .join("");


  dayListEl.innerHTML = html;
}

function renderCalendar() {
  const filtered = getFilteredPrograms();
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
  return programs.filter((p) => {
    const okOrg = !filters.org || p.org === filters.org;
    const okDistrict = !filters.district || p.district === filters.district;
    return okOrg && okDistrict;
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

loadPrograms();
