/* =========================================================
   KEUANGAN POKJA ADIWIYATA
   SCRIPT.JS
   Frontend kompatibel dengan Code.gs
========================================================= */


/* =========================================================
   KONFIGURASI
========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbw_GiGfyyJkR9M5h-ytugZBcZkj_hZKmVsJoGs-askx_X5BZsCVjg0kVua4crtXhDq4/exec";

const CONFIG = {

  timezone: "Asia/Jakarta",

  categories: [
    "Penjualan Sampah Botol",
    "Penjualan Pupuk",
    "Penjualan Barang Kreatif",
    "Sumbangan",
    "Bantuan Lembaga"
  ],

  positions: {
    "Kepala Pokja": 5,
    "Sekretaris Umum": 4,
    "Kabag. Keuangan": 3,
    "Kabag. Peralatan": 2,
    "Kabag. Organik": 2,
    "Petugas Lapangan": 1
  }

};


/* =========================================================
   STATE
========================================================= */

const state = {

  settings: null,

  dashboard: null,

  pemasukan: [],

  pengeluaran: [],

  pegawai: [],

  penggajian: null,

  laporan: null,

  kalender: [],

  riwayat: [],

  currentPage: "dashboard"

};


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const $$ = selector =>
  document.querySelectorAll(selector);


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  setTodayDefaults();

  setupNavigation();

  setupForms();

  setupButtons();

  startClock();

  await initializeApp();

});


async function initializeApp() {

  try {

    if (
      !API_URL ||
      API_URL === "GANTI_DENGAN_URL_WEB_APP_APPS_SCRIPT"
    ) {

      throw new Error(
        "API_URL belum diisi pada script.js."
      );

    }

    await loadSettings();

    await loadDashboard();

    hideLoading();

    setConnectionStatus(true);

  } catch (error) {

    console.error(error);

    hideLoading();

    setConnectionStatus(false);

    showToast(
      error.message ||
      "Gagal menghubungkan ke server.",
      "error"
    );

  }

}


/* =========================================================
   API GET
========================================================= */

async function apiGet(action, params = {}) {

  const url = new URL(API_URL);

  url.searchParams.set(
    "action",
    action
  );

  Object.keys(params).forEach(key => {

    if (
      params[key] !== undefined &&
      params[key] !== null
    ) {

      url.searchParams.set(
        key,
        params[key]
      );

    }

  });

  const response = await fetch(
    url.toString(),
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) {

    throw new Error(
      `HTTP Error ${response.status}`
    );

  }

  const json = await response.json();

  if (!json.success) {

    throw new Error(
      json.error ||
      "Server mengembalikan error."
    );

  }

  return json.data;

}


/* =========================================================
   API POST
   text/plain digunakan agar request dari GitHub Pages
   tidak membutuhkan preflight OPTIONS.
========================================================= */

async function apiPost(action, data = {}) {

  const body = {
    action,
    ...data
  };

  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },

      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {

    throw new Error(
      `HTTP Error ${response.status}`
    );

  }

  const json = await response.json();

  if (!json.success) {

    throw new Error(
      json.error ||
      "Server mengembalikan error."
    );

  }

  return json.data;

}


/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {

  state.settings =
    await apiGet("getSettings");

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

  state.dashboard =
    await apiGet("getDashboard");

  renderDashboard();

}


function renderDashboard() {

  const d = state.dashboard;

  if (!d) return;

  $("dashboardAppName").textContent =
    d.namaAplikasi ||
    "Keuangan Pokja Adiwiyata";

  $("statPemasukan").textContent =
    formatRupiah(d.totalPemasukan);

  $("statPengeluaran").textContent =
    formatRupiah(d.totalPengeluaran);

  $("statKasPokja").textContent =
    formatRupiah(d.totalKasPokja);

  $("statKasGaji").textContent =
    formatRupiah(d.totalKasPenggajian);

  $("saldoKasPokja").textContent =
    formatRupiah(d.saldoKasPokja);

  $("saldoKasPenggajian").textContent =
    formatRupiah(d.saldoKasPenggajian);

  $("expenseBalance").textContent =
    formatRupiah(d.saldoKasPokja);

}


/* =========================================================
   PEMASUKAN
========================================================= */

async function loadPemasukan() {

  state.pemasukan =
    await apiGet("getPemasukan");

  renderPemasukan();

}


function renderPemasukan() {

  const tbody =
    $("incomeTableBody");

  const rows =
    [...state.pemasukan]
      .sort(
        (a, b) =>
          new Date(b.Tanggal) -
          new Date(a.Tanggal)
      );

  $("incomeCount").textContent =
    `${rows.length} data`;

  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Belum ada data pemasukan.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    rows.map(row => {

      return `
        <tr>

          <td>
            ${formatDate(row.Tanggal)}
          </td>

          <td>
            <span class="status status-active">
              ${escapeHtml(row.Kategori)}
            </span>
          </td>

          <td>
            ${escapeHtml(row.Deskripsi || "-")}
          </td>

          <td>
            <strong>
              ${formatRupiah(row.Nominal)}
            </strong>
          </td>

          <td>
            ${formatRupiah(
              row["Alokasi Kas Pokja"]
            )}
          </td>

          <td>
            ${formatRupiah(
              row["Alokasi Kas Penggajian"]
            )}
          </td>

        </tr>
      `;

    }).join("");

}


/* =========================================================
   FORM PEMASUKAN
========================================================= */

async function handleIncomeSubmit(event) {

  event.preventDefault();

  const tanggal =
    $("incomeDate").value;

  const nominal =
    Number(
      $("incomeNominal").value
    );

  const kategori =
    $("incomeCategory").value;

  const deskripsi =
    $("incomeDescription").value.trim();


  if (!tanggal) {

    showToast(
      "Tanggal wajib diisi.",
      "error"
    );

    return;
  }

  if (!nominal || nominal <= 0) {

    showToast(
      "Nominal harus lebih dari 0.",
      "error"
    );

    return;
  }

  if (
    !CONFIG.categories.includes(
      kategori
    )
  ) {

    showToast(
      "Kategori pemasukan tidak valid.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  setButtonLoading(
    button,
    true,
    "Menyimpan..."
  );


  try {

    const result =
      await apiPost(
        "addIncome",
        {
          tanggal,
          nominal,
          kategori,
          deskripsi,
          user: "Web App"
        }
      );


    showToast(
      `Pemasukan berhasil disimpan. ID: ${result.id}`,
      "success"
    );


    event.target.reset();

    setTodayDefaults();

    updateIncomePreview();

    await refreshAllCore();

    await loadPemasukan();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  } finally {

    setButtonLoading(
      button,
      false
    );

  }

}


/* =========================================================
   PREVIEW 30/70
========================================================= */

function updateIncomePreview() {

  const nominal =
    Number(
      $("incomeNominal").value
    ) || 0;

  const pokja =
    nominal * 0.30;

  const gaji =
    nominal - pokja;

  $("previewPokja").textContent =
    formatRupiah(pokja);

  $("previewGaji").textContent =
    formatRupiah(gaji);

}


/* =========================================================
   PENGELUARAN
========================================================= */

async function loadPengeluaran() {

  state.pengeluaran =
    await apiGet("getPengeluaran");

  renderPengeluaran();

}


function renderPengeluaran() {

  const tbody =
    $("expenseTableBody");

  const rows =
    [...state.pengeluaran]
      .sort(
        (a, b) =>
          new Date(b.Tanggal) -
          new Date(a.Tanggal)
      );

  $("expenseCount").textContent =
    `${rows.length} data`;


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty">
          Belum ada pengeluaran.
        </td>
      </tr>
    `;

    $("recentExpenses").innerHTML = `
      <div class="empty-box">
        Belum ada pengeluaran.
      </div>
    `;

    return;
  }


  tbody.innerHTML =
    rows.map(row => {

      return `
        <tr>

          <td>
            ${formatDate(row.Tanggal)}
          </td>

          <td>
            ${escapeHtml(row.Deskripsi || "-")}
          </td>

          <td>
            <strong>
              ${formatRupiah(row.Nominal)}
            </strong>
          </td>

          <td>
            ${escapeHtml(row.Timestamp || "-")}
          </td>

        </tr>
      `;

    }).join("");


  const recent =
    rows.slice(0, 6);

  $("recentExpenses").innerHTML =
    recent.map(row => {

      return `
        <div class="transaction-item">

          <div class="transaction-main">

            <div class="transaction-title">
              ${escapeHtml(
                row.Deskripsi || "Pengeluaran"
              )}
            </div>

            <div class="transaction-sub">
              ${formatDate(row.Tanggal)}
            </div>

          </div>

          <div class="transaction-amount">
            ${formatRupiah(row.Nominal)}
          </div>

        </div>
      `;

    }).join("");

}


/* =========================================================
   FORM PENGELUARAN
========================================================= */

async function handleExpenseSubmit(event) {

  event.preventDefault();

  const tanggal =
    $("expenseDate").value;

  const nominal =
    Number(
      $("expenseNominal").value
    );

  const deskripsi =
    $("expenseDescription")
      .value
      .trim();


  if (!tanggal) {

    showToast(
      "Tanggal wajib diisi.",
      "error"
    );

    return;
  }

  if (!nominal || nominal <= 0) {

    showToast(
      "Nominal harus lebih dari 0.",
      "error"
    );

    return;
  }

  if (!deskripsi) {

    showToast(
      "Deskripsi wajib diisi.",
      "error"
    );

    return;
  }


  const saldo =
    Number(
      state.dashboard?.saldoKasPokja
    ) || 0;


  if (nominal > saldo) {

    showToast(
      `Saldo Kas Pokja tidak mencukupi. Saldo saat ini ${formatRupiah(saldo)}.`,
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  setButtonLoading(
    button,
    true,
    "Menyimpan..."
  );


  try {

    const result =
      await apiPost(
        "addExpense",
        {
          tanggal,
          nominal,
          deskripsi,
          user: "Web App"
        }
      );


    showToast(
      `Pengeluaran berhasil disimpan. ID: ${result.id}`,
      "success"
    );


    event.target.reset();

    setTodayDefaults();

    await refreshAllCore();

    await loadPengeluaran();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  } finally {

    setButtonLoading(
      button,
      false
    );

  }

}


/* =========================================================
   PEGAWAI
========================================================= */

async function loadPegawai() {

  state.pegawai =
    await apiGet("getPegawai");

  renderPegawai();

}


function renderPegawai() {

  const tbody =
    $("employeeTableBody");

  const rows =
    [...state.pegawai];


  $("employeeCount").textContent =
    `${rows.length} pegawai`;


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Belum ada pegawai.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    rows.map(row => {

      const status =
        row.Status || "Aktif";

      return `
        <tr>

          <td>
            <code>
              ${escapeHtml(row.ID)}
            </code>
          </td>

          <td>
            <strong>
              ${escapeHtml(row.Nama)}
            </strong>
          </td>

          <td>
            ${escapeHtml(row.Jabatan)}
          </td>

          <td>
            <strong>
              ${Number(row.Poin) || 0}
            </strong>
          </td>

          <td>
            <span class="status ${
              status === "Aktif"
                ? "status-active"
                : "status-unpaid"
            }">
              ${escapeHtml(status)}
            </span>
          </td>

          <td>

            <button
              class="btn btn-small btn-warning"
              onclick="editEmployee(
                '${escapeJs(row.ID)}'
              )"
            >
              ✏️ Edit
            </button>

          </td>

        </tr>
      `;

    }).join("");

}


/* =========================================================
   FORM PEGAWAI
========================================================= */

async function handleEmployeeSubmit(event) {

  event.preventDefault();

  const nama =
    $("employeeName")
      .value
      .trim();

  const jabatan =
    $("employeePosition")
      .value;


  if (!nama) {

    showToast(
      "Nama wajib diisi.",
      "error"
    );

    return;
  }

  if (
    !CONFIG.positions[jabatan]
  ) {

    showToast(
      "Jabatan tidak valid.",
      "error"
    );

    return;
  }


  const button =
    event.submitter;

  setButtonLoading(
    button,
    true,
    "Menambahkan..."
  );


  try {

    const result =
      await apiPost(
        "addPegawai",
        {
          nama,
          jabatan,
          user: "Web App"
        }
      );


    showToast(
      `Pegawai berhasil ditambahkan. ID: ${result.id}`,
      "success"
    );


    event.target.reset();

    await loadPegawai();

    await loadDashboard();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  } finally {

    setButtonLoading(
      button,
      false
    );

  }

}


/* =========================================================
   EDIT PEGAWAI
========================================================= */

function editEmployee(id) {

  const employee =
    state.pegawai.find(
      item => String(item.ID) === String(id)
    );


  if (!employee) return;


  $("modalContent").innerHTML = `

    <h2 style="margin-bottom:5px">
      Edit Pegawai
    </h2>

    <p style="color:#64748b;font-size:12px;margin-bottom:20px">
      ID: ${escapeHtml(employee.ID)}
    </p>

    <div class="form-group">

      <label>
        Nama
      </label>

      <input
        id="editEmployeeName"
        value="${escapeAttr(employee.Nama || "")}"
      >

    </div>

    <div
      class="form-group"
      style="margin-top:15px"
    >

      <label>
        Status
      </label>

      <select id="editEmployeeStatus">

        <option
          value="Aktif"
          ${employee.Status === "Aktif" ? "selected" : ""}
        >
          Aktif
        </option>

        <option
          value="Nonaktif"
          ${employee.Status === "Nonaktif" ? "selected" : ""}
        >
          Nonaktif
        </option>

      </select>

    </div>

    <button
      id="saveEmployeeBtn"
      class="btn btn-primary btn-block"
      style="margin-top:20px"
    >
      💾 Simpan Perubahan
    </button>

  `;


  openModal();


  $("saveEmployeeBtn")
    .addEventListener(
      "click",
      async () => {

        const button =
          $("saveEmployeeBtn");

        setButtonLoading(
          button,
          true,
          "Menyimpan..."
        );


        try {

          await apiPost(
            "updatePegawai",
            {
              id: employee.ID,

              nama:
                $("editEmployeeName")
                  .value
                  .trim(),

              status:
                $("editEmployeeStatus")
                  .value,

              user: "Web App"
            }
          );


          closeModal();

          showToast(
            "Data pegawai berhasil diperbarui.",
            "success"
          );


          await loadPegawai();


        } catch (error) {

          showToast(
            error.message,
            "error"
          );

        } finally {

          setButtonLoading(
            button,
            false
          );

        }

      }
    );

}


/* =========================================================
   PENGGAJIAN
========================================================= */

async function loadPenggajian() {

  const bulan =
    Number(
      $("salaryMonth").value
    );

  const tahun =
    Number(
      $("salaryYear").value
    );


  try {

    state.penggajian =
      await apiGet(
        "getPenggajian",
        {
          bulan,
          tahun
        }
      );

    renderPenggajian();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


function renderPenggajian() {

  const data =
    state.penggajian;

  if (!data) return;


  $("salaryAllocation").textContent =
    formatRupiah(
      data.totalAlokasiGajiBulan
    );

  $("salaryTotalPoints").textContent =
    data.totalPoin;

  $("salaryPointValue").textContent =
    formatRupiah(
      data.nilaiPoin
    );

  $("salaryBalance").textContent =
    formatRupiah(
      data.sisaKasPenggajian
    );

  $("salaryTotal").textContent =
    formatRupiah(
      data.totalAlokasiGaji
    );

  $("salaryDifference").textContent =
    formatRupiah(
      data.selisihPembulatan
    );


  const tbody =
    $("salaryTableBody");

  const rows =
    data.daftarGaji || [];


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty">
          Belum ada pegawai aktif.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    rows.map(row => {

      const paid =
        row.status === "Sudah Dibayar";


      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(row.nama)}
            </strong>
          </td>

          <td>
            ${escapeHtml(row.jabatan)}
          </td>

          <td>
            ${Number(row.poin)}
          </td>

          <td>
            ${formatRupiah(row.nilaiPoin)}
          </td>

          <td>
            <strong>
              ${formatRupiah(row.gaji)}
            </strong>
          </td>

          <td>

            <span class="status ${
              paid
                ? "status-paid"
                : "status-unpaid"
            }">

              ${
                paid
                  ? "Sudah Dibayar"
                  : "Belum Dibayar"
              }

            </span>

          </td>

          <td>

            ${
              paid

                ? `
                  <small style="color:#64748b">
                    ${formatDate(
                      row.tanggalPembayaran
                    )}
                  </small>
                `

                : `
                  <button
                    class="btn btn-small btn-primary"
                    onclick="payEmployee(
                      '${escapeJs(row.id)}'
                    )"
                  >
                    💵 Bayar
                  </button>
                `
            }

          </td>

        </tr>
      `;

    }).join("");

}


/* =========================================================
   BAYAR GAJI
========================================================= */

async function payEmployee(idPegawai) {

  if (!state.penggajian) return;


  const employee =
    state.penggajian.daftarGaji
      .find(
        item =>
          String(item.id) ===
          String(idPegawai)
      );


  if (!employee) {

    showToast(
      "Data pegawai tidak ditemukan.",
      "error"
    );

    return;
  }


  const confirmed =
    confirm(
      `Bayar gaji ${employee.nama} sebesar ${formatRupiah(employee.gaji)}?`
    );


  if (!confirmed) return;


  try {

    const result =
      await apiPost(
        "payGaji",
        {
          bulan:
            state.penggajian.bulan,

          tahun:
            state.penggajian.tahun,

          idPegawai,

          user: "Web App"
        }
      );


    showToast(
      `Gaji berhasil dibayarkan: ${formatRupiah(result.nominal)}`,
      "success"
    );


    await loadPenggajian();

    await refreshAllCore();

    await loadRiwayat();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


/* =========================================================
   LAPORAN
========================================================= */

async function loadLaporan() {

  const bulan =
    Number(
      $("reportMonth").value
    );

  const tahun =
    Number(
      $("reportYear").value
    );


  try {

    state.laporan =
      await apiGet(
        "getLaporan",
        {
          bulan,
          tahun
        }
      );

    renderLaporan();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


function renderLaporan() {

  const data =
    state.laporan;

  if (!data) return;


  $("reportIncome").textContent =
    formatRupiah(
      data.totalPemasukan
    );

  $("reportPokja").textContent =
    formatRupiah(
      data.totalKasPokja
    );

  $("reportSalary").textContent =
    formatRupiah(
      data.totalKasPenggajian
    );

  $("reportExpense").textContent =
    formatRupiah(
      data.totalPengeluaran
    );

  $("reportBalancePokja").textContent =
    formatRupiah(
      data.saldoAkhirPokja
    );

  $("reportPaidSalary").textContent =
    formatRupiah(
      data.totalGajiDibayar
    );


  renderReportSources(
    data.pemasukanPerSumber
  );

  renderReportExpenses(
    data.daftarPengeluaran
  );

}


function renderReportSources(sources) {

  const container =
    $("reportSources");


  const entries =
    Object.entries(
      sources || {}
    );


  if (!entries.length) {

    container.innerHTML = `
      <div class="empty-box">
        Tidak ada pemasukan pada periode ini.
      </div>
    `;

    return;
  }


  container.innerHTML =
    entries.map(
      ([name, amount]) => `

        <div class="source-item">

          <span>
            ${escapeHtml(name)}
          </span>

          <strong>
            ${formatRupiah(amount)}
          </strong>

        </div>

      `
    ).join("");

}


function renderReportExpenses(rows) {

  const container =
    $("reportExpenses");


  if (!rows || !rows.length) {

    container.innerHTML = `
      <div class="empty-box">
        Tidak ada pengeluaran pada periode ini.
      </div>
    `;

    return;
  }


  container.innerHTML =
    rows.map(row => `

      <div class="transaction-item">

        <div class="transaction-main">

          <div class="transaction-title">
            ${escapeHtml(
              row.Deskripsi || "-"
            )}
          </div>

          <div class="transaction-sub">
            ${formatDate(row.Tanggal)}
          </div>

        </div>

        <div class="transaction-amount">
          ${formatRupiah(row.Nominal)}
        </div>

      </div>

    `).join("");

}


/* =========================================================
   KALENDER
========================================================= */

async function loadKalender() {

  const bulan =
    Number(
      $("calendarMonth").value
    );

  const tahun =
    Number(
      $("calendarYear").value
    );


  try {

    state.kalender =
      await apiGet(
        "getKalender",
        {
          bulan,
          tahun
        }
      );


    renderCalendar(
      bulan,
      tahun
    );


    renderCalendarEvents();


  } catch (error) {

    showToast(
      error.message,
      "error"
    );

  }

}


function renderCalendar(bulan, tahun) {

  const grid =
    $("calendarGrid");


  const title =
    $("calendarTitle");


  title.textContent =
    `${monthName(bulan)} ${tahun}`;


  const first =
    new Date(
      tahun,
      bulan - 1,
      1
    );


  const last =
    new Date(
      tahun,
      bulan,
      0
    );


  const firstDay =
    first.getDay();

  const days =
    last.getDate();


  let html = "";


  for (
    let i = 0;
    i < firstDay;
    i++
  ) {

    html += `
      <div class="calendar-day other"></div>
    `;

  }


  for (
    let day = 1;
    day <= days;
    day++
  ) {

    const date =
      `${tahun}-${String(bulan).padStart(2,"0")}-${String(day).padStart(2,"0")}`;


    const events =
      state.kalender.filter(
        event =>
          String(event.tanggal)
            .substring(0,10) === date
      );


    html += `

      <div class="calendar-day">

        <div class="calendar-number">
          ${day}
        </div>

        <div class="calendar-events">

          ${events.slice(0, 3).map(
            event => `

              <div
                class="calendar-event ${
                  event.tipe === "pemasukan"
                    ? "event-income"
                    : event.tipe === "pengeluaran"
                      ? "event-expense"
                      : "event-salary"
                }"
                title="${escapeAttr(
                  event.keterangan
                )}"
              >

                ${
                  event.tipe === "pemasukan"
                    ? "💰"
                    : event.tipe === "pengeluaran"
                      ? "💸"
                      : "💵"
                }

                ${escapeHtml(
                  event.keterangan || ""
                )}

              </div>

            `
          ).join("")}

        </div>

      </div>

    `;

  }


  grid.innerHTML =
    html;

}


function renderCalendarEvents() {

  const container =
    $("calendarEvents");


  const rows =
    [...state.kalender]
      .sort(
        (a,b) =>
          String(a.tanggal)
            .localeCompare(
              String(b.tanggal)
            )
      );


  if (!rows.length) {

    container.innerHTML = `
      <div class="empty-box">
        Tidak ada transaksi bulan ini.
      </div>
    `;

    return;
  }


  container.innerHTML =
    rows.map(event => {

      const typeClass =
        event.tipe === "pemasukan"
          ? "event-income"
          : event.tipe === "pengeluaran"
            ? "event-expense"
            : "event-salary";


      return `

        <div class="transaction-item">

          <div class="transaction-main">

            <div class="transaction-title">

              ${
                event.tipe === "pemasukan"
                  ? "💰 Pemasukan"
                  : event.tipe === "pengeluaran"
                    ? "💸 Pengeluaran"
                    : "💵 Gaji"
              }

            </div>

            <div class="transaction-sub">

              ${formatDate(event.tanggal)}

              ·

              ${escapeHtml(
                event.keterangan || "-"
              )}

            </div>

          </div>

          <div class="transaction-amount">

            ${formatRupiah(
              event.nominal
            )}

          </div>

        </div>

      `;

    }).join("");

}


/* =========================================================
   RIWAYAT
========================================================= */

async function loadRiwayat() {

  state.riwayat =
    await apiGet("getRiwayat");

  renderRiwayat();

}


function renderRiwayat() {

  const tbody =
    $("historyTableBody");


  const rows =
    state.riwayat || [];


  $("historyCount").textContent =
    `${rows.length} transaksi`;


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Belum ada transaksi.
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    rows.map(row => {

      let typeClass =
        "status-active";

      if (
        row.jenis ===
        "Pembayaran Gaji"
      ) {

        typeClass =
          "status-paid";

      } else if (
        row.jenis ===
        "Pengeluaran"
      ) {

        typeClass =
          "status-unpaid";

      }


      return `

        <tr>

          <td>
            ${formatDate(row.tanggal)}
          </td>

          <td>

            <span class="status ${typeClass}">
              ${escapeHtml(row.jenis)}
            </span>

          </td>

          <td>
            ${escapeHtml(
              row.kategori || "-"
            )}
          </td>

          <td>
            ${escapeHtml(
              row.deskripsi || "-"
            )}
          </td>

          <td>
            <strong>
              ${formatRupiah(row.nominal)}
            </strong>
          </td>

          <td>
            ${formatRupiah(
              row.alokasiPokja
            )}
          </td>

          <td>
            ${formatRupiah(
              row.alokasiGaji
            )}
          </td>

          <td>
            <code>
              ${escapeHtml(row.id || "-")}
            </code>
          </td>

        </tr>

      `;

    }).join("");

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  $$(".nav-item").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;

        navigateTo(page);

      }
    );

  });


  $$(".quick-btn").forEach(button => {

    button.addEventListener(
      "click",
      () => {

        navigateTo(
          button.dataset.go
        );

      }
    );

  });

}


async function navigateTo(page) {

  state.currentPage =
    page;


  $$(".nav-item").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.page === page
    );

  });


  $$(".page").forEach(section => {

    section.classList.toggle(
      "active",
      section.id ===
      `page-${page}`
    );

  });


  updatePageTitle(page);

  closeMobileMenu();


  try {

    if (page === "dashboard") {

      await loadDashboard();

    } else if (page === "pemasukan") {

      await loadPemasukan();

    } else if (page === "pengeluaran") {

      await loadPengeluaran();

      await loadDashboard();

    } else if (page === "pegawai") {

      await loadPegawai();

    } else if (page === "penggajian") {

      await loadPegawai();

      await loadPenggajian();

    } else if (page === "laporan") {

      await loadLaporan();

    } else if (page === "kalender") {

      await loadKalender();

    } else if (page === "riwayat") {

      await loadRiwayat();

    }

  } catch (error) {

    console.error(error);

    showToast(
      error.message,
      "error"
    );

  }

}


function updatePageTitle(page) {

  const titles = {

    dashboard: "Dashboard",
    pemasukan: "Pemasukan",
    pengeluaran: "Pengeluaran",
    pegawai: "Pegawai Pokja",
    penggajian: "Penggajian",
    laporan: "Laporan",
    kalender: "Kalender",
    riwayat: "Riwayat Transaksi"

  };


  $("pageTitle").textContent =
    titles[page] ||
    "Keuangan";

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

  $("refreshBtn")
    .addEventListener(
      "click",
      async () => {

        await refreshCurrentPage();

        showToast(
          "Data berhasil diperbarui.",
          "success"
        );

      }
    );


  $("mobileMenuBtn")
    .addEventListener(
      "click",
      () => {

        $(".sidebar")
          .classList.toggle("open");

      }
    );


  $("modalClose")
    .addEventListener(
      "click",
      closeModal
    );


  $("modalOverlay")
    .addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("modalOverlay")
        ) {

          closeModal();

        }

      }
    );


  $("loadSalaryBtn")
    .addEventListener(
      "click",
      loadPenggajian
    );


  $("loadReportBtn")
    .addEventListener(
      "click",
      loadLaporan
    );


  $("loadCalendarBtn")
    .addEventListener(
      "click",
      loadKalender
    );


  $("prevMonth")
    .addEventListener(
      "click",
      changeCalendarMonth.bind(null, -1)
    );


  $("nextMonth")
    .addEventListener(
      "click",
      changeCalendarMonth.bind(null, 1)
    );


  $("incomeNominal")
    .addEventListener(
      "input",
      updateIncomePreview
    );


  $("resetIncome")
    .addEventListener(
      "click",
      () => {

        setTimeout(
          updateIncomePreview,
          0
        );

      }
    );

}


/* =========================================================
   FORMS SETUP
========================================================= */

function setupForms() {

  $("incomeForm")
    .addEventListener(
      "submit",
      handleIncomeSubmit
    );


  $("expenseForm")
    .addEventListener(
      "submit",
      handleExpenseSubmit
    );


  $("employeeForm")
    .addEventListener(
      "submit",
      handleEmployeeSubmit
    );

}


/* =========================================================
   CALENDAR NAVIGATION
========================================================= */

function changeCalendarMonth(direction) {

  let month =
    Number(
      $("calendarMonth").value
    );

  let year =
    Number(
      $("calendarYear").value
    );


  month += direction;


  if (month < 1) {

    month = 12;
    year--;

  }


  if (month > 12) {

    month = 1;
    year++;

  }


  $("calendarMonth").value =
    month;

  $("calendarYear").value =
    year;


  loadKalender();

}


/* =========================================================
   REFRESH
========================================================= */

async function refreshCurrentPage() {

  await loadDashboard();


  switch (state.currentPage) {

    case "pemasukan":
      await loadPemasukan();
      break;

    case "pengeluaran":
      await loadPengeluaran();
      break;

    case "pegawai":
      await loadPegawai();
      break;

    case "penggajian":
      await loadPenggajian();
      break;

    case "laporan":
      await loadLaporan();
      break;

    case "kalender":
      await loadKalender();
      break;

    case "riwayat":
      await loadRiwayat();
      break;

  }

}


async function refreshAllCore() {

  await loadDashboard();

}


/* =========================================================
   DEFAULT DATE
========================================================= */

function setTodayDefaults() {

  const now =
    new Date();


  const date =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          CONFIG.timezone
      }
    ).format(now);


  $("incomeDate").value =
    date;

  $("expenseDate").value =
    date;


  const month =
    Number(
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            CONFIG.timezone,
          month:
            "numeric"
        }
      ).format(now)
    );


  const year =
    Number(
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            CONFIG.timezone,
          year:
            "numeric"
        }
      ).format(now)
    );


  $("salaryMonth").value =
    month;

  $("salaryYear").value =
    year;


  $("reportMonth").value =
    month;

  $("reportYear").value =
    year;


  $("calendarMonth").value =
    month;

  $("calendarYear").value =
    year;


  updateIncomePreview();

}


/* =========================================================
   CLOCK
========================================================= */

function startClock() {

  updateClock();

  setInterval(
    updateClock,
    1000
  );

}


function updateClock() {

  const now =
    new Date();


  const time =
    new Intl.DateTimeFormat(
      "id-ID",
      {
        timeZone:
          CONFIG.timezone,

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit"
      }
    ).format(now);


  $("currentTime").textContent =
    time;

}


/* =========================================================
   LOADING
========================================================= */

function hideLoading() {

  const screen =
    $("loadingScreen");

  screen.style.opacity = "0";

  screen.style.transition =
    "opacity .25s ease";


  setTimeout(
    () => {

      screen.style.display =
        "none";

    },
    250
  );

}


/* =========================================================
   CONNECTION
========================================================= */

function setConnectionStatus(connected) {

  const text =
    $("connectionStatus");

  const dot =
    document.querySelector(
      ".status-dot"
    );


  if (connected) {

    text.textContent =
      "Terhubung";

    dot.style.background =
      "#4ade80";

  } else {

    text.textContent =
      "Tidak terhubung";

    dot.style.background =
      "#ef4444";

  }

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  type = "success"
) {

  const container =
    $("toastContainer");


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    `toast ${type}`;


  const icon =
    type === "error"
      ? "❌"
      : type === "warning"
        ? "⚠️"
        : "✅";


  toast.innerHTML = `

    <div>
      <strong>
        ${icon} ${
          type === "error"
            ? "Gagal"
            : type === "warning"
              ? "Perhatian"
              : "Berhasil"
        }
      </strong>

      <p>
        ${escapeHtml(
          String(message)
        )}
      </p>

    </div>

  `;


  container.appendChild(
    toast
  );


  setTimeout(
    () => {

      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateX(20px)";

      toast.style.transition =
        ".2s";

      setTimeout(
        () => toast.remove(),
        250
      );

    },
    4000
  );

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
  button,
  loading,
  text = "Memproses..."
) {

  if (!button) return;


  if (loading) {

    button.dataset.originalText =
      button.innerHTML;

    button.disabled = true;

    button.innerHTML =
      `⏳ ${text}`;

  } else {

    button.disabled = false;

    button.innerHTML =
      button.dataset.originalText ||
      "Simpan";

  }

}


/* =========================================================
   MODAL
========================================================= */

function openModal() {

  $("modalOverlay")
    .classList.add("show");

}


function closeModal() {

  $("modalOverlay")
    .classList.remove("show");

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(value) {

  const number =
    Number(value) || 0;


  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }
  ).format(number);

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {

  if (!value) return "-";


  let date;


  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {

    const parts =
      value.split("-");

    date =
      new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );

  } else {

    date =
      new Date(value);

  }


  if (isNaN(date.getTime())) {

    return String(value);

  }


  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: CONFIG.timezone
    }
  ).format(date);

}


/* =========================================================
   MONTH NAME
========================================================= */

function monthName(month) {

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      month: "long"
    }
  ).format(
    new Date(
      2020,
      month - 1,
      1
    )
  );

}


/* =========================================================
   SECURITY / ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttr(value) {

  return escapeHtml(value);

}


function escapeJs(value) {

  return String(value ?? "")
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /'/g,
      "\\'"
    )
    .replace(
      /"/g,
      '\\"'
    );

}


/* =========================================================
   EXPORT GLOBAL FUNCTIONS
========================================================= */

window.payEmployee =
  payEmployee;

window.editEmployee =
  editEmployee;
