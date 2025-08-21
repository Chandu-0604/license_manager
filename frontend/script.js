/***** CONFIG: Supabase *****/
const SUPABASE_URL = "https://zyrgcinblulzbuizwfmt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cmdjaW5ibHVsemJ1aXp3Zm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDQ3NTcsImV4cCI6MjA3MDk4MDc1N30.j1KRoLUaPk0n_q0vOwisXSOY2nH1JDkiK27uKvt2ww8";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/***** DOM *****/
const tableBody   = document.getElementById("tableBody");
const countText   = document.getElementById("countText");
const toast       = document.getElementById("toast");
const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modalTitle");
const form        = document.getElementById("form");

const addBtn      = document.getElementById("addBtn");
const exportBtn   = document.getElementById("exportBtn");
const cancelBtn   = document.getElementById("cancelBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");
const filterSelect= document.getElementById("filterSelect");
const clearBtn    = document.getElementById("clearBtn");

/***** STATE *****/
let DATA = [];
let editingId = null;
let currentPage = 1;
const rowsPerPage = 10;
let filteredRows = []; // ✅ Keep filtered set separate

/***** UTILITIES *****/
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 2500);
}

function dateOnly(str){
  if(!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const [y,m,d] = parts.map(Number);
  const dt = new Date(y, (m||1)-1, d||1);
  return isNaN(dt.getTime()) ? null : dt;
}

// ✅ Consistent sorter: earliest valid_to first; nulls go last
function compareByValidTo(a, b){
  const da = dateOnly(a.valid_to);
  const db = dateOnly(b.valid_to);
  if (!da && !db) return 0;
  if (!da) return 1;   // a goes after b
  if (!db) return -1;  // a goes before b
  return da - db;
}

function buildStatus(validToStr){
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const validTo = dateOnly(validToStr);
  if(!validTo) return { text: "N/A", cls: "yellow" };

  const msDay = 24*60*60*1000;
  const diff = Math.round((validTo - todayOnly)/msDay);

  if(diff < 0){
    const days = Math.abs(diff);
    return { text: `Expired (${days} day${days!==1?"s":""} ago)`, cls: "red" };
  }
  if(diff === 0){
    return { text: "Valid (expires today)", cls: "yellow" };
  }

  const months = Math.floor(diff / 30);
  const days = diff % 30;
  const soon = diff <= 7;
  const label = months > 0
    ? `Valid (${months}m ${days}d left)`
    : `Valid (${days}d left)`;
  return { text: label, cls: soon ? "yellow" : "green" };
}

function matchQuery(row, q){
  const hay = `${row.name||""} ${row.designation||""} ${row.license_no||""} ${row.token_no||""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

/***** RENDER *****/
function render(rows) {
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = rows.slice(start, end);

  // Desktop
  tableBody.innerHTML = "";
  pageRows.forEach((r, i) => {
    const st = buildStatus(r.valid_to);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${start + i + 1}</td>
      <td>${r.name||""}</td>
      <td>${r.designation||""}</td>
      <td>${r.license_no||""}</td>
      <td>${r.token_no||""}</td>
      <td>${r.issue_date||""}</td>
      <td>${r.valid_from||""}</td>
      <td>${r.valid_to||""}</td>
      <td><span class="badge ${st.cls}">${st.text}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-outline" onclick="onEdit(${r.id})">Edit</button>
          <button class="btn btn-danger" onclick="onDelete(${r.id})">Delete</button>
        </div>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  // Mobile
  const mobileView = document.getElementById("mobileView");
  mobileView.innerHTML = "";
  pageRows.forEach((r) => {
    const st = buildStatus(r.valid_to);
    const card = document.createElement("div");
    card.className = "mobile-card";
    card.innerHTML = `
      <h3>${r.name || "No Name"}</h3>
      <p><b>Designation:</b> ${r.designation || ""}</p>
      <p><b>License No:</b> ${r.license_no || ""}</p>
      <p><b>Token No:</b> ${r.token_no || ""}</p>
      <p><b>Issue:</b> ${r.issue_date || ""}</p>
      <p><b>Valid:</b> ${r.valid_from || ""} → ${r.valid_to || ""}</p>
      <span class="badge ${st.cls}">${st.text}</span>
      <div class="actions">
        <button class="btn btn-outline" onclick="onEdit(${r.id})">Edit</button>
        <button class="btn btn-danger" onclick="onDelete(${r.id})">Delete</button>
      </div>
    `;
    mobileView.appendChild(card);
  });

  countText.textContent = `${rows.length} record${rows.length!==1?"s":""}`;
  renderPagination(rows.length);
}

function renderPagination(totalRows) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => { currentPage--; render(filteredRows); };
  pagination.appendChild(prevBtn);

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    if (p === currentPage) btn.classList.add("active");
    btn.onclick = () => { currentPage = p; render(filteredRows); };
    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => { currentPage++; render(filteredRows); };
  pagination.appendChild(nextBtn);
}

/***** DATA OPS *****/
async function loadAll(){
  const { data, error } = await sb.from("licenses").select("*").order("id", { ascending: true });
  if(error){ console.error(error); showToast("Failed to load records"); return; }
  DATA = data || [];

  // ✅ default view: sorted by earliest valid_to
  filteredRows = [...DATA].sort(compareByValidTo);
  currentPage = 1;
  render(filteredRows);
}

async function existsDuplicate(licenseNo, tokenNo, ignoreId=null){
  let query = sb.from("licenses").select("id").or(`license_no.eq.${licenseNo},token_no.eq.${tokenNo}`);
  const { data, error } = await query;
  if(error) return false;
  if(!data || data.length===0) return false;
  if(ignoreId){
    return data.some(r => r.id !== ignoreId);
  }
  return true;
}

async function saveRecord(payload){
  if(await existsDuplicate(payload.license_no, payload.token_no, editingId)){
    showToast("⚠️ Duplicate License No or Token No.");
    return;
  }

  if(editingId){
    const { error } = await sb.from("licenses").update(payload).eq("id", editingId);
    if(error){ console.error(error); showToast("Update failed"); return; }
    showToast("✏️ Record updated");
  }else{
    const { error } = await sb.from("licenses").insert(payload);
    if(error){ console.error(error); showToast("Add failed"); return; }
    showToast("✅ Record added");
  }
  await loadAll();
}

async function onDelete(id){
  if(!confirm("Delete this record?")) return;
  const { error } = await sb.from("licenses").delete().eq("id", id);
  if(error){ console.error(error); showToast("Delete failed"); return; }
  showToast("🗑️ Record deleted");
  await loadAll();
}

async function onEdit(id){
  const row = DATA.find(r => r.id === id);
  if(!row){ showToast("Record not found"); return; }
  editingId = id;
  modalTitle.textContent = "Edit Record";

  document.getElementById("id").value = row.id;
  document.getElementById("name").value = row.name || "";
  document.getElementById("designation").value = row.designation || "";
  document.getElementById("licenseNo").value = row.license_no || "";
  document.getElementById("tokenNo").value = row.token_no || "";
  document.getElementById("issueDate").value = row.issue_date || "";
  document.getElementById("validFrom").value = row.valid_from || "";
  document.getElementById("validTo").value = row.valid_to || "";

  modal.classList.add("show");
}

/***** MODAL + FORM *****/
addBtn.addEventListener("click", () => {
  editingId = null;
  modalTitle.textContent = "+ Add Record";
  form.reset();
  modal.classList.add("show");
});

cancelBtn.addEventListener("click", () => modal.classList.remove("show"));
modal.addEventListener("click", (e) => { if(e.target === modal) modal.classList.remove("show"); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("name").value.trim(),
    designation: document.getElementById("designation").value.trim(),
    license_no: document.getElementById("licenseNo").value.trim(),
    token_no: document.getElementById("tokenNo").value.trim(),
    issue_date: document.getElementById("issueDate").value || null,
    valid_from: document.getElementById("validFrom").value || null,
    valid_to: document.getElementById("validTo").value || null,
  };
  modal.classList.remove("show");
  await saveRecord(payload);
});

/***** SEARCH + FILTER *****/
function applySearchAndFilter(){
  const q = (searchInput.value || "").trim().toLowerCase();
  const filter = filterSelect.value;

  // Start from full DATA
  let rows = [...DATA];

  // Search
  if(q){
    rows = rows.filter(r => matchQuery(r, q));
  }

  // Date-based filters
  const now = new Date();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if(filter !== "all"){
    rows = rows.filter(r => {
      const d = r.valid_to ? dateOnly(r.valid_to) : null;
      if(!d) return false;
      const diff = Math.round((d - todayOnly)/(24*60*60*1000));

      if(filter === "expired") return diff < 0;
      if(filter === "today")   return diff === 0;
      if(filter === "soon")    return diff > 0 && diff <= 7;
      if(filter === "1month")  return diff > 0 && diff <= 30;
      if(filter === "2months") return diff > 0 && diff <= 60;
      if(filter === "active")  return diff > 60;
      return true;
    });
  }

  // ✅ Always sort by earliest expiry first
  rows.sort(compareByValidTo);

  filteredRows = rows;
  currentPage = 1;
  render(filteredRows);
}

searchBtn.addEventListener("click", applySearchAndFilter);
searchInput.addEventListener("keydown", (e) => { if(e.key==="Enter") applySearchAndFilter(); });
filterSelect.addEventListener("change", applySearchAndFilter);

// ✅ Clear → reset search & filter and show sorted list
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterSelect.value = "all";
  filteredRows = [...DATA].sort(compareByValidTo);
  currentPage = 1;
  render(filteredRows);
});

/***** SCROLL TO TOP BUTTON *****/
const scrollTopBtn = document.getElementById("scrollTopBtn");

window.addEventListener("scroll", () => {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    scrollTopBtn.classList.add("show");
  } else {
    scrollTopBtn.classList.remove("show");
  }
});

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/***** EXPORT *****/
// ✅ Export the SAME sorted/filtered view (earliest expiry first)
exportBtn.addEventListener("click", () => {
  // Sort the current filteredRows again to guarantee order
  const rowsForExport = [...filteredRows].sort(compareByValidTo);

  const rows = rowsForExport.map((r, idx) => {
    const s = buildStatus(r.valid_to);
    return {
      Sl: idx + 1,
      Name: r.name,
      Designation: r.designation,
      "Token No": r.token_no,
      "License No": r.license_no,
      "Issue Date": r.issue_date,
      "Validity From": r.valid_from,
      "Validity To": r.valid_to,
      Status: s.text
    };
  });

  if (typeof XLSX === "undefined"){
    showToast("XLSX not available");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Licenses");
  XLSX.writeFile(wb, "licenses.xlsx");
});

/***** SERVICE WORKER UPDATE HANDLER *****/
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js")
    .then(reg => {
      console.log("✅ SW registered", reg);

      // Listen for new updates
      reg.onupdatefound = () => {
        const newWorker = reg.installing;
        newWorker.onstatechange = () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // 🔔 New update ready
            showToast("⚡ New version available. Refresh to update.");
          }
        };
      };
    })
    .catch(err => console.error("SW registration failed:", err));
}

/***** INIT *****/
window.onEdit = onEdit;
window.onDelete = onDelete;
loadAll();
