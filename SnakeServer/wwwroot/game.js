// ============================================================
// game.js — LÓGICA do jogo (versão Aula 2: agora com multiplayer)
// ------------------------------------------------------------
// Tudo da Aula 1 continua aqui (a SUA cobra é simulada localmente).
// O que mudou:
//   - ao iniciar, conectamos ao servidor enviando o nosso PERFIL;
//   - mandamos a direção do teclado para o servidor;
//   - desenhamos as cobras dos OUTROS jogadores que o servidor manda.
// ============================================================

// ── Configuração lida do CONFIG ──
var VELOCIDADE = CONFIG.velocidade_inicial;
var TAMANHO = CONFIG.tamanho_celula;
var COLUNAS = CONFIG.colunas;
var LINHAS = CONFIG.linhas;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// ── Estado do jogo ──
var cobra, direcao, proximaDirecao, comida, comidaEspecial;
var score, nivel, jogoAtivo, escudoAtivo, intervalo, contadorComidas;

// Cobras dos outros jogadores, recebidas do servidor (gameState).
var jogadoresRemotos = [];

// ============================================================
// FUNÇÕES QUE VOCÊ PODE PERSONALIZAR (iguais à Aula 1)
// ============================================================
function minhaPontuacao(especial) {
  return especial ? CONFIG.pontos_por_comida * 3 : CONFIG.pontos_por_comida;
}
function minhaVelocidade(nivelAtual) {
  var nova = CONFIG.velocidade_inicial - (nivelAtual * CONFIG.reducao_por_nivel);
  return Math.max(nova, CONFIG.velocidade_minima);
}
function minhaMecanicaExtra() { }
function comportamentoDeBorda(cabeca) {
  if (!CONFIG.wraparound) return null;
  return { x: (cabeca.x + COLUNAS) % COLUNAS, y: (cabeca.y + LINHAS) % LINHAS };
}

// ============================================================
// MULTIPLAYER: monta o perfil que será enviado ao servidor.
// É aqui que a personalização da Aula 1 vira identidade no multiplayer.
// ============================================================
function montarPerfil() {
  return {
    cor: CONFIG.cor_multiplayer,   // "" = o servidor gera uma cor pelo nome
    emoji: CONFIG.emoji_cobra,
    tag: CONFIG.tag_jogador
  };
}

// ============================================================
// CICLO DE VIDA DO JOGO
// ============================================================
function iniciarJogo() {
  var meioX = Math.floor(COLUNAS / 2);
  var meioY = Math.floor(LINHAS / 2);
  cobra = [
    { x: meioX, y: meioY },
    { x: meioX - 1, y: meioY },
    { x: meioX - 2, y: meioY }
  ];
  direcao = "direita";
  proximaDirecao = "direita";
  score = 0;
  nivel = 0;
  contadorComidas = 0;
  jogoAtivo = true;
  VELOCIDADE = CONFIG.velocidade_inicial;

  escudoAtivo = CONFIG.escudo_apos_respawn;
  if (escudoAtivo) setTimeout(function () { escudoAtivo = false; }, 3000);

  gerarComida();
  atualizarScore(score, nivel);
  mostrarTela("tela-jogo");

  // Conecta ao servidor multiplayer enviando o nosso perfil personalizado.
  conectar(nomeJogador, montarPerfil());

  if (intervalo) clearInterval(intervalo);
  intervalo = setInterval(tick, VELOCIDADE);
}

function tick() {
  direcao = proximaDirecao;
  moverCobra();
  if (!jogoAtivo) return;
  if (!escudoAtivo && verificarColisao()) { encerrarJogo(); return; }
  if (cobra[0].x === comida.x && cobra[0].y === comida.y) comerComida(comidaEspecial);
  desenhar();
  minhaMecanicaExtra();
}

function comerComida(especial) {
  score += minhaPontuacao(especial);
  contadorComidas++;
  if (CONFIG.acelerar_a_cada > 0 && contadorComidas % CONFIG.acelerar_a_cada === 0) {
    nivel++;
    VELOCIDADE = minhaVelocidade(nivel);
    clearInterval(intervalo);
    intervalo = setInterval(tick, VELOCIDADE);
  }
  var cauda = cobra[cobra.length - 1];
  cobra.push({ x: cauda.x, y: cauda.y });
  gerarComida();
  atualizarScore(score, nivel);
}

function encerrarJogo() {
  jogoAtivo = false;
  clearInterval(intervalo);
  salvarScore(nomeJogador, score);   // na Aula 2 isto faz POST /api/score
  mostrarGameOver(score, recordeLocal());
}

// ============================================================
// DESENHO
// ============================================================
function desenhar() {
  ctx.fillStyle = CONFIG.cor_fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (CONFIG.cor_grade !== "transparent") {
    ctx.strokeStyle = CONFIG.cor_grade;
    ctx.lineWidth = 1;
    for (var c = 0; c <= COLUNAS; c++) {
      ctx.beginPath(); ctx.moveTo(c * TAMANHO, 0); ctx.lineTo(c * TAMANHO, canvas.height); ctx.stroke();
    }
    for (var l = 0; l <= LINHAS; l++) {
      ctx.beginPath(); ctx.moveTo(0, l * TAMANHO); ctx.lineTo(canvas.width, l * TAMANHO); ctx.stroke();
    }
  }

  // Cobras dos OUTROS jogadores, por baixo da nossa.
  desenharJogadoresRemotos();

  // Comida
  if (comidaEspecial) { ctx.fillStyle = CONFIG.cor_comida_especial; desenharCelula(comida.x, comida.y, 0); }
  else { ctx.fillStyle = CONFIG.cor_comida; desenharCelula(comida.x, comida.y, 3); }

  // Nossa cobra
  if (escudoAtivo) ctx.globalAlpha = (Math.floor(Date.now() / 200) % 2 === 0) ? 1 : 0.3;
  for (var i = 0; i < cobra.length; i++) {
    ctx.fillStyle = (i === 0) ? CONFIG.cor_cobra_cabeca : CONFIG.cor_cobra_corpo;
    desenharCelula(cobra[i].x, cobra[i].y, 1);
  }
  ctx.globalAlpha = 1;
}

function desenharCelula(x, y, margem) {
  ctx.fillRect(x * TAMANHO + margem, y * TAMANHO + margem, TAMANHO - margem * 2, TAMANHO - margem * 2);
}

// ============================================================
// TECLADO — também avisa o servidor da direção escolhida.
// ============================================================
document.addEventListener("keydown", function (e) {
  var t = e.key.toLowerCase();
  var antes = proximaDirecao;
  if ((t === "arrowup"    || t === "w") && direcao !== "baixo")    proximaDirecao = "cima";
  if ((t === "arrowdown"  || t === "s") && direcao !== "cima")     proximaDirecao = "baixo";
  if ((t === "arrowleft"  || t === "a") && direcao !== "direita")  proximaDirecao = "esquerda";
  if ((t === "arrowright" || t === "d") && direcao !== "esquerda") proximaDirecao = "direita";

  // Se a direção mudou, manda para o servidor (a função existe na Aula 2).
  if (proximaDirecao !== antes) {
    enviarParaServidor("direcao", { direcao: proximaDirecao });
  }
});

// ============================================================
// FUNÇÕES DA AULA 1 (já resolvidas)
// ============================================================
function moverCobra() {
  var dx = 0, dy = 0;
  if (direcao === "cima") dy = -1;
  if (direcao === "baixo") dy = 1;
  if (direcao === "esquerda") dx = -1;
  if (direcao === "direita") dx = 1;

  var cabeca = cobra[0];
  var nova = { x: cabeca.x + dx, y: cabeca.y + dy };

  var fora = (nova.x < 0 || nova.x >= COLUNAS || nova.y < 0 || nova.y >= LINHAS);
  if (fora) {
    var r = comportamentoDeBorda(nova);
    if (r === null) { encerrarJogo(); return; }
    nova = r;
  }
  cobra.unshift(nova);
  cobra.pop();
}

function verificarColisao() {
  var cabeca = cobra[0];
  if (!CONFIG.wraparound) {
    if (cabeca.x < 0 || cabeca.x >= COLUNAS || cabeca.y < 0 || cabeca.y >= LINHAS) return true;
  }
  for (var i = 1; i < cobra.length; i++) {
    if (cobra[i].x === cabeca.x && cobra[i].y === cabeca.y) return true;
  }
  return false;
}

function gerarComida() {
  var pos, emCima;
  do {
    pos = { x: Math.floor(Math.random() * COLUNAS), y: Math.floor(Math.random() * LINHAS) };
    emCima = false;
    for (var i = 0; i < cobra.length; i++) {
      if (cobra[i].x === pos.x && cobra[i].y === pos.y) { emCima = true; break; }
    }
  } while (emCima);
  comida = pos;
  comidaEspecial = Math.random() < CONFIG.chance_comida_especial;
}

// ============================================================
// DESAFIO DA AULA 2 — TODO 4
// Desenha as cobras dos OUTROS jogadores usando o perfil de cada um.
// ============================================================
function desenharJogadoresRemotos(jogadores) {
  // Se chamada com novos dados, guarda-os. Senão, redesenha os últimos.
  if (jogadores) jogadoresRemotos = jogadores;

  // TODO 4 (Aula 2): desenhar as cobras dos OUTROS jogadores.
  //
  // Para cada 'jog' em jogadoresRemotos:
  //   - PULE a sua própria cobra:   if (jog.nome === nomeJogador) continue;
  //   - var segs = jog.segmentos;   (lista de {x, y})
  //   1) Corpo: ctx.fillStyle = jog.perfil.cor;  e desenhe cada segmento com
  //        ctx.fillRect(seg.x*TAMANHO+1, seg.y*TAMANHO+1, TAMANHO-2, TAMANHO-2);
  //   2) Emoji acima da cabeça (segs[0]) com ctx.fillText(jog.perfil.emoji, px, py);
  //        px = cabeca.x*TAMANHO + TAMANHO/2;  py = cabeca.y*TAMANHO;
  //        (defina ctx.font = TAMANHO + "px sans-serif"; e ctx.textAlign = "center";)
  //   3) Nome e tag abaixo do emoji com outro ctx.fillText.
  //
  // Enquanto não implementar, você joga sozinho (as outras cobras não aparecem).
}

// Scaffold da Aula 2 — implemente o TODO 4 acima
