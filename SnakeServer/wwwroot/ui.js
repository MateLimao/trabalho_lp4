// ============================================================
// ui.js — TELA (versão Aula 4, completa)
// Inclui: leaderboard com emoji/tag, render de jogadores remotos,
// game over com ranking, overlay de torneio e modo professor.
// ============================================================

var nomeJogador = "";

// 1) Aparência do CONFIG (cores, fontes, layout) -> variáveis CSS.
(function aplicarAparenciaDoConfig() {
  var raiz = document.documentElement.style;

  raiz.setProperty("--cor-fundo", CONFIG.cor_fundo);
  raiz.setProperty("--cor-cobra-cabeca", CONFIG.cor_cobra_cabeca);
  raiz.setProperty("--cor-comida", CONFIG.cor_comida);
  raiz.setProperty("--cor-texto", CONFIG.cor_texto);

  raiz.setProperty("--fonte-jogo", CONFIG.fonte_jogo);
  raiz.setProperty("--fonte-score", CONFIG.fonte_score);
  raiz.setProperty("--cor-texto-score", CONFIG.cor_texto_score);
  raiz.setProperty("--cor-painel", CONFIG.cor_painel);
  raiz.setProperty("--cor-botao", CONFIG.cor_botao);
  raiz.setProperty("--cor-borda-canvas", CONFIG.cor_borda_canvas);
  raiz.setProperty("--largura-borda-canvas", CONFIG.largura_borda_canvas + "px");
  raiz.setProperty("--raio-borda-canvas", CONFIG.raio_borda_canvas + "px");

  var titulo = document.querySelector("#tela-inicio h1");
  if (titulo) titulo.textContent = CONFIG.titulo_jogo;

  var telaJogo = document.getElementById("tela-jogo");
  if (telaJogo) {
    telaJogo.style.flexDirection = (CONFIG.posicao_painel === "esquerda") ? "row-reverse" : "row";
  }
})();

// 2) Tamanho do canvas a partir do CONFIG.
(function configurarCanvas() {
  var canvas = document.getElementById("canvas");
  canvas.width = CONFIG.colunas * CONFIG.tamanho_celula;
  canvas.height = CONFIG.linhas * CONFIG.tamanho_celula;
})();

// 3) Nome padrão no campo.
(function preencherNomePadrao() {
  if (CONFIG.nomepadrao && CONFIG.nomepadrao.length > 0) {
    document.getElementById("campo-nome").value = CONFIG.nomepadrao;
  }
})();

function mostrarTela(id) {
  var telas = document.getElementsByClassName("tela");
  for (var i = 0; i < telas.length; i++) telas[i].classList.add("escondido");
  document.getElementById(id).classList.remove("escondido");
}

function atualizarScore(valor, nivel) {
  document.getElementById("texto-score").textContent = valor;
  document.getElementById("texto-nivel").textContent = nivel;
}

// ── Game over simples (mantido como reserva) ──
function mostrarGameOver(score, recordeLocal) {
  document.getElementById("emoji-morte").textContent = CONFIG.emoji_morte;
  document.getElementById("texto-game-over").textContent = CONFIG.mensagem_game_over;
  document.getElementById("texto-score-final").textContent = score;
  document.getElementById("texto-recorde").textContent = recordeLocal;
  mostrarTela("tela-game-over");
}

// ── Game over COM RANKING (Aula 4) ──
function mostrarGameOverComRanking(score, posicao, lider) {
  document.getElementById("emoji-morte").textContent = CONFIG.emoji_morte;
  document.getElementById("texto-game-over").textContent = CONFIG.mensagem_game_over;
  document.getElementById("texto-score-final").textContent = score;
  document.getElementById("texto-posicao").textContent = "Você ficou em " + posicao + "º lugar";
  document.getElementById("texto-lider").textContent = "Líder: " + lider;
  mostrarTela("tela-game-over");
}

// ── Leaderboard (com emoji e tag, dados vindos do servidor) ──
function atualizarLeaderboard(lista) {
  var ul = document.getElementById("lista-leaderboard");
  ul.innerHTML = "";
  if (!lista) return;
  for (var i = 0; i < lista.length; i++) {
    var item = lista[i];
    var li = document.createElement("li");
    var emoji = item.emoji || "🐍";
    var tag = item.tag ? "<span class='tag'>" + item.tag + "</span>" : "";
    li.innerHTML =
      "<span>" + (i + 1) + ". " + emoji + " " + item.nome + tag + "</span>" +
      "<span>" + item.score + "</span>";
    ul.appendChild(li);
  }
}

// ── Render dos jogadores remotos: repassa para o game.js desenhar ──
function renderizarJogadores(jogadores) {
  desenharJogadoresRemotos(jogadores);
}

// ── Overlay de torneio (Aula 4) ──
function atualizarTorneio(tempoRestante, top3) {
  var overlay = document.getElementById("torneio-overlay");
  overlay.classList.remove("escondido");

  if (tempoRestante < 0) tempoRestante = 0;
  var min = Math.floor(tempoRestante / 60);
  var seg = tempoRestante % 60;
  document.getElementById("torneio-countdown").textContent =
    min + ":" + (seg < 10 ? "0" + seg : seg);

  var ol = document.getElementById("torneio-top3");
  ol.innerHTML = "";
  if (top3) {
    for (var i = 0; i < top3.length; i++) {
      var p = top3[i];
      var li = document.createElement("li");
      var tag = p.tag ? " [" + p.tag + "]" : "";
      li.textContent = (i + 1) + "º " + (p.emoji || "🐍") + " " + p.nome + tag + " — " + p.score;
      ol.appendChild(li);
    }
  }
}

function esconderTorneio() {
  document.getElementById("torneio-overlay").classList.add("escondido");
}

// ── Modo professor: ?professor=1 mostra o botão de iniciar torneio ──
function verificarModoProfessor() {
  if (location.search.indexOf("professor=1") !== -1) {
    var btn = document.getElementById("btn-torneio");
    btn.classList.remove("escondido");
    btn.addEventListener("click", function () {
      fetch("/api/torneio/iniciar", { method: "POST" });
    });
  }
}

// ── Botões ──
document.getElementById("btn-jogar").addEventListener("click", function () {
  var nome = document.getElementById("campo-nome").value.trim();
  if (nome.length === 0) { alert("Digite um nome para jogar!"); return; }
  nomeJogador = nome;
  document.getElementById("texto-nome").textContent = nome;
  iniciarJogo();
});

document.getElementById("btn-reiniciar").addEventListener("click", function () {
  iniciarJogo();
});

// ── Registro de handlers (depois que network.js carregou) ──
window.addEventListener("load", function () {
  registrarHandler("leaderboard", function (msg) { atualizarLeaderboard(msg.lista); });
  registrarHandler("gameState", function (msg) { renderizarJogadores(msg.jogadores); });
  verificarModoProfessor();
});

// Pronto para a Aula 4 — versão completa
