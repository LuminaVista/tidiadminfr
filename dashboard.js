let allUsers = [];
let filteredUsers = [];

async function fetchUsers() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const res = await fetch("/api/admin/getUsers", {
    headers: { Authorization: token },
  });
  if (!res.ok) {
    document.getElementById("msg").innerText = "Failed to load users.";
    return;
  }

  allUsers = await res.json();

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("singleDate").value = today;
  document.getElementById("signUpDayPicker").value = today;

  drawChart(allUsers, "month");

  const todayUsers = filterBySingleDate(allUsers, today);
  renderTable(todayUsers);

  updateSignUpDayCount(today);
}

fetchUsers();

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function filterByDays(users, days) {
  const now = new Date();
  return users.filter((u) => {
    if (!u.created_at) return false;
    const regDate = new Date(u.created_at);
    return (now - regDate) / (1000 * 60 * 60 * 24) <= days;
  });
}

function filterByMonth(users) {
  const now = new Date();
  const prevMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  );
  return users.filter((u) => {
    if (!u.created_at) return false;
    const regDate = new Date(u.created_at);
    return regDate >= prevMonth && regDate <= now;
  });
}

function filterByYear(users) {
  const now = new Date();
  const prevYear = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  return users.filter((u) => {
    if (!u.created_at) return false;
    const regDate = new Date(u.created_at);
    return regDate >= prevYear && regDate <= now;
  });
}

function filterBySingleDate(users, date) {
  if (!date) return users;
  return users.filter(
    (u) => u.created_at && u.created_at.split("T")[0] === date
  );
}

function renderTable(users) {
  const table = document.querySelector(".user-table-body");
  table.innerHTML = "";
  users.forEach((user) => {
    const date = user.created_at
      ? formatDateDisplay(user.created_at.split("T")[0])
      : "";
    table.innerHTML += `<tr>
      <td>${user.username || ""}</td>
      <td>${user.email || ""}</td>
      <td>${date}</td>
    </tr>`;
  });
}
function formatDateShort(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function drawChart(users, period) {
  let filtered = [];
  let label = "";
  const today = new Date();
  let start;

  // ---- Define date ranges ----
  if (period === "year") {
    filtered = filterByYear(users);
    label = "Last 1 Year";
    start = new Date(today);
    start.setFullYear(today.getFullYear() - 1);
  } else if (period === "month") {
    filtered = filterByMonth(users);
    label = "Last 1 Month";
    start = new Date(today);
    start.setDate(today.getDate() - 29); 
  } else if (period === 14) {
    filtered = filterByDays(users, 14);
    label = "Last 14 Days";
    start = new Date(today);
    start.setDate(today.getDate() - 13);
  } else if (period === 7) {
    filtered = filterByDays(users, 7);
    label = "Last 7 Days";
    start = new Date(today);
    start.setDate(today.getDate() - 6);
  } else {
    filtered = users;
    label = "All Time";
  }

  filteredUsers = filtered;
  renderTable(filteredUsers);

  const countsByDate = {};
  filtered.forEach((u) => {
    if (!u.created_at) return;
    const date = u.created_at.split("T")[0];
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });

  let labels = [];
  let dataPoints = [];

  if (period === 7 || period === 14 || period === "month") {
    const allDates = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split("T")[0]);
    }
    labels = allDates.map((d) => formatDateShort(d));
    dataPoints = allDates.map((d) => countsByDate[d] || 0);
  }

  else if (period === "year") {
    const months = Array(12).fill(0);
    const monthLabels = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    filtered.forEach((u) => {
      const m = new Date(u.created_at).getMonth();
      months[m]++;
    });
    labels = monthLabels;
    dataPoints = months;
  }

  const ctx = document.getElementById("userChart").getContext("2d");
  if (window.userChartInstance) window.userChartInstance.destroy();

  window.userChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Registrations (${label})`,
          data: dataPoints,
          borderColor: "#0d6efd",
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#0d6efd",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: {
        x: {
          title: { display: true, text: "Date" },
          ticks: {
            maxTicksLimit: period === "month" ? 15 : undefined,
          },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Registrations" },
          ticks: { stepSize: 1 },
          suggestedMax: Math.max(...dataPoints) + 1,
        },
      },
    },
  });
}


function applyChartFilter(period) {
  document.getElementById("singleDate").value = "";
  drawChart(allUsers, period);
}

document.getElementById("singleDate").addEventListener("change", function () {
  const selectedDate = this.value;
  if (selectedDate) {
    const usersOnDate = filterBySingleDate(allUsers, selectedDate);
    filteredUsers = usersOnDate;
    renderTable(filteredUsers);
    //drawChart(filteredUsers, null);
  } else {
    filteredUsers = allUsers;
    filterAndRender("init", "month");
  }
});


document.getElementById("resetSingleDateBtn").onclick = function () {
  document.getElementById("singleDate").value = "";
  filterAndRender("init", "month");
};

function filterAndRender(type, period) {
  drawChart(allUsers, period);
}

document.getElementById("logoutBtnTop").onclick = logout;
function logout() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  fetch("/api/admin/logout", {
    method: "POST",
    headers: { Authorization: token },
  }).then(() => {
    localStorage.removeItem("token");
    window.location.href = "register.html";
  });
}

document.getElementById("downloadBtn").onclick = function () {
  const users =
    filteredUsers && filteredUsers.length ? filteredUsers : allUsers;
  if (!users.length) return;
  let csv = "Name,Email,Registration Date\n";
  users.forEach((u) => {
    const name = (u.username || "").replace(/"/g, '""');
    const mail = (u.email || "").replace(/"/g, '""');
    const date = u.created_at ? "'" + u.created_at.split("T")[0] : "";
    csv += `"${name}","${mail}","${date}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.csv";
  a.click();
  URL.revokeObjectURL(url);
};

function updateSignUpDayCount(selectedDate) {
  if (!selectedDate || !allUsers.length) {
    document.getElementById("signUpDayCount").innerHTML = "";
    return;
  }

  const count = allUsers.filter(
    (u) => u.created_at && u.created_at.split("T")[0] === selectedDate
  ).length;

  document.getElementById("signUpDayCount").innerHTML = `
    <span class="count">${count}</span>
    <span class="label">new user${count !== 1 ? "s" : ""}</span>
  `;
}


document
  .getElementById("signUpDayPicker")
  .addEventListener("change", function () {
    const selectedDate = this.value;
    updateSignUpDayCount(selectedDate);
  });
