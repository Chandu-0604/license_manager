
/******************************************************************************
 * SUPABASE CONFIG
 ******************************************************************************/
const SUPABASE_URL = "https://upoidokfngddwjcsjnhv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwb2lkb2tmbmdkZHdqY3Nqbmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjUyNDcsImV4cCI6MjA4NDQwMTI0N30.SXDMag16IKgfDxBDrTDNhqV22j2vUtuOHnCy2-JqMYA";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/******************************************************************************
 * DOM REFERENCES
 ******************************************************************************/
const tableBody   = document.getElementById("tableBody");
const countText   = document.getElementById("countText");
const toast       = document.getElementById("toast");
const modal       = document.getElementById("modal");
const modalTitle  = document.getElementById("modalTitle");
const form        = document.getElementById("form");

const addBtn      = document.getElementById("addBtn");
const exportBtn   = document.getElementById("exportBtn");
const exportPdfBtn= document.getElementById("exportPdfBtn");
const cancelBtn   = document.getElementById("cancelBtn");
const searchInput = document.getElementById("searchInput");
const searchBtn   = document.getElementById("searchBtn");
const filterSelect= document.getElementById("filterSelect");
const clearBtn    = document.getElementById("clearBtn");

const filterMonth = document.getElementById("filterMonth");
const filterYear  = document.getElementById("filterYear");
const rangeStart  = document.getElementById("rangeStart");
const rangeEnd    = document.getElementById("rangeEnd");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

/******************************************************************************
 * STATE
 ******************************************************************************/
let DATA = [];
let filteredRows = [];
let editingId = null;
let currentPage = 1;
const rowsPerPage = 10;

/******************************************************************************
 * UTILITIES
 ******************************************************************************/
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function dateOnly(str){
  if(!str) return null;
  const [Y,M,D] = str.split("-").map(Number);
  return new Date(Y, M-1, D);
}

function formatDate_DDMMYYYY(str){
  if(!str) return "";
  const d = new Date(str);
  if(isNaN(d)) return "";
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getValidityYear(str){
  if(!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d.getFullYear();
}

function compareByValidFrom(a,b){
  const da = dateOnly(a.valid_from);
  const db = dateOnly(b.valid_from);
  if(!da && !db) return 0;
  if(!da) return 1;
  if(!db) return -1;
  return da - db;
}

function matchQuery(row,q){
  const hay = `${row.name||""} ${row.designation||""} ${row.license_no||""} ${row.token_no||""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function buildStatus(validToStr){
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = dateOnly(validToStr);
  if(!d) return {text:"N/A", cls:"yellow"};
  const diff = Math.round((d - t0)/(24*60*60*1000));
  if(diff<0) return {text:`Expired (${Math.abs(diff)}d ago)`, cls:"red"};
  if(diff===0) return {text:"Valid (expires today)", cls:"yellow"};
  return {text:`Valid (${diff}d)`, cls: diff<=7?"yellow":"green"};
}

/******************************************************************************
 * TABLE RENDER + PAGINATION
 ******************************************************************************/
function render(rows){
  const start = (currentPage-1)*rowsPerPage;
  const pageRows = rows.slice(start, start+rowsPerPage);

  tableBody.innerHTML="";
  const mobileView = document.getElementById("mobileView");
  mobileView.innerHTML="";

  pageRows.forEach((r,i)=>{
    const st = buildStatus(r.valid_to);

    // Desktop row
    const tr = document.createElement("tr");
    tr.innerHTML=`
      <td>${start+i+1}</td>
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
      </td>`;
    tableBody.appendChild(tr);

    // Mobile card
    const card = document.createElement("div");
    card.className = "mobile-card";
    card.innerHTML = `
      <h3>${r.name||""}</h3>
      <p><b>Designation:</b> ${r.designation||""}</p>
      <p><b>License:</b> ${r.license_no||""}</p>
      <p><b>Token:</b> ${r.token_no||""}</p>
      <p><b>Issue:</b> ${r.issue_date||""}</p>
      <p><b>Valid From:</b> ${r.valid_from||""}</p>
      <p><b>Valid To:</b> ${r.valid_to||""}</p>
      <span class="badge ${st.cls}">${st.text}</span>
      <div class="actions" style="margin-top:10px; display:flex; gap:10px;">
        <button class="btn btn-outline" onclick="onEdit(${r.id})">Edit</button>
        <button class="btn btn-danger" onclick="onDelete(${r.id})">Delete</button>
      </div>
    `;
    mobileView.appendChild(card);
  });

  countText.textContent = `${rows.length} record${rows.length!==1?"s":""}`;
  renderPagination(rows.length);
}

function renderPagination(total){
  const pagination = document.getElementById("pagination");
  pagination.innerHTML="";
  const pages = Math.ceil(total/rowsPerPage);
  if(pages<=1) return;

  const prev = document.createElement("button");
  prev.textContent="Prev";
  prev.disabled=currentPage===1;
  prev.onclick=()=>{currentPage--; render(filteredRows);};
  pagination.appendChild(prev);

  for(let p=1;p<=pages;p++){
    const b = document.createElement("button");
    b.textContent=p;
    if(p===currentPage) b.classList.add("active");
    b.onclick=()=>{currentPage=p; render(filteredRows);};
    pagination.appendChild(b);
  }

  const next = document.createElement("button");
  next.textContent="Next";
  next.disabled=currentPage===pages;
  next.onclick=()=>{currentPage++; render(filteredRows);};
  pagination.appendChild(next);
}

/******************************************************************************
 * LOAD + CRUD
 ******************************************************************************/
async function loadAll(){
  const {data,error}=await sb.from("licenses").select("*").order("id",{ascending:true});
  if(error){console.error(error); showToast("Load failed"); return;}
  DATA=data||[];
  populateYearFilter();
  filteredRows=[...DATA].sort(compareByValidFrom);
  currentPage=1;
  render(filteredRows);
}

function populateYearFilter(){
  const years=[...new Set(DATA.map(r=>{
    const d=dateOnly(r.valid_from);
    return d?d.getFullYear():null;
  }).filter(Boolean))].sort((a,b)=>a-b);
  filterYear.innerHTML=`<option value="all">All Years</option>`;
  years.forEach(y=>{
    const opt=document.createElement("option");
    opt.value=y; opt.textContent=y;
    filterYear.appendChild(opt);
  });
}

async function existsDuplicate(licenseNo, tokenNo, ignoreId=null){
  let q=sb.from("licenses").select("id").or(`license_no.eq.${licenseNo},token_no.eq.${tokenNo}`);
  const {data,error}=await q;
  if(error||!data) return false;
  if(ignoreId) return data.some(r=>r.id!==ignoreId);
  return data.length>0;
}

async function saveRecord(payload){
  if(await existsDuplicate(payload.license_no, payload.token_no, editingId)){
    showToast("Duplicate License or Token");
    return;
  }
  if(editingId){
    await sb.from("licenses").update(payload).eq("id",editingId);
    showToast("Updated");
  } else {
    await sb.from("licenses").insert(payload);
    showToast("Added");
  }
  modal.classList.remove("show");
  loadAll();
}

async function onDelete(id){
  if(!confirm("Delete?")) return;
  await sb.from("licenses").delete().eq("id",id);
  showToast("Deleted");
  loadAll();
}

async function onEdit(id){
  const row=DATA.find(r=>r.id===id);
  editingId=id;
  modalTitle.textContent="Edit Record";
  document.getElementById("name").value=row.name;
  document.getElementById("designation").value=row.designation;
  document.getElementById("licenseNo").value=row.license_no;
  document.getElementById("tokenNo").value=row.token_no;
  document.getElementById("issueDate").value=row.issue_date;
  document.getElementById("validFrom").value=row.valid_from;
  document.getElementById("validTo").value=row.valid_to;
  modal.classList.add("show");
}

/******************************************************************************
 * ADD RECORD BUTTON FIX
 ******************************************************************************/
addBtn.onclick = () => {
  editingId=null;
  modalTitle.textContent="Add Record";
  form.reset();
  modal.classList.add("show");
};

cancelBtn.onclick = () => modal.classList.remove("show");

form.onsubmit = (e) => {
  e.preventDefault();
  saveRecord({
    name: document.getElementById("name").value.trim(),
    designation: document.getElementById("designation").value.trim(),
    license_no: document.getElementById("licenseNo").value.trim(),
    token_no: document.getElementById("tokenNo").value.trim(),
    issue_date: document.getElementById("issueDate").value,
    valid_from: document.getElementById("validFrom").value,
    valid_to: document.getElementById("validTo").value,
  });
};

/******************************************************************************
 * SEARCH + FILTERS
 ******************************************************************************/
function applySearchAndFilter() {
  let rows = [...DATA];
  const q = searchInput.value.toLowerCase();
  const statusFilter = filterSelect.value;
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // text search
  if (q) rows = rows.filter(r => matchQuery(r, q));

  // status filter
  rows = rows.filter(r => {
    if (statusFilter === "all") return true;

    const d = dateOnly(r.valid_to);
    if (!d) return false;

    const diff = Math.round((d - t0) / (24 * 60 * 60 * 1000));

    if (statusFilter === "expired") return diff < 0;
    if (statusFilter === "today") return diff === 0;
    if (statusFilter === "soon") return diff > 0 && diff <= 7;
    if (statusFilter === "1month") return diff > 7 && diff <= 30;
    if (statusFilter === "2months") return diff > 30 && diff <= 60;
    if (statusFilter === "active") return diff > 60;
    
    return true;
  });

  rows.sort(compareByValidFrom);
  filteredRows = rows;
  currentPage = 1;
  render(rows);
}


searchBtn.onclick=applySearchAndFilter;
searchInput.onkeydown=e=>{if(e.key==="Enter") applySearchAndFilter();};
filterSelect.onchange=applySearchAndFilter;
clearBtn.onclick=()=>{
  searchInput.value="";
  filterSelect.value="all";
  filteredRows=[...DATA].sort(compareByValidFrom);
  render(filteredRows);
};

/******************************************************************************
 * EXPORT FILTERS
 ******************************************************************************/
function applyExportFilters(){
  let rows=[...DATA];
  const m=filterMonth.value;
  const y=filterYear.value;
  rows=rows.filter(r=>{
    const d=dateOnly(r.valid_from);
    if(!d) return false;
    if(m!=="all" && (d.getMonth()+1)!=Number(m)) return false;
    if(y!=="all" && d.getFullYear()!=Number(y)) return false;
    return true;
  });
  rows.sort(compareByValidFrom);
  filteredRows=rows;
  render(rows);
}

function applyRangeFilter(){
  const start=Number(rangeStart.value);
  const end=Number(rangeEnd.value);
  if(!start||!end||start>end){showToast("Enter valid range");return;}
  let rows=[...DATA];
  rows=rows.filter(r=>{
    const d=dateOnly(r.valid_from);
    return d && d.getFullYear()>=start && d.getFullYear()<=end;
  });
  rows.sort(compareByValidFrom);
  filteredRows=rows;
  render(rows);
}

applyRangeBtn.onclick=applyRangeFilter;
filterMonth.onchange=applyExportFilters;
filterYear.onchange=applyExportFilters;

resetFiltersBtn.onclick=()=>{
  filterMonth.value="all";
  filterYear.value="all";
  rangeStart.value="";
  rangeEnd.value="";
  filteredRows=[...DATA].sort(compareByValidFrom);
  render(filteredRows);
};

/******************************************************************************
 * EXCEL EXPORT (Multi-Sheet + Valid_To Only)
 ******************************************************************************/
exportBtn.onclick = () => {

  const rows = [...(filteredRows.length ? filteredRows : DATA)];
  if (!rows.length) { showToast("No data"); return; }

  const currentYear = new Date().getFullYear();
  const validYears = rows.map(r => {
    const d = new Date(r.valid_to);
    return isNaN(d) ? null : d.getFullYear();
  }).filter(Boolean);

  const rawMaxYear = Math.max(...validYears);
  const maxYear = Math.min(rawMaxYear, currentYear + 5);

  const yearBuckets = [];
  for (let y = currentYear; y <= maxYear; y++) yearBuckets.push(y);
  if (rawMaxYear > maxYear) yearBuckets.push(">" + maxYear);

  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];

  const wb = XLSX.utils.book_new();

  function fmt(d) {
    if (!d) return "";
    const dd = new Date(d);
    if (isNaN(dd)) return "";
    const day = String(dd.getDate()).padStart(2,"0");
    const mon = String(dd.getMonth()+1).padStart(2,"0");
    return `${day}/${mon}/${dd.getFullYear()}`;
  }

  for (let m = 0; m < 12; m++) {
    const monthRows = rows.filter(r => {
      const d = new Date(r.valid_from);
      return !isNaN(d) && (d.getMonth() + 1) === (m + 1);
    });
    if (!monthRows.length) continue;

    monthRows.sort((a,b) => new Date(a.valid_from) - new Date(b.valid_from));

    const headers = ["Name","Designation","Token No","License No","Issue Date","Validity From", ...yearBuckets.map(String)];
    const data = [headers];

    monthRows.forEach(r => {
      const vYear = getValidityYear(r.valid_to);
      const vDate = r.valid_to || "";
      const row = [
        r.name || "",
        r.designation || "",
        r.token_no || "",
        r.license_no || "",
        fmt(r.issue_date),
        fmt(r.valid_from)
      ];
      yearBuckets.forEach(y => {
        if (typeof y === "string") row.push(vYear > maxYear ? vDate : "");
        else row.push(vYear === y ? vDate : "");
      });
      data.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = headers.map((h,i) => ({ wch: Math.max(...data.map(r => String(r[i]).length)) + 2 }));

    XLSX.utils.book_append_sheet(wb, ws, monthNames[m]);
  }

  XLSX.writeFile(wb, "License_Report.xlsx");
  showToast("Excel Exported");
};

/******************************************************************************
 * PDF EXPORT (valid_to only, A4, font=12, 30 rows/page)
 ******************************************************************************/
exportPdfBtn.onclick = () => {
  const rows = [...DATA];
  const currentYear = new Date().getFullYear();

  const validYears = rows.map(r => {
    const d = new Date(r.valid_to);
    return isNaN(d) ? null : d.getFullYear();
  }).filter(Boolean);

  if (!validYears.length) {
    showToast("No valid_to found");
    return;
  }

  const rawMaxYear = Math.max(...validYears);
  const maxYear = Math.min(rawMaxYear, currentYear + 5);

  const yearBuckets = [];
  for (let y = currentYear; y <= maxYear; y++) yearBuckets.push(String(y));
  if (rawMaxYear > maxYear) yearBuckets.push(">" + maxYear);

  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];

  const selectedMonth = filterMonth.value !== "all" ? Number(filterMonth.value) : null;
  const selectedYear = filterYear.value !== "all" ? Number(filterYear.value) : null;

  const targetMonths = selectedMonth ? [selectedMonth-1] : [...Array(12).keys()];
  const finalContent = [];
  let globalPageSize = "A4";

  targetMonths.forEach(m => {
    const monthRows = rows.filter(r => {
      const d = new Date(r.valid_from);
      if (isNaN(d)) return false;
      if (selectedYear && d.getFullYear() !== selectedYear) return false;
      return d.getMonth()+1 === (m+1);
    });

    if (!monthRows.length) return;

    monthRows.sort((a,b) => new Date(a.valid_from) - new Date(b.valid_from));

    const header = [
      "Sl", "Name", "Designation", "Token", "License", "Issue", ...yearBuckets
    ];

    const body = [header];

    monthRows.forEach((r,i) => {
      const vYear = getValidityYear(r.valid_to);
      const vDate = r.valid_to || "";
      const row = [
        i+1,
        r.name || "",
        r.designation || "",
        r.token_no || "",
        r.license_no || "",
        formatDate_DDMMYYYY(r.issue_date)
      ];
      yearBuckets.forEach(y => {
        row.push(y.includes(">") ? (vYear > maxYear ? vDate : "") : (vYear == y ? vDate : ""));
      });
      body.push(row);
    });

    const colCount = body[0].length;

    const widths = [25, 90, 70, 50, 90, 60]; // fixed base cols

    for (let i = widths.length; i < colCount; i++) widths.push("*");

    if (colCount > 10 && colCount <= 18) globalPageSize = "A3";
    if (colCount > 18 && colCount <= 26) globalPageSize = "A2";
    if (colCount > 26)                 globalPageSize = "A1";

    finalContent.push(
      { text:`License Report — ${monthNames[m]}`, style:"header", alignment:"center", margin:[0,0,0,10] },
      {
        table:{
          headerRows:1,
          widths: widths,
          body: body
        },
        layout:{
          fillColor:(rowIndex)=>rowIndex===0?"#d9e7ff":null,
          hLineWidth:()=>0.4,
          vLineWidth:()=>0.4,
          hLineColor:()=>"#aaa",
          vLineColor:()=>"#aaa"
        }
      },
      { text:"\n", pageBreak:"after" }
    );
  });

  finalContent[finalContent.length-1].pageBreak = undefined;

  const docDef = {
    pageSize: globalPageSize,
    pageOrientation:"landscape",
    pageMargins:[10,20,10,20],
    content: finalContent,
    styles:{
      header:{ fontSize:14, bold:true }
    },
    defaultStyle:{
      fontSize: globalPageSize === "A2" || globalPageSize === "A1" ? 9 : 10,
      alignment:"center"
    }
  };

  pdfMake.createPdf(docDef).download(
    selectedMonth ? `License_${monthNames[selectedMonth-1]}.pdf` : "License_All_Months.pdf"
  );

  showToast("PDF Exported");
};

/******************************************************************************
 * INIT
 ******************************************************************************/
window.onEdit=onEdit;
window.onDelete=onDelete;
loadAll();
