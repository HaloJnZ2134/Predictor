const STORAGE_KEY = "bloxAnalyzer.v2";

const seedData = JSON.parse(document.getElementById("seed-data").textContent);

let state = loadState();

function loadState(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){
    try {
      const parsed = JSON.parse(saved);
      return {
        minesHistory: parsed.minesHistory || [],
        towersHistory: parsed.towersHistory || [],
        slideHistory: parsed.slideHistory || []
      };
    } catch {
      return normalize(seedData);
    }
  }
  return normalize(seedData);
}

function normalize(data){
  return {
    minesHistory: data.minesHistory || [],
    towersHistory: data.towersHistory || [],
    slideHistory: data.slideHistory || []
  };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function percent(value){
  return `${(value * 100).toFixed(1)}%`;
}

function clamp(n,min,max){
  return Math.max(min, Math.min(max, n));
}

function countItems(items){
  return items.reduce((map, item) => {
    map[item] = (map[item] || 0) + 1;
    return map;
  }, {});
}

function tabTo(mode){
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  document.getElementById(`${mode}View`).classList.add("active");
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => tabTo(btn.dataset.mode));
});

function analyzeMines(){
  const total = state.minesHistory.length;
  const counts = Array(26).fill(0);

  state.minesHistory.forEach(round => {
    round.forEach(tile => {
      const n = Number(tile);
      if(n >= 1 && n <= 25) counts[n]++;
    });
  });

  const ranked = Array.from({length:25}, (_,i) => {
    const tile = i + 1;
    const appearances = counts[tile];
    const risk = total ? appearances / total : 0;
    return { tile, appearances, risk };
  }).sort((a,b) => a.risk - b.risk || a.tile - b.tile);

  const maxRisk = Math.max(...ranked.map(x => x.risk), 0.01);
  const grid = document.getElementById("minesGrid");
  grid.innerHTML = "";

  for(let tile = 1; tile <= 25; tile++){
    const risk = total ? counts[tile] / total : 0;
    const intensity = clamp(risk / maxRisk, 0, 1);
    const hue = 145 - (145 * intensity);
    const div = document.createElement("div");
    div.className = "tile";
    div.style.background = `linear-gradient(145deg, hsla(${hue}, 72%, 45%, .92), rgba(255,255,255,.05))`;
    div.innerHTML = `<b>#${tile}</b><span>${total ? percent(risk) : "0.0%"}</span><span>${counts[tile]} hits</span>`;
    grid.appendChild(div);
  }

  const picks = ranked.slice(0, 5);
  const avgRisk = picks.slice(0,3).reduce((s,x)=>s+x.risk,0) / Math.max(1, Math.min(3,picks.length));

  document.getElementById("minesRecommendation").innerHTML = `
    <h3>Recommended tiles</h3>
    <div class="pick-list">${picks.map(x => `<span class="pick">#${x.tile} · ${percent(x.risk)}</span>`).join("")}</div>
    <span class="confidence">Avg top-3 risk: ${percent(avgRisk)}</span>
    <p class="muted">Best current 3: ${picks.slice(0,3).map(x => "#" + x.tile).join(", ")}</p>
  `;

  return {
    mode:"Mines",
    sample: total,
    strength: total ? (1 - avgRisk) * Math.min(1, total / 100) : 0,
    reason: total ? `${total} rounds, top tiles average ${percent(avgRisk)} mine frequency.` : "No Mines data yet."
  };
}

function analyzeTowers(){
  const total = state.towersHistory.length;
  const grid = document.getElementById("towersGrid");
  grid.innerHTML = "";

  const path = [];
  const confidences = [];

  for(let floor = 0; floor < 8; floor++){
    const entries = state.towersHistory.map(round => String(round[floor] || "").toUpperCase()).filter(x => ["L","M","R"].includes(x));
    const counts = {L:0,M:0,R:0};
    entries.forEach(x => counts[x]++);

    const best = Object.entries(counts).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))[0];
    path.push(best[0]);
    confidences.push(total ? best[1] / total : 0);

    const label = document.createElement("div");
    label.className = "floor-label";
    label.textContent = `Floor ${floor + 1}`;
    grid.appendChild(label);

    ["L","M","R"].forEach(side => {
      const cell = document.createElement("div");
      cell.className = `tower-cell ${side === best[0] ? "best" : ""}`;
      cell.innerHTML = `<b>${side}</b><span>${counts[side]} hits</span><span>${total ? percent(counts[side]/total) : "0.0%"}</span>`;
      grid.appendChild(cell);
    });
  }

  const avgConfidence = confidences.reduce((s,x)=>s+x,0) / Math.max(1, confidences.length);
  document.getElementById("towersRecommendation").innerHTML = `
    <h3>Recommended path</h3>
    <div class="pick-list">${path.map((x,i)=>`<span class="pick">F${i+1}: ${x}</span>`).join("")}</div>
    <span class="confidence">Avg path confidence: ${percent(avgConfidence)}</span>
  `;

  return {
    mode:"Towers",
    sample: total,
    strength: total ? avgConfidence * Math.min(1, total / 60) : 0,
    reason: total ? `${total} paths, average strongest-floor frequency ${percent(avgConfidence)}.` : "No Towers data yet."
  };
}

function analyzeSlide(){
  const total = state.slideHistory.length;
  const counts = countItems(state.slideHistory.map(x => String(x).trim().toLowerCase()).filter(Boolean));
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]));

  const grid = document.getElementById("slideGrid");
  grid.innerHTML = "";

  if(entries.length === 0){
    grid.innerHTML = `<div class="slide-card"><b>No Slide data</b><span>Add outcomes first</span></div>`;
    document.getElementById("slideRecommendation").innerHTML = `
      <h3>No recommendation yet</h3>
      <p class="muted">Add Slide outcomes like red, blue, green, yellow, etc. Then this mode will rank them.</p>
    `;
    return { mode:"Slide", sample:0, strength:0, reason:"No Slide data yet." };
  }

  const best = entries[0];
  entries.forEach(([name, count]) => {
    const card = document.createElement("div");
    card.className = `slide-card ${name === best[0] ? "best" : ""}`;
    card.innerHTML = `<b>${name.toUpperCase()}</b><span>${count} hits</span><span>${percent(count/total)}</span>`;
    grid.appendChild(card);
  });

  const bestRate = best[1] / total;
  document.getElementById("slideRecommendation").innerHTML = `
    <h3>Recommended outcome</h3>
    <div class="pick-list"><span class="pick">${best[0].toUpperCase()} · ${percent(bestRate)}</span></div>
    <span class="confidence">Signal strength: ${percent(bestRate)}</span>
    <p class="muted">Add more rounds before trusting this number. Small samples are statistical gremlins.</p>
  `;

  return {
    mode:"Slide",
    sample: total,
    strength: bestRate * Math.min(1, total / 60),
    reason: `${total} Slide outcomes, ${best[0].toUpperCase()} is most common at ${percent(bestRate)}.`
  };
}

function updateBestMode(scores){
  const usable = scores.filter(x => x.sample > 0).sort((a,b)=>b.strength-a.strength);
  const best = usable[0];

  document.getElementById("bestMode").textContent = best ? best.mode : "No data";
  document.getElementById("bestModeReason").textContent = best ? best.reason : "Import or add rounds first.";

  if(best){
    document.querySelectorAll(".tab").forEach(btn => {
      btn.dataset.recommended = btn.textContent.trim() === best.mode ? "true" : "false";
    });
  }
}

function updateCounts(){
  document.getElementById("minesCount").textContent = state.minesHistory.length;
  document.getElementById("towersCount").textContent = state.towersHistory.length;
  document.getElementById("slideCount").textContent = state.slideHistory.length;
}

function updateDataPreview(){
  document.getElementById("dataPreview").textContent = JSON.stringify(state, null, 2);
}

function refresh(){
  updateCounts();
  const scores = [analyzeMines(), analyzeTowers(), analyzeSlide()];
  updateBestMode(scores);
  updateDataPreview();
  saveState();
}

document.getElementById("minesForm").addEventListener("submit", e => {
  e.preventDefault();
  const values = document.getElementById("minesInput").value
    .split(",")
    .map(x => Number(x.trim()))
    .filter(x => Number.isInteger(x) && x >= 1 && x <= 25);

  if(values.length === 0) return;
  state.minesHistory.push(values);
  document.getElementById("minesInput").value = "";
  refresh();
});

document.getElementById("towersForm").addEventListener("submit", e => {
  e.preventDefault();
  const values = document.getElementById("towersInput").value
    .split(",")
    .map(x => x.trim().toUpperCase())
    .filter(x => ["L","M","R"].includes(x))
    .slice(0,8);

  if(values.length === 0) return;
  state.towersHistory.push(values);
  document.getElementById("towersInput").value = "";
  refresh();
});

document.getElementById("slideForm").addEventListener("submit", e => {
  e.preventDefault();
  const value = document.getElementById("slideInput").value.trim().toLowerCase();
  if(!value) return;
  state.slideHistory.push(value);
  document.getElementById("slideInput").value = "";
  refresh();
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "analyzer-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById("importFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalize(JSON.parse(reader.result));
      refresh();
      tabTo("data");
    } catch {
      alert("That JSON file could not be imported.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  const ok = confirm("Reset all saved browser data for this analyzer?");
  if(!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = normalize(seedData);
  refresh();
});

refresh();
