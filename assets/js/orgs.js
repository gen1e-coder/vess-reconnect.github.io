const DATA_URL = "data/orgs.seoul.json";

const searchInput = document.getElementById("search");
const tableBody = document.querySelector("#orgTable tbody");
const statusEl = document.getElementById("status");

let orgs = [];

// 표 한 줄(tr) 만들기
function createRow(item) {
  const tr = document.createElement("tr");

  // 구분 (아이콘으로 표시)
  const typeTd = document.createElement("td");

  const icon = document.createElement("img");

  // type 값에 따라 아이콘 결정
  if (item.type === "기관") {
    icon.src = "assets/images/building.webp";
    icon.alt = "기관";
    icon.title = "기관";
  } else if (item.type === "링크") {
    icon.src = "assets/images/link.webp";
    icon.alt = "링크";
    icon.title = "링크";
  } else {
    icon.alt = item.type || "";
  }

  icon.className = "type-icon";
  typeTd.appendChild(icon);

  // 이름 (홈페이지 링크 있으면 클릭 가능)
  const nameTd = document.createElement("td");
  nameTd.textContent = item.name || "";

  // 자치구
  const districtTd = document.createElement("td");
  districtTd.textContent = item.district || "";

  // 특징(태그)
  const tagsTd = document.createElement("td");
  tagsTd.textContent = Array.isArray(item.tags)
    ? item.tags.join(" / ")
    : "";

  // 연락처
  // 연락처
    const phoneTd = document.createElement("td");
    if (item.phone) {
    const tel = document.createElement("a");
    tel.href = `tel:${item.phone}`;
    tel.textContent = item.phone;
    phoneTd.appendChild(tel);
    } else {
    phoneTd.textContent = "-";
    }

  // 홈페이지
  const websiteTd = document.createElement("td");
  if (item.website) {
    const link = document.createElement("a");
    link.href = item.website;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "바로가기";
    websiteTd.appendChild(link);
  } else {
    websiteTd.textContent = "-";
  }

  tr.appendChild(typeTd);
  tr.appendChild(nameTd);
  tr.appendChild(districtTd);
  tr.appendChild(tagsTd);
  tr.appendChild(phoneTd);
  tr.appendChild(websiteTd);

  return tr;
}


// 표 전체 렌더링
function renderTable(list) {
  tableBody.innerHTML = "";
  list.forEach((item) => tableBody.appendChild(createRow(item)));
  statusEl.textContent = `총 ${list.length}개 표시 중`;
}

// 검색 필터
function applyFilter() {
  const q = (searchInput.value || "").trim().toLowerCase();
  if (!q) return renderTable(orgs);

  const filtered = orgs.filter((item) => {
    const text = [
      item.type,
      item.name,
      item.district,
      ...(Array.isArray(item.tags) ? item.tags : []),
      item.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(q);
  });

  renderTable(filtered);
}

// JSON 불러오기
async function loadData() {
  try {
    statusEl.textContent = "데이터 불러오는 중...";
    const res = await fetch(DATA_URL);

    if (!res.ok) {
      throw new Error(`불러오기 실패: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("JSON 형식 오류: 배열([])이어야 합니다.");
    }

    orgs = data;
    renderTable(orgs);
  } catch (err) {
    console.error(err);
    statusEl.textContent =
      "데이터를 불러오지 못했어요. Live Server로 열었는지, JSON 파일 경로가 맞는지 확인해주세요.";
  }
}

searchInput.addEventListener("input", applyFilter);
loadData();


