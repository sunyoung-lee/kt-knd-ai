/*
  습관 트래커 — 학습용 프로토타입 (동작/로직)
  ────────────────────────────────────────────────
  이 파일은 "기능"을 담당합니다. 아래 순서로 읽으면 이해하기 쉽습니다.
    1. 데이터 모양 정하기 (어떤 정보를 저장할까?)
    2. 저장/불러오기 (localStorage)
    3. 날짜·스트릭 계산 (작은 도우미 함수들)
    4. 화면 그리기 (render)
    5. 버튼·클릭 연결하기 (이벤트)

  ★ 핵심 개념
    - 상태(state)는 habits 라는 배열 하나에 모읍니다.
    - "상태가 바뀌면 → 저장하고 → 다시 그린다" 흐름을 반복합니다. (save() 후 render())
*/

/* ── 1. 데이터 모양 ─────────────────────────────
   습관 하나 = { id, name, emoji, done }
   done 은 "체크한 날짜"를 모아둔 객체: { "2026-06-25": true, ... }
*/
const STORAGE_KEY = "habit_prototype_v1";          // localStorage에 저장할 때 쓰는 이름표
const EMOJIS = ["✅", "💧", "🏃", "📖", "🧘", "💪", "🥗", "😴", "✍️", "🦷"];
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

/* ── 2. 저장 / 불러오기 ─────────────────────────
   localStorage 는 브라우저에 "문자열"만 저장할 수 있어서
   저장할 땐 JSON.stringify(객체→문자열), 읽을 땐 JSON.parse(문자열→객체) 를 씁니다.
*/
function loadHabits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return []; // 저장된 게 없거나 깨졌으면 빈 목록으로 시작
  }
}
function saveHabits() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

/* 상태(state): 앱이 기억하는 모든 데이터 */
let habits = loadHabits();
let selectedEmoji = EMOJIS[0]; // 모달에서 고른 이모지

/* ── 3. 작은 도우미 함수들 ──────────────────────── */

// 날짜를 "2026-06-25" 형태 문자열로 바꿔 줍니다 (체크 기록의 열쇠로 사용)
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 오늘을 포함한 최근 7일의 Date 객체 배열을 만듭니다 (왼→오 = 6일 전→오늘)
function recentSevenDays() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

// 연속 달성(스트릭): 오늘(또는 어제)부터 거꾸로 며칠 연속 체크했는지 셉니다
function streakOf(habit) {
  let count = 0;
  const d = new Date();
  // 오늘 아직 체크 전이면 어제부터 셉니다(오늘은 끝나지 않았으니 끊김으로 보지 않음)
  if (!habit.done[toKey(d)]) d.setDate(d.getDate() - 1);
  while (habit.done[toKey(d)]) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

// 사용자가 입력한 글자를 화면에 안전하게 넣기 위한 처리(<, > 등 무력화)
function escapeHTML(text) {
  return (text || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── 화면 요소들을 미리 찾아둡니다 (매번 찾지 않도록) ── */
const listEl = document.getElementById("habit-list");
const weekHeadEl = document.getElementById("week-head");
const sevenDays = recentSevenDays();
const todayKey = toKey(new Date());

/* ── 4. 화면 그리기 ─────────────────────────────
   render() 하나가 "현재 habits 상태"를 보고 화면 전체를 다시 그립니다.
   상태가 바뀔 때마다 render() 만 부르면 화면이 항상 최신이 됩니다.
*/
function render() {
  renderBanner();
  renderWeekHead();
  renderList();
}

// 오늘 요약 배너
function renderBanner() {
  const now = new Date();
  document.getElementById("today-date").textContent =
    `${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAY[now.getDay()]})`;

  const total = habits.length;
  const doneToday = habits.filter(h => h.done[todayKey]).length;
  document.getElementById("today-rate").innerHTML =
    total ? `오늘 <b>${doneToday}/${total}</b> 완료` : "습관을 추가해 보세요";
}

// 요일/날짜 헤더
function renderWeekHead() {
  weekHeadEl.innerHTML = '<div class="spacer">최근 7일</div>';
  sevenDays.forEach(d => {
    const isToday = toKey(d) === todayKey;
    const cell = document.createElement("div");
    cell.className = "wd" + (isToday ? " today" : "");
    cell.innerHTML = `${WEEKDAY[d.getDay()]}<b>${d.getDate()}</b>`;
    weekHeadEl.appendChild(cell);
  });
}

// 습관 목록
function renderList() {
  // 습관이 하나도 없을 때 안내 문구
  if (habits.length === 0) {
    listEl.innerHTML =
      `<div class="empty">아직 습관이 없어요.<br>오른쪽 아래 + 버튼으로 추가해 보세요!</div>`;
    return;
  }

  listEl.innerHTML = ""; // 기존 내용 비우고 새로 그림

  habits.forEach(habit => {
    // 7일치 체크 칸 HTML 만들기
    let cellsHTML = "";
    sevenDays.forEach(d => {
      const key = toKey(d);
      const done = habit.done[key] ? "done" : "";
      const today = key === todayKey ? "today" : "";
      cellsHTML += `<button class="cell ${done} ${today}" data-key="${key}">✓</button>`;
    });

    const streak = streakOf(habit);
    const streakText = streak > 0 ? `🔥 ${streak}일 연속` : "오늘 시작해 보세요";

    // 카드 한 장 만들기
    const card = document.createElement("div");
    card.className = "habit";
    card.innerHTML = `
      <div class="habit-row">
        <div class="habit-name" data-act="edit">
          <span>${habit.emoji}</span>
          <span class="txt">${escapeHTML(habit.name)}</span>
        </div>
        ${cellsHTML}
      </div>
      <div class="habit-meta">
        <span class="streak">${streakText}</span>
        <span>
          <button data-act="edit">수정</button>
          <button class="del" data-act="del">삭제</button>
        </span>
      </div>
    `;

    // 이 카드 안의 체크 칸들에 클릭 동작 연결
    card.querySelectorAll(".cell").forEach(btn => {
      btn.addEventListener("click", () => toggleCheck(habit, btn.dataset.key));
    });
    // 수정/삭제 버튼 연결 (data-act 값으로 구분)
    card.querySelectorAll('[data-act="edit"]').forEach(el => {
      el.addEventListener("click", () => openModal(habit.id));
    });
    card.querySelector('[data-act="del"]').addEventListener("click", () => removeHabit(habit));

    listEl.appendChild(card);
  });
}

/* ── 상태를 바꾸는 동작들 (바꾼 뒤엔 항상 save() → render()) ── */

// 날짜 칸 켜기/끄기
function toggleCheck(habit, key) {
  if (habit.done[key]) {
    delete habit.done[key];   // 이미 체크 → 해제
  } else {
    habit.done[key] = true;   // 미체크 → 완료
  }
  saveHabits();
  render();
}

// 습관 삭제 (confirm 으로 한 번 확인)
function removeHabit(habit) {
  if (confirm(`"${habit.name}" 습관을 삭제할까요?`)) {
    habits = habits.filter(h => h.id !== habit.id);
    saveHabits();
    render();
  }
}

/* ── 5. 모달(추가/수정 입력창) ──────────────────── */
const modal = document.getElementById("modal");
const nameInput = document.getElementById("habit-name");
const editIdInput = document.getElementById("edit-id");
const emojiPickEl = document.getElementById("emoji-pick");

// 이모지 선택 버튼들을 만들어 넣기 (한 번만 실행)
EMOJIS.forEach(emoji => {
  const btn = document.createElement("button");
  btn.textContent = emoji;
  btn.dataset.emoji = emoji;
  btn.addEventListener("click", () => selectEmoji(emoji));
  emojiPickEl.appendChild(btn);
});
function selectEmoji(emoji) {
  selectedEmoji = emoji;
  // 선택된 버튼에만 .on 표시
  emojiPickEl.querySelectorAll("button").forEach(b => {
    b.classList.toggle("on", b.dataset.emoji === emoji);
  });
}

// 모달 열기 : id 가 있으면 "수정", 없으면 "추가"
function openModal(id) {
  if (id) {
    const habit = habits.find(h => h.id === id);
    document.getElementById("modal-title").textContent = "습관 수정";
    editIdInput.value = id;
    nameInput.value = habit.name;
    selectEmoji(habit.emoji);
  } else {
    document.getElementById("modal-title").textContent = "습관 추가";
    editIdInput.value = "";
    nameInput.value = "";
    selectEmoji(EMOJIS[0]);
  }
  modal.classList.add("show");
  nameInput.focus();
}
function closeModal() {
  modal.classList.remove("show");
}

// 저장 버튼 : 추가 또는 수정
function handleSave() {
  const name = nameInput.value.trim();
  if (!name) {                     // 이름이 비면 저장하지 않음
    nameInput.focus();
    return;
  }
  const id = editIdInput.value;
  if (id) {
    // 수정: 기존 습관을 찾아 값만 바꿈
    const habit = habits.find(h => h.id === id);
    habit.name = name;
    habit.emoji = selectedEmoji;
  } else {
    // 추가: 새 습관을 목록에 넣음. id 는 시간값으로 간단히 고유하게 만듦
    habits.push({
      id: String(Date.now()),
      name: name,
      emoji: selectedEmoji,
      done: {},
    });
  }
  saveHabits();
  closeModal();
  render();
}

/* ── 버튼들에 동작 연결 ── */
document.getElementById("add-btn").addEventListener("click", () => openModal());
document.getElementById("save-btn").addEventListener("click", handleSave);
document.getElementById("cancel-btn").addEventListener("click", closeModal);
// 모달 바깥(어두운 배경)을 누르면 닫기
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

/* ── 앱 시작: 처음 한 번 화면을 그립니다 ── */
render();
