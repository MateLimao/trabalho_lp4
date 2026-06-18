// ============================================================
// config.js — ESTE É O SEU ARQUIVO!
// ------------------------------------------------------------
// Tudo que você pode personalizar no seu jogo está aqui.
// Mude os valores, salve o arquivo e recarregue o browser (F5).
// O jogo muda na hora, sem precisar mexer em nenhum outro arquivo.
// ============================================================

var CONFIG = {
  // ── Identidade do jogador ────────────────────────────────
  nomepadrao: "",                       // nome pré-preenchido no campo (deixe "" para digitar na hora)
  emoji_morte: "💀",                    // emoji exibido quando a cobra morre. Ex: "👻", "🍕", "😵"
  mensagem_game_over: "Fim de jogo!",   // texto na tela de game over. Ex: "Você foi comido!"

  // ── Velocidade ────────────────────────────────────────────
  velocidade_inicial: 150,  // ms entre cada movimento. MENOR = MAIS RÁPIDO. Mínimo recomendado: 60
  velocidade_minima: 60,    // limite de velocidade quando a aceleração progressiva está ligada
  acelerar_a_cada: 5,       // a cobra acelera a cada X comidas (coloque 0 para nunca acelerar)
  reducao_por_nivel: 10,    // quantos ms a cobra ganha de velocidade a cada nível de aceleração

  // ── Grade e canvas ────────────────────────────────────────
  tamanho_celula: 20,       // px por célula. Valores sugeridos: 15, 20, 25
  colunas: 30,              // número de colunas da grade (largura do canvas = colunas * tamanho_celula)
  linhas: 30,               // número de linhas da grade (altura do canvas = linhas * tamanho_celula)

  // ── Cores ─────────────────────────────────────────────────
  cor_fundo: "#0f0f0f",          // fundo do canvas
  cor_grade: "#1a1a2e",          // linhas da grade (use "transparent" para esconder a grade)
  cor_cobra_cabeca: "#4ecca3",   // cor da cabeça da cobra
  cor_cobra_corpo: "#38a186",    // cor do corpo da cobra
  cor_comida: "#e94560",         // cor da comida normal
  cor_comida_especial: "#f5a623",// cor da comida especial (vale 3x mais)

  // ── Layout e aparência (DICA: comece a personalizar por aqui!) ──
  // Tudo nesta seção muda a "cara" do jogo sem mexer na jogabilidade.
  titulo_jogo: "🐍 SNAKE",                  // título grande na tela de início. Ex: "COBRA DA ANA"
  fonte_jogo: "Segoe UI, Arial, sans-serif",// fonte de tudo. Ex: "Courier New, monospace", "Verdana"
  fonte_score: "Segoe UI, Arial, sans-serif",// fonte só do número do score. Ex: "Courier New, monospace"
  cor_texto: "#eaeaea",          // cor do texto em geral (títulos, rótulos)
  cor_texto_score: "#4ecca3",    // cor do número do score no painel
  cor_painel: "#12121c",         // cor de fundo dos blocos do painel lateral
  cor_botao: "#4ecca3",          // cor dos botões (Jogar, Reiniciar)
  cor_borda_canvas: "#2a2a3a",   // cor da borda ao redor do tabuleiro
  largura_borda_canvas: 2,       // espessura da borda do tabuleiro em px (0 = sem borda)
  raio_borda_canvas: 6,          // arredondamento dos cantos do tabuleiro em px (0 = cantos retos)
  posicao_painel: "direita",     // "direita" ou "esquerda": de que lado fica o painel do score

  // ── Pontuação ─────────────────────────────────────────────
  pontos_por_comida: 10,         // pontos ganhos por comida normal
  chance_comida_especial: 0.15,  // probabilidade de aparecer comida especial (0 = nunca, 1 = sempre)

  // ── Mecânicas opcionais ───────────────────────────────────
  wraparound: false,             // true = a cobra atravessa a borda e aparece do outro lado
  escudo_apos_respawn: true,     // true = a cobra pisca por 3s após nascer sem poder morrer

  // ── Multiplayer (usado a partir da Aula 2) ────────────────
  emoji_cobra: "🐍",             // emoji exibido acima da cabeça da sua cobra para os outros
  tag_jogador: "",               // tag curta no leaderboard. Ex: "speed runner", "sobrevivente"
  cor_multiplayer: ""            // cor da sua cobra para os outros. "" = gerada automaticamente pelo seu nome
};

// ------------------------------------------------------------
// Valida e corrige valores inválidos do CONFIG.
// Roda sozinha assim que o arquivo é carregado, então mesmo que
// você digite um valor estranho o jogo não quebra.
// ------------------------------------------------------------
(function validarConfig() {
  if (CONFIG.velocidade_inicial < CONFIG.velocidade_minima) {
    CONFIG.velocidade_inicial = CONFIG.velocidade_minima;
  }
  if (CONFIG.tamanho_celula < 10) CONFIG.tamanho_celula = 10;
  if (CONFIG.colunas < 10) CONFIG.colunas = 10;
  if (CONFIG.linhas < 10) CONFIG.linhas = 10;
  if (CONFIG.chance_comida_especial < 0) CONFIG.chance_comida_especial = 0;
  if (CONFIG.chance_comida_especial > 1) CONFIG.chance_comida_especial = 1;
  // Layout
  if (CONFIG.largura_borda_canvas < 0) CONFIG.largura_borda_canvas = 0;
  if (CONFIG.raio_borda_canvas < 0) CONFIG.raio_borda_canvas = 0;
  if (CONFIG.posicao_painel !== "esquerda") CONFIG.posicao_painel = "direita";
  if (!CONFIG.titulo_jogo) CONFIG.titulo_jogo = "🐍 SNAKE";
})();

// Este arquivo é idêntico em todas as aulas — você nunca precisa recopiá-lo.
