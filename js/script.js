 const boardElement = document.getElementById('chessboard');
const statusElement = document.getElementById('status');
const promoOverlay = document.getElementById('promotion-overlay');
const promoOptions = document.getElementById('promo-options');

let board = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let selectedSquare = null;
let possibleMoves = [];
let turn = 'white';
let pendingPromotion = null; // Stocke les coordonnées du pion à promouvoir

const isWhite = (p) => '♖♘♗♕♔♙'.includes(p);
const isBlack = (p) => '♜♞♝♛♚♟'.includes(p);

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.className = `square ${(r + c) % 2 === 0 ? 'white-sq' : 'black-sq'}`;
            if (selectedSquare && selectedSquare.r === r && selectedSquare.c === c) square.classList.add('selected');
            if (possibleMoves.some(m => m.r === r && m.c === c)) square.classList.add('possible-move');
            square.textContent = board[r][c];
            square.onclick = () => handleSquareClick(r, c);
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    if (pendingPromotion) return; // Bloque le jeu pendant la promotion

    if (possibleMoves.some(m => m.r === r && m.c === c)) {
        const piece = board[selectedSquare.r][selectedSquare.c];
        executeMove(selectedSquare.r, selectedSquare.c, r, c);
        
        // Vérifier la promotion
        if ((piece === '♙' && r === 0) || (piece === '♟' && r === 7)) {
            showPromotionMenu(r, c, turn);
        } else {
            finalizeTurn();
        }
        return;
    }

    const piece = board[r][c];
    if (piece && ((turn === 'white' && isWhite(piece)) || (turn === 'black' && isBlack(piece)))) {
        selectedSquare = { r, c };
        possibleMoves = getValidMoves(r, c);
    } else {
        selectedSquare = null;
        possibleMoves = [];
    }
    renderBoard();
}

function showPromotionMenu(r, c, color) {
    pendingPromotion = { r, c };
    promoOverlay.style.display = 'block';
    const choices = color === 'white' ? ['♕', '♖', '♗', '♘'] : ['♛', '♜', '♝', '♞'];
    
    promoOptions.innerHTML = '';
    choices.forEach(p => {
        const span = document.createElement('span');
        span.className = 'promo-choice';
        span.textContent = p;
        span.onclick = () => selectPromotion(p);
        promoOptions.appendChild(span);
    });
}

function selectPromotion(piece) {
    board[pendingPromotion.r][pendingPromotion.c] = piece;
    promoOverlay.style.display = 'none';
    pendingPromotion = null;
    finalizeTurn();
}

function finalizeTurn() {
    selectedSquare = null;
    possibleMoves = [];
    turn = turn === 'white' ? 'black' : 'white';

    const gameState = isCheckmate(turn);

    if (gameState === "MAT") {
        announceWinner(turn === 'white' ? 'black' : 'white'); // L'autre a gagné
    } else if (gameState === "PAT") {
        announceWinner("PAT");
    } else {
        // Jeu normal : on met à jour le texte du tour
        statusElement.textContent = `Tour : ${turn === 'white' ? 'Blancs' : 'Noirs'}`;
        renderBoard();
    }
}

function announceWinner(winner) {
    const overlay = document.getElementById('winner-overlay');
    const winText = document.getElementById('winner-text');
    
    overlay.style.display = 'flex'; // Affiche le flou et la modale
    if (winner === "PAT") {
        winText.textContent = "Match Nul !";
    } else {
        winText.textContent = `Victoire des ${winner === 'white' ? 'Blancs' : 'Noirs'} !`;
    }
    renderBoard(); // Pour bien voir le dernier coup derrière le flou
}

function getValidMoves(fR, fC) {
    let moves = [];
    const piece = board[fR][fC];
    const color = isWhite(piece) ? 'white' : 'black';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // 1. On vérifie si le mouvement est théoriquement possible pour la pièce
            if (isValidMove(fR, fC, r, c)) {
                
                // 2. SIMULATION : On teste le coup sur un faux plateau
                const originalTarget = board[r][c];
                board[r][c] = board[fR][fC];
                board[fR][fC] = '';

                const kingPos = findKing(color);
                const opponentColor = color === 'white' ? 'black' : 'white';
                
                // 3. On vérifie si le roi est attaqué après ce coup
                const isKingSafe = !isSquareAttacked(kingPos.r, kingPos.c, opponentColor);

                // 4. ANNULATION : On remet les pièces en place
                board[fR][fC] = board[r][c];
                board[r][c] = originalTarget;

                // 5. On n'ajoute le mouvement que s'il est sûr
                if (isKingSafe) {
                    moves.push({ r, c });
                }
            }
        }
    }
    return moves;
}

// (La fonction isValidMove et isPathClear restent les mêmes que précédemment)
function isValidMove(fR, fC, tR, tC) {
    const p = board[fR][fC];
    const target = board[tR][tC];
    const dr = tR - fR;
    const dc = tC - fC;
    if (fR === tR && fC === tC) return false;
    if (target && ((isWhite(p) && isWhite(target)) || (isBlack(p) && isBlack(target)))) return false;
    const type = p.toLowerCase();
    if (type === '♙' || type === '♟') {
        const dir = isWhite(p) ? -1 : 1;
        if (dc === 0 && target === '' && dr === dir) return true;
        if (dc === 0 && target === '' && fR === (isWhite(p)?6:1) && dr === 2*dir && board[fR+dir][fC] === '') return true;
        if (Math.abs(dc) === 1 && dr === dir && target !== '') return true;
        return false;
    }
    if (type === '♖' || type === '♜') return (dr === 0 || dc === 0) && isPathClear(fR, fC, tR, tC);
    if (type === '♘' || type === '♞') return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    if (type === '♗' || type === '♝') return Math.abs(dr) === Math.abs(dc) && isPathClear(fR, fC, tR, tC);
    if (type === '♕' || type === '♛') return (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) && isPathClear(fR, fC, tR, tC);
    if (type === '♔' || type === '♚') return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
    return false;
}

function isPathClear(fR, fC, tR, tC) {
    const stepR = tR > fR ? 1 : (tR < fR ? -1 : 0);
    const stepC = tC > fC ? 1 : (tC < fC ? -1 : 0);
    let currR = fR + stepR;
    let currC = fC + stepC;
    while (currR !== tR || currC !== tC) {
        if (board[currR][currC] !== '') return false;
        currR += stepR;
        currC += stepC;
    }
    return true;
}

function executeMove(fR, fC, tR, tC) {
    board[tR][tC] = board[fR][fC];
    board[fR][fC] = '';
}

// Trouve la position du roi d'une certaine couleur
function findKing(color) {
    const kingChar = color === 'white' ? '♔' : '♚';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingChar) return { r, c };
        }
    }
    return null;
}

// Vérifie si une case (row, col) est attaquée par l'adversaire
function isSquareAttacked(row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '') continue;
            
            const pieceColor = isWhite(piece) ? 'white' : 'black';
            if (pieceColor === attackerColor) {
                // On utilise la fonction isValidMove existante
                if (isValidMove(r, c, row, col)) return true;
            }
        }
    }
    return false;
}

// Vérifie si le joueur actuel n'a PLUS AUCUN mouvement légal
function isCheckmate(color) {
    const opponentColor = color === 'white' ? 'black' : 'white';
    const kingPos = findKing(color);
    
    // Si le roi n'est pas en échec, ce n'est pas un mat (ça pourrait être un pat)
    const inCheck = isSquareAttacked(kingPos.r, kingPos.c, opponentColor);

    // Tester tous les mouvements possibles pour toutes les pièces de la couleur
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (color === 'white' ? !isWhite(piece) : !isBlack(piece))) continue;

            for (let tr = 0; tr < 8; tr++) {
                for (let tc = 0; tc < 8; tc++) {
                    if (isValidMove(r, c, tr, tc)) {
                        // Simuler le mouvement
                        const tempTarget = board[tr][tc];
                        board[tr][tc] = board[r][c];
                        board[r][c] = '';
                        
                        const newKingPos = findKing(color);
                        const stillInCheck = isSquareAttacked(newKingPos.r, newKingPos.c, opponentColor);

                        // Annuler la simulation
                        board[r][c] = board[tr][tc];
                        board[tr][tc] = tempTarget;

                        if (!stillInCheck) return false; // Il existe au moins un coup libérateur
                    }
                }
            }
        }
    }
    return inCheck ? "MAT" : "PAT"; // Si aucun coup n'est possible
}


renderBoard();
function viewBoard() {
    // On cache la carte centrale (le message de victoire)
    document.getElementById('winner-card').style.display = 'none';
    
    // On montre le bouton "Retour au menu" en bas de l'écran
    document.getElementById('return-to-menu').style.display = 'block';
    
    // On garde l'overlay (pour le flou), mais on permet de voir à travers
    // On peut même baisser un peu le flou si on veut mieux voir
    document.getElementById('winner-overlay').style.backdropFilter = 'blur(3px)';
}

function showWinnerMenu() {
    // On réaffiche la carte de victoire
    document.getElementById('winner-card').style.display = 'block';
    
    // On cache le bouton de retour
    document.getElementById('return-to-menu').style.display = 'none';
    
    // On remet le flou normal
    document.getElementById('winner-overlay').style.backdropFilter = 'blur(8px)';
}


function announceWinner(winner) {
    const overlay = document.getElementById('winner-overlay');
    const boardWrapper = document.getElementById('board-wrapper');
    const winText = document.getElementById('winner-text');

    // 1. On affiche l'overlay (fond sombre + carte)
    overlay.style.display = 'flex';
    
    // 2. On ajoute le flou sur l'échiquier
    boardWrapper.classList.add('blurred');

    if (winner === "PAT") {
        winText.textContent = "Match Nul !";
    } else {
        winText.textContent = `Victoire des ${winner === 'white' ? 'Blancs' : 'Noirs'} !`;
    }
}

function viewBoard() {
    // 1. On cache l'overlay (fond sombre et carte) pour voir l'échiquier
    document.getElementById('winner-overlay').style.display = 'none';
    
    // 2. On retire le flou de l'échiquier
    document.getElementById('board-wrapper').classList.remove('blurred');
    
    // 3. On affiche le bouton de retour en bas
    document.getElementById('return-to-menu').style.display = 'block';
}

function showWinnerMenu() {
    // 1. On remet l'overlay
    document.getElementById('winner-overlay').style.display = 'flex';
    
    // 2. On remet le flou sur l'échiquier
    document.getElementById('board-wrapper').classList.add('blurred');
    
    // 3. On cache le bouton de retour
    document.getElementById('return-to-menu').style.display = 'none';
}

function resetGame() {
    // Redémarre tout
    location.reload();
}