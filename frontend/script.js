/***** CONFIG: Supabase *****/
const SUPABASE_URL = "https://zyrgcinblulzbuizwfmt.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cmdjaW5ibHVsemJ1aXp3Zm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDQ3NTcsImV4cCI6MjA3MDk4MDc1N30.j1KRoLUaPk0n_q0vOwisXSOY2nH1JDkiK27uKvt2ww8";

// Supabase client (global name is `supabase` from the CDN)
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

/***** STATE *****/
let DATA = [];
let editingId = null;

/***** UTILITIES *****/
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 2500);
}

// Convert "YYYY-MM-DD" to local Date at midnight
function dateOnly(str){
  if(!str) return null;
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}

// Status text + color, with your rule: today counts as Expired (today), red
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
    // ✅ Now shows "Valid (expires today)" in yellow
    return { text: "Valid (expires today)", cls: "yellow" };
  }

  // future
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
  // Desktop table
  tableBody.innerHTML = "";
  rows.forEach((r, i) => {
    const st = buildStatus(r.valid_to);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
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

  // Mobile cards
  const mobileView = document.getElementById("mobileView");
  mobileView.innerHTML = "";
  rows.forEach((r) => {
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
}


/***** DATA OPS (Supabase) *****/
async function loadAll(){
  const { data, error } = await sb.from("licenses").select("*").order("id", { ascending: true });
  if(error){
    console.error(error);
    showToast("Failed to load records");
    return;
  }
  DATA = data || [];
  render(DATA);
}

// friendly duplicate check for license_no OR token_no
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
  // duplicate guard
  if(await existsDuplicate(payload.license_no, payload.token_no, editingId)){
    showToast("⚠️ A record with this License No or Token No already exists.");
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

  let rows = DATA;
  if(q){
    rows = rows.filter(r => matchQuery(r, q));
  }

  // Today at local midnight
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
      if(filter === "active")  return diff > 7;
      return true;
    });
  }

  render(rows);
}

searchBtn.addEventListener("click", applySearchAndFilter);
searchInput.addEventListener("keydown", (e) => { if(e.key==="Enter") applySearchAndFilter(); });
filterSelect.addEventListener("change", applySearchAndFilter);

/***** EXPORT EXCEL *****/
exportBtn.addEventListener("click", () => {
  const rows = DATA.map((r, idx) => {
    const s = buildStatus(r.valid_to);
    return {
      Sl: idx + 1,
      Name: r.name,
      Designation: r.designation,
      "License No": r.license_no,
      "Token No": r.token_no,
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

/***** INIT *****/
window.onEdit = onEdit;
window.onDelete = onDelete;

loadAll();
