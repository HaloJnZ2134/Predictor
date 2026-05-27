async function saveRound(data){
    await fetch("http://localhost:3000/save-round", {
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(data)
    });
}

document.getElementById("verify").onclick = async () => {

    const clientSeed = document.getElementById("clientSeed").value.trim();
    const serverSeed = document.getElementById("serverSeed").value.trim();
    const nonce = document.getElementById("nonce").value.trim();
    const minesCount = parseInt(document.getElementById("minesAmount").value);
    const gridSize = parseInt(document.getElementById("gridSize").value);

    if(!clientSeed || !serverSeed || !nonce) return;

    const minefield = [];
    for(let i=0;i<gridSize;i++){
        minefield[i] = i < minesCount ? "BOMB" : "SAFE";
    }

    const mineLocations = getMineLocations(
        clientSeed,
        serverSeed,
        nonce,
        [...minefield]
    );

    // 🔥 SEND TO DATABASE
    await saveRound({
        clientSeed,
        serverSeed,
        nonce,
        minesCount,
        gridSize,
        mineLocations,
        timestamp:Date.now()
    });

    renderBoard(gridSize);

    for(let i=0;i<gridSize;i++){
        const tile = document.getElementById(`tile-${i}`);

        if(minefield[i] === "BOMB"){
            tile.style.background = "#ef4444";
        } else {
            tile.style.background = "#22c55e";
        }

        tile.innerText = i;
    }

    showAlert("Round saved to database ✔");
};
