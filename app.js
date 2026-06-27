// 2026 KND AI 컨퍼런스 - 참가 신청 (정적 데모)
// 신청 내역은 브라우저 localStorage에 저장됩니다.
(function () {
  "use strict";

  var STORAGE_KEY = "knd_ai_registrations";

  var form = document.getElementById("registerForm");
  var successBox = document.getElementById("successBox");
  var successMsg = document.getElementById("successMsg");
  var resetBtn = document.getElementById("resetBtn");
  var tbody = document.getElementById("regTbody");
  var countBadge = document.getElementById("countBadge");
  var exportBtn = document.getElementById("exportBtn");
  var clearBtn = document.getElementById("clearBtn");

  // ----- storage helpers -----
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // ----- validation -----
  var validators = {
    name: function (v) { return v.trim() ? "" : "이름을 입력해주세요."; },
    email: function (v) {
      if (!v.trim()) return "이메일을 입력해주세요.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "올바른 이메일 형식이 아닙니다.";
    },
    phone: function (v) {
      if (!v.trim()) return "연락처를 입력해주세요.";
      return /^[0-9\-+\s()]{8,}$/.test(v) ? "" : "올바른 연락처를 입력해주세요.";
    },
    ticket: function (v) { return v ? "" : "참가 유형을 선택해주세요."; },
    agree: function (v) { return v ? "" : "개인정보 수집에 동의해주세요."; }
  };

  function setError(name, msg) {
    var small = form.querySelector('.error[data-for="' + name + '"]');
    var field = small ? small.closest(".field") : null;
    if (small) small.textContent = msg;
    if (field) field.classList.toggle("invalid", !!msg);
  }

  function validate() {
    var data = getFormData();
    var ok = true;
    Object.keys(validators).forEach(function (key) {
      var val = key === "agree" ? data.agree : data[key];
      var msg = validators[key](key === "agree" ? (val ? "1" : "") : (val || ""));
      setError(key, msg);
      if (msg) ok = false;
    });
    return ok;
  }

  function getFormData() {
    var sessions = Array.prototype.slice
      .call(form.querySelectorAll('input[name="sessions"]:checked'))
      .map(function (el) { return el.value; });
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      organization: form.organization.value.trim(),
      ticket: form.ticket.value,
      sessions: sessions,
      note: form.note.value.trim(),
      agree: form.agree.checked
    };
  }

  // live error clearing
  ["name", "email", "phone", "ticket"].forEach(function (key) {
    form[key].addEventListener("input", function () {
      if (form[key].closest(".field").classList.contains("invalid")) {
        setError(key, validators[key](form[key].value));
      }
    });
  });
  form.agree.addEventListener("change", function () {
    if (form.agree.closest(".field").classList.contains("invalid")) {
      setError("agree", form.agree.checked ? "" : "개인정보 수집에 동의해주세요.");
    }
  });

  // ----- submit -----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      var firstInvalid = form.querySelector(".field.invalid input, .field.invalid select");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    var data = getFormData();
    data.id = Date.now();
    data.createdAt = new Date().toISOString();

    var list = load();
    list.push(data);
    save(list);

    render();
    form.reset();
    form.hidden = true;
    successMsg.textContent =
      data.name + "님, 신청이 접수되었습니다. 확인 메일을 " + data.email + " 으로 발송해 드릴 예정입니다.";
    successBox.hidden = false;
    successBox.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  resetBtn.addEventListener("click", function () {
    successBox.hidden = true;
    form.hidden = false;
    form.name.focus();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // ----- render table -----
  function fmtDate(iso) {
    var d = new Date(iso);
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var list = load();
    countBadge.textContent = list.length;
    if (!list.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">아직 신청 내역이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = list
      .slice()
      .reverse()
      .map(function (r) {
        return (
          "<tr>" +
          "<td>" + escapeHtml(r.name) + "</td>" +
          "<td>" + escapeHtml(r.email) + "</td>" +
          "<td>" + escapeHtml(r.phone) + "</td>" +
          "<td>" + escapeHtml(r.organization || "-") + "</td>" +
          "<td>" + escapeHtml(r.ticket) + "</td>" +
          "<td>" + fmtDate(r.createdAt) + "</td>" +
          '<td><button class="row-del" data-id="' + r.id + '">삭제</button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest(".row-del");
    if (!btn) return;
    var id = Number(btn.getAttribute("data-id"));
    var list = load().filter(function (r) { return r.id !== id; });
    save(list);
    render();
  });

  // ----- export CSV -----
  exportBtn.addEventListener("click", function () {
    var list = load();
    if (!list.length) {
      alert("내보낼 신청 내역이 없습니다.");
      return;
    }
    var headers = ["이름", "이메일", "연락처", "소속", "참가유형", "관심세션", "요청사항", "신청일시"];
    var rows = list.map(function (r) {
      return [r.name, r.email, r.phone, r.organization, r.ticket,
        (r.sessions || []).join(" / "), r.note, fmtDate(r.createdAt)];
    });
    var csv = [headers].concat(rows)
      .map(function (row) {
        return row.map(function (cell) {
          return '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"';
        }).join(",");
      }).join("\r\n");

    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "knd-ai-신청내역.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // ----- clear all -----
  clearBtn.addEventListener("click", function () {
    if (!load().length) return;
    if (confirm("모든 신청 내역을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      save([]);
      render();
    }
  });

  render();
})();
