// ============================================================
// game.js — a LÓGICA do jogo Snake (Aula 1)
// ------------------------------------------------------------
// Aqui mora a "vida" da cobra: como ela anda, como come, como morre.
// As partes que você implementa nos desafios estão marcadas com // TODO.
// ============================================================

// ── Configuração lida do CONFIG (nada de valores hardcoded aqui!) ──
var VELOCIDADE = CONFIG.velocidade_inicial;
var TAMANHO = CONFIG.tamanho_celula;
var COLUNAS = CONFIG.colunas;
var LINHAS = CONFIG.linhas;

// ── Canvas ──
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// ── Estado do jogo ──
var cobra;            // array de {x, y}. cobra[0] é a cabeça.
var direcao;          // direção atual: "cima", "baixo", "esquerda", "direita"
var proximaDirecao;   // direção escolhida pelo teclado, aplicada no próximo tick
var comida;           // posição da comida {x, y}
var comidaEspecial;   // true se a comida atual é especial (vale 3x)
var score;
var nivel;            // nível de aceleração (0 = velocidade inicial)
var jogoAtivo;        // true enquanto o jogo está rodando
var escudoAtivo;      // true durante o escudo pós-respawn (não morre)
var intervalo;        // id do setInterval do loop do jogo
var contadorComidas;  // quantas comidas a cobra já comeu

// ============================================================
// FUNÇÕES QUE VOCÊ PODE PERSONALIZAR
// Estas funções já funcionam com o comportamento padrão.
// Você pode mudá-las para criar mecânicas únicas no seu jogo.
// ============================================================

// Retorna quantos pontos vale cada comida.
// Padrão: comida normal = CONFIG.pontos_por_comida, especial = 3x mais.
function minhaPontuacao(especial) {
  return especial ? CONFIG.pontos_por_comida * 3 : CONFIG.pontos_por_comida;
}

// Retorna a velocidade atual (ms) baseada no nível de aceleração.
// Padrão: reduz CONFIG.reducao_por_nivel ms a cada nível, sem passar do mínimo.
function minhaVelocidade(nivelAtual) {
  var novaVelocidade = CONFIG.velocidade_inicial - (nivelAtual * CONFIG.reducao_por_nivel);
  return Math.max(novaVelocidade, CONFIG.velocidade_minima);
}

// Chamada uma vez por tick, depois que tudo já foi processado.
// Padrão: não faz nada. Adicione efeitos extras aqui se quiser.
function minhaMecanicaExtra() {
  // Exemplo: spawnar obstáculos, mudar a comida de lugar, etc.
}

// Define o que acontece quando a cabeça passa da borda.
// Padrão: mata a cobra (retorna null). Se CONFIG.wraparound = true,
// teleporta a cobra para o lado oposto.
function comportamentoDeBorda(cabeca) {
  if (!CONFIG.wraparound) {
    return null; // null = colidiu, o jogo encerra
  }
  return {
    x: (cabeca.x + COLUNAS) % COLUNAS,
    y: (cabeca.y + LINHAS) % LINHAS
  };
}

// ============================================================
// CICLO DE VIDA DO JOGO
// ============================================================

// Inicia (ou reinicia) uma partida: zera o estado e liga o loop.
function iniciarJogo() {
  // Cobra começa com 3 segmentos no centro, andando para a direita.
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

  // Escudo pós-respawn: pisca por 3 segundos sem poder morrer.
  escudoAtivo = CONFIG.escudo_apos_respawn;
  if (escudoAtivo) {
    setTimeout(function () { escudoAtivo = false; }, 3000);
  }

  gerarComida();
  atualizarScore(score, nivel);
  mostrarTela("tela-jogo");

  // Aula 2: conectar ao servidor multiplayer entra aqui.
  conectar(nomeJogador, null);

  // Liga o loop do jogo: tick() roda a cada VELOCIDADE milissegundos.
  if (intervalo) clearInterval(intervalo);
  intervalo = setInterval(tick, VELOCIDADE);
}

// Roda uma vez a cada VELOCIDADE ms. É o "coração" do jogo.
function tick() {
  // Aplica a direção escolhida no teclado.
  direcao = proximaDirecao;

  moverCobra();
  if (!jogoAtivo) return; // moverCobra pode ter encerrado (bateu na borda)

  // Verifica colisão consigo mesma (o escudo protege durante o respawn).
  if (!escudoAtivo && verificarColisao()) {
    encerrarJogo();
    return;
  }

  // Comeu a comida? (cabeça na mesma célula da comida)
  if (cobra[0].x === comida.x && cobra[0].y === comida.y) {
    comerComida(comidaEspecial);
  }

  desenhar();
  minhaMecanicaExtra();
}

// Faz a cobra comer: pontua, acelera, cresce e gera nova comida.
function comerComida(especial) {
  score += minhaPontuacao(especial);
  contadorComidas++;

  // Aceleração progressiva a cada X comidas (se ligada no CONFIG).
  if (CONFIG.acelerar_a_cada > 0 && contadorComidas % CONFIG.acelerar_a_cada === 0) {
    nivel++;
    VELOCIDADE = minhaVelocidade(nivel);
    clearInterval(intervalo);
    intervalo = setInterval(tick, VELOCIDADE);
  }

  // Cresce: re-adiciona um segmento no fim (moverCobra removeu a cauda).
  var cauda = cobra[cobra.length - 1];
  cobra.push({ x: cauda.x, y: cauda.y });

  gerarComida();
  atualizarScore(score, nivel);
}

// Encerra a partida: para o loop, salva o score, mostra game over.
function encerrarJogo() {
  jogoAtivo = false;
  clearInterval(intervalo);
  salvarScore(nomeJogador, score);
  mostrarGameOver(score, recordeLocal());
}

// ============================================================
// DESENHO NA TELA
// ============================================================

function desenhar() {
  // Fundo
  ctx.fillStyle = CONFIG.cor_fundo;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grade (linhas finas). "transparent" no CONFIG esconde a grade.
  if (CONFIG.cor_grade !== "transparent") {
    ctx.strokeStyle = CONFIG.cor_grade;
    ctx.lineWidth = 1;
    for (var c = 0; c <= COLUNAS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TAMANHO, 0);
      ctx.lineTo(c * TAMANHO, canvas.height);
      ctx.stroke();
    }
    for (var l = 0; l <= LINHAS; l++) {
      ctx.beginPath();
      ctx.moveTo(0, l * TAMANHO);
      ctx.lineTo(canvas.width, l * TAMANHO);
      ctx.stroke();
    }
  }

  // Comida: cor diferente e um pouco maior se for especial.
  if (comidaEspecial) {
    ctx.fillStyle = CONFIG.cor_comida_especial;
    desenharCelula(comida.x, comida.y, 0);   // ocupa a célula inteira
  } else {
    ctx.fillStyle = CONFIG.cor_comida;
    desenharCelula(comida.x, comida.y, 3);    // pequena margem
  }

  // Cobra. Durante o escudo, faz a cobra "piscar" variando a opacidade.
  if (escudoAtivo) {
    ctx.globalAlpha = (Math.floor(Date.now() / 200) % 2 === 0) ? 1 : 0.3;
  }
  for (var i = 0; i < cobra.length; i++) {
    ctx.fillStyle = (i === 0) ? CONFIG.cor_cobra_cabeca : CONFIG.cor_cobra_corpo;
    desenharCelula(cobra[i].x, cobra[i].y, 1);
  }
  ctx.globalAlpha = 1; // reseta para não afetar o próximo desenho
}

// Desenha uma célula da grade na posição (x,y), com uma margem em px.
function desenharCelula(x, y, margem) {
  ctx.fillRect(
    x * TAMANHO + margem,
    y * TAMANHO + margem,
    TAMANHO - margem * 2,
    TAMANHO - margem * 2
  );
}

// ============================================================
// CONTROLE PELO TECLADO (setas e WASD)
// Bloqueia inverter direto (não dá meia-volta sobre o próprio corpo).
// ============================================================
document.addEventListener("keydown", function (e) {
  var t = e.key.toLowerCase();
  if ((t === "arrowup"    || t === "w") && direcao !== "baixo")    proximaDirecao = "cima";
  if ((t === "arrowdown"  || t === "s") && direcao !== "cima")     proximaDirecao = "baixo";
  if ((t === "arrowleft"  || t === "a") && direcao !== "direita")  proximaDirecao = "esquerda";
  if ((t === "arrowright" || t === "d") && direcao !== "esquerda") proximaDirecao = "direita";
});

// ============================================================
// DESAFIOS DA AULA 1 — implemente as três funções abaixo.
// Enquanto não implementar, a cobra fica parada (o jogo abre, mas não anda).
// ============================================================

// TODO 1: moverCobra() — mover a cabeça na direção atual.
//   1) Calcule dx/dy a partir de 'direcao' (cima=-1 em y, etc).
//   2) Some à cabeça (cobra[0]) para achar a nova posição.
//   3) Se a nova posição saiu da grade, chame comportamentoDeBorda(nova):
//        - se retornar null  -> chame encerrarJogo() e dê return;
//        - se retornar posição -> use essa posição (trata o wraparound).
//   4) cobra.unshift(nova) para pôr a cabeça na frente; cobra.pop() tira a cauda.
function moverCobra() {
  var cabeca = cobra[0];
  var dx = 0;
  var dy = 0;
  if(direcao == "cima"){
    dy = -1;
  }
  if(direcao == "baixo"){
    dy = 1;
  }
  if(direcao == "esquerda"){
    dx = -1;
  }
    if(direcao == "direita"){
    dx = 1;
  }

  var novaPosicao = {x: cabeca.x + dx, y: cabeca.y + dy};
  if (novaPosicao.x < 0 || novaPosicao.x >= COLUNAS || novaPosicao.y < 0 || novaPosicao.y >= LINHAS){
    var posicaoBorda = comportamentoDeBorda(novaPosicao);
    
    if(posicaoBorda === null){
      encerrarJogo();
      return;
    }
    else{
      novaPosicao = posicaoBorda;
    }
  }
    cobra.unshift(novaPosicao);
    cobra.pop();

}

// TODO 2: verificarColisao() — retornar true se a cobra bateu.
//   - Colisão com borda: só se !CONFIG.wraparound (cabeça fora da grade).
//   - Colisão com o corpo: percorra de i=1 até o fim comparando com a cabeça.
function verificarColisao() {
  var cabeca = cobra[0];

  if (!CONFIG.wraparound) {
    if (cabeca.x < 0 || cabeca.x >= COLUNAS || cabeca.y < 0 || cabeca.y >= LINHAS) {
      return true;
    }
  }
  
  for (var i = 1; i < cobra.length; i++) {
    if (cobra[i].x === cabeca.x && cobra[i].y === cabeca.y) {
      return true;
    }
  }

  return false;
}

// TODO 3: gerarComida() — sortear uma posição livre.
//   - Use do...while sorteando x/y aleatórios até cair fora da cobra.
//   - Guarde em 'comida'.
//   - Defina comidaEspecial = Math.random() < CONFIG.chance_comida_especial.
function gerarComida() {
  var posicaoValida = false;
  var novoX, novoY;

  do {

    novoX = Math.floor(Math.random() * COLUNAS);
    novoY = Math.floor(Math.random() * LINHAS);

    posicaoValida = true;

    for (var i = 0; i < cobra.length; i++) {
      if (cobra[i].x === novoX && cobra[i].y === novoY) {
        posicaoValida = false; 
        break; 
      }
    }

  } while (!posicaoValida);

  comida = { x: novoX, y: novoY };

  comidaEspecial = Math.random() < CONFIG.chance_comida_especial;
}

// Scaffold da Aula 1 — implemente os 3 TODOs acima
