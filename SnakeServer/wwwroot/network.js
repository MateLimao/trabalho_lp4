// ============================================================
// network.js — COMUNICAÇÃO com o servidor (versão Aula 4, completa)
// ------------------------------------------------------------
// - conectar(): abre o WebSocket e entra no jogo (Aula 2).
// - salvarScore(): POST do score e mostra o game over com ranking (Aula 4).
// - handlers de leaderboard, gameState e torneio.
// ============================================================

var ws = null;            // o WebSocket
var handlers = {};        // callbacks por tipo de mensagem: handlers["gameState"] = fn

// Registra um callback para um tipo de mensagem vindo do servidor.
function registrarHandler(tipo, fn) {
  handlers[tipo] = fn;
}

// ------------------------------------------------------------
// Conecta ao servidor multiplayer (TODO 1 da Aula 2).
// ------------------------------------------------------------
function conectar(nome, perfil) {
  // TODO 1 (Aula 2): abrir o WebSocket e entrar no jogo.
  //
  // 1) Crie o WebSocket apontando para o mesmo host que serviu a página:
   ws = new WebSocket("ws://" + location.host + "/ws");
  //
  // 2) No ws.onopen, mande uma mensagem do tipo "entrar" com nome e perfil:
  ws.onopen = function(){
  ws.send(JSON.stringify({ tipo: "entrar", nome: nome, perfil: perfil }));
  }
  //
  // 3) No ws.onmessage, faça JSON.parse e chame o handler do tipo da mensagem:
  ws.onmessage = function (evento) {
    var msg = JSON.parse(evento.data);
    if (handlers[msg.tipo]) {
    handlers[msg.tipo](msg);
    }
  };
  //
  // 4) No ws.onclose, dê um console.log avisando que a conexão caiu.
  ws.onclose = function(){
    console.log("[rede] conexão encerrada.");
  }
}

// ------------------------------------------------------------
// Envia um evento para o servidor (ex: mudança de direção).
// ------------------------------------------------------------
function enviarParaServidor(tipo, dados) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    var msg = { tipo: tipo };
    for (var chave in dados) { if (dados.hasOwnProperty(chave)) msg[chave] = dados[chave]; }
    ws.send(JSON.stringify(msg));
  }
}

// ------------------------------------------------------------
// Salva o score no servidor e mostra o game over COM RANKING (TODO 2 da Aula 4).
// ------------------------------------------------------------
function salvarScore(nome, score) {
  // (Aula 2) Guarda um recorde local e faz o POST do score — isto já funciona.
  var rec = parseInt(localStorage.getItem("meuRecorde") || "0", 10);
  if (score > rec) localStorage.setItem("meuRecorde", score);

  fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: nome,
      score: score,
      emoji: CONFIG.emoji_cobra,
      tag: CONFIG.tag_jogador,
      cor: CONFIG.cor_multiplayer
    })
  })
  // TODO 2 (Aula 4): mostrar o game over COM RANKING.
  //   Encadeie .then() para:
  //     1) buscar o leaderboard:  return fetch("/api/leaderboard");
  //     2) ler o JSON:            return r.json();
  //     3) achar a posição do jogador (procure nome+score na lista);
  //     4) pegar o líder (lista[0].nome) e chamar:
  //          mostrarGameOverComRanking(score, posicao, lider);
  .catch(function (e) {
    console.log("[rede] erro ao salvar score:", e);
  });
}

// ------------------------------------------------------------
// Busca o leaderboard atual do servidor.
// ------------------------------------------------------------
function buscarLeaderboard(callback) {
  fetch("/api/leaderboard")
    .then(function (r) { return r.json(); })
    .then(function (lista) { callback(lista); })
    .catch(function () { callback([]); });
}

// Recorde local (reserva para a tela de game over).
function recordeLocal() {
  return parseInt(localStorage.getItem("meuRecorde") || "0", 10);
}

// ------------------------------------------------------------
// Handlers do torneio (Aula 4). atualizarTorneio e esconderTorneio
// estão definidas em ui.js.
// ------------------------------------------------------------
registrarHandler("torneio", function (msg) {
  atualizarTorneio(msg.tempoRestante, msg.top3);
});
registrarHandler("torneio_fim", function () {
  esconderTorneio();
});

// Pronto para a Aula 4 — versão completa
