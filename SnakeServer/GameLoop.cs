// ============================================================
// GameLoop.cs — o coração do multiplayer no servidor.
// Mantém a lista de jogadores conectados, simula as cobras a cada 100ms,
// detecta colisões, gera comida e envia o estado para todos (broadcast).
//
// MODELO (importante entender):
//  - O servidor é a AUTORIDADE do multiplayer: ele simula todas as cobras
//    (inclusive a do bot) numa grade compartilhada e manda o resultado para
//    todos os browsers desenharem.
//  - Cada cliente manda só a DIREÇÃO escolhida no teclado; o servidor move.
//  - A partir da Aula 3, a cada tick o servidor extrai "features" de cada
//    jogador humano e salva como Move no banco (dados para treinar a IA).
//  - A partir da Aula 4, se existir um modelo treinado (brain.json), o
//    servidor cria um bot "🤖 IA" que decide para onde virar usando a rede.
// ============================================================

using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using SnakeServer.Data;
using SnakeServer.Models;

namespace SnakeServer;

public class GameLoop
{
    // ── Tipos internos ──────────────────────────────────────
    public class Ponto { public int X { get; set; } public int Y { get; set; } }

    public class Perfil
    {
        public string Cor { get; set; } = "";
        public string Emoji { get; set; } = "🐍";
        public string Tag { get; set; } = "";
    }

    public class Snake
    {
        public List<Ponto> Segmentos { get; set; } = new();
        public string Direcao { get; set; } = "direita";
        public string UltimaDirecao { get; set; } = "direita"; // direção do tick anterior
        public int Score { get; set; }
        public bool Ativa { get; set; } = true;
        public bool EscudoAtivo { get; set; }
        public int TicksEscudo { get; set; }
        public int ContadorComidas { get; set; }
    }

    public class EstadoJogador
    {
        public Snake Snake { get; set; } = new();
        public string Nome { get; set; } = "";
        public Perfil Perfil { get; set; } = new();
        public bool EhBot { get; set; }
    }

    // ── Grade (precisa bater com o CONFIG padrão do cliente) ──
    private const int COLUNAS = 30;
    private const int LINHAS = 30;
    private const int TICKS_ESCUDO = 30; // 30 ticks * 100ms = 3 segundos

    // ── Estado compartilhado ────────────────────────────────
    private readonly Dictionary<WebSocket, EstadoJogador> _jogadores = new();
    private EstadoJogador? _bot;
    private Ponto _comida = new() { X = 10, Y = 10 };
    private readonly Random _rnd = new();
    private readonly object _lock = new();
    private readonly System.Threading.Timer _timer;
    private bool _emTick;
    private int _contadorTicks;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly NeuralNet? _rede;

    // Buffer de jogadas a salvar no banco (Aula 3), esvaziado de tempos em tempos.
    private readonly List<Move> _bufferMoves = new();

    public GameLoop(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;

        // (Aula 4) Carrega o modelo treinado, se existir, e cria o bot.
        var caminhoModelo = Path.Combine("wwwroot", "model", "brain.json");
        if (File.Exists(caminhoModelo))
        {
            try
            {
                _rede = new NeuralNet(caminhoModelo);
                _bot = CriarBot();
                Console.WriteLine("[GameLoop] IA carregada — bot '🤖 IA' ativo.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("[GameLoop] Falha ao carregar brain.json: " + ex.Message);
            }
        }
        else
        {
            Console.WriteLine("[GameLoop] Aviso: brain.json não encontrado. Bot desativado (treine na Aula 3).");
        }

        GerarComida();

        // Liga o loop: Tick roda a cada 100ms.
        _timer = new System.Threading.Timer(_ => Tick(), null, 0, 100);
    }

    private EstadoJogador CriarBot()
    {
        var bot = new EstadoJogador
        {
            Nome = "🤖 IA",
            EhBot = true,
            Perfil = new Perfil { Cor = "#ff6b6b", Emoji = "🤖", Tag = "IA" }
        };
        Respawn(bot.Snake);
        return bot;
    }

    // ============================================================
    // CONEXÃO WEBSOCKET
    // ============================================================
    public async Task HandleAsync(WebSocket ws)
    {
        var buffer = new byte[4096]; // ReceiveBufferSize = 4096
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var resultado = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (resultado.MessageType == WebSocketMessageType.Close) break;

                var json = Encoding.UTF8.GetString(buffer, 0, resultado.Count);
                ProcessarMensagem(ws, json);
            }
        }
        catch
        {
            // conexão caiu — tratamos no finally
        }
        finally
        {
            RemoverJogador(ws);
            try { await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "fim", CancellationToken.None); }
            catch { /* já fechou */ }
        }
    }

    private void ProcessarMensagem(WebSocket ws, string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var raiz = doc.RootElement;
            var tipo = raiz.GetProperty("tipo").GetString();

            if (tipo == "entrar")
            {
                var nome = raiz.TryGetProperty("nome", out var n) ? (n.GetString() ?? "Anônimo") : "Anônimo";
                var perfil = new Perfil();
                if (raiz.TryGetProperty("perfil", out var p) && p.ValueKind == JsonValueKind.Object)
                {
                    if (p.TryGetProperty("cor", out var c)) perfil.Cor = c.GetString() ?? "";
                    if (p.TryGetProperty("emoji", out var e)) perfil.Emoji = e.GetString() ?? "🐍";
                    if (p.TryGetProperty("tag", out var t)) perfil.Tag = t.GetString() ?? "";
                }
                AdicionarJogador(ws, nome, perfil);
            }
            else if (tipo == "direcao")
            {
                var dir = raiz.GetProperty("direcao").GetString() ?? "";
                lock (_lock)
                {
                    if (_jogadores.TryGetValue(ws, out var estado) && estado.Snake.Ativa)
                    {
                        DefinirDirecao(estado.Snake, dir);
                    }
                }
            }
        }
        catch
        {
            // mensagem malformada — ignora
        }
    }

    public void AdicionarJogador(WebSocket ws, string nome, Perfil perfil)
    {
        lock (_lock)
        {
            // Cor: usa a escolhida pelo aluno; se vazia, gera uma a partir do nome.
            if (string.IsNullOrWhiteSpace(perfil.Cor))
                perfil.Cor = CorPorHash(nome);

            var estado = new EstadoJogador { Nome = nome, Perfil = perfil };
            Respawn(estado.Snake);
            _jogadores[ws] = estado;
            Console.WriteLine($"[GameLoop] Entrou: {nome} ({_jogadores.Count} jogadores).");
        }
    }

    public void RemoverJogador(WebSocket ws)
    {
        lock (_lock)
        {
            _jogadores.Remove(ws);
        }
    }

    // Impede a cobra de dar meia-volta sobre si mesma.
    private void DefinirDirecao(Snake s, string nova)
    {
        if (nova == "cima" && s.Direcao == "baixo") return;
        if (nova == "baixo" && s.Direcao == "cima") return;
        if (nova == "esquerda" && s.Direcao == "direita") return;
        if (nova == "direita" && s.Direcao == "esquerda") return;
        if (nova is "cima" or "baixo" or "esquerda" or "direita")
            s.Direcao = nova;
    }

    // ============================================================
    // LOOP PRINCIPAL
    // ============================================================
    private void Tick()
    {
        if (_emTick) return; // evita sobreposição se um tick demorar
        _emTick = true;

        object gameState;
        List<Move>? movesParaSalvar = null;

        try
        {
            lock (_lock)
            {
                var estados = _jogadores.Values.ToList();
                if (_bot != null) estados.Add(_bot);

                // (Aula 4) O bot decide a direção antes de mover.
                if (_bot != null && _bot.Snake.Ativa) BotTick(_bot);

                // Mapa de células ocupadas ANTES de mover (para detectar colisão).
                var ocupadas = new HashSet<(int, int)>();
                foreach (var e in estados)
                    if (e.Snake.Ativa)
                        foreach (var seg in e.Snake.Segmentos)
                            ocupadas.Add((seg.X, seg.Y));

                foreach (var e in estados)
                {
                    if (!e.Snake.Ativa) continue;
                    var s = e.Snake;

                    // (Aula 3) Coleta de dados: features do estado ATUAL + ação tomada.
                    if (!e.EhBot)
                    {
                        var features = ExtractFeatures(s, _comida);
                        var acao = AcaoRelativa(s.UltimaDirecao, s.Direcao);
                        _bufferMoves.Add(new Move
                        {
                            NomeJogador = e.Nome,
                            FeaturesJson = JsonSerializer.Serialize(features),
                            Acao = acao,
                            ScoreNaqueleInstante = s.Score
                        });
                    }

                    // Calcula a nova cabeça.
                    var (dx, dy) = Delta(s.Direcao);
                    var cabeca = s.Segmentos[0];
                    int nx = cabeca.X + dx, ny = cabeca.Y + dy;

                    bool bateu = nx < 0 || nx >= COLUNAS || ny < 0 || ny >= LINHAS
                                 || ocupadas.Contains((nx, ny));

                    if (bateu)
                    {
                        // Com escudo, não morre: só fica parada neste tick.
                        if (s.EscudoAtivo) { s.UltimaDirecao = s.Direcao; continue; }
                        Respawn(s);
                        continue;
                    }

                    // Move: nova cabeça na frente.
                    s.Segmentos.Insert(0, new Ponto { X = nx, Y = ny });

                    if (nx == _comida.X && ny == _comida.Y)
                    {
                        s.Score += 10;
                        s.ContadorComidas++;
                        GerarComida();
                        // cresce: NÃO remove a cauda neste tick
                    }
                    else
                    {
                        s.Segmentos.RemoveAt(s.Segmentos.Count - 1);
                    }

                    s.UltimaDirecao = s.Direcao;
                }

                // Conta o escudo regressivamente.
                foreach (var e in estados)
                {
                    if (e.Snake.EscudoAtivo)
                    {
                        e.Snake.TicksEscudo--;
                        if (e.Snake.TicksEscudo <= 0) e.Snake.EscudoAtivo = false;
                    }
                }

                gameState = MontarGameState(estados);

                // A cada ~2s, separa o buffer de jogadas para salvar fora do lock.
                _contadorTicks++;
                if (_contadorTicks % 20 == 0 && _bufferMoves.Count > 0)
                {
                    movesParaSalvar = new List<Move>(_bufferMoves);
                    _bufferMoves.Clear();
                }
            }

            // Envia o estado para todos (fora do lock).
            _ = EnviarParaTodosAsync(gameState);

            // Salva as jogadas no banco (fora do lock).
            if (movesParaSalvar != null)
                _ = SalvarMovesAsync(movesParaSalvar);
        }
        finally
        {
            _emTick = false;
        }
    }

    private object MontarGameState(List<EstadoJogador> estados)
    {
        return new
        {
            tipo = "gameState",
            comida = new { x = _comida.X, y = _comida.Y },
            jogadores = estados.Select(e => new
            {
                nome = e.Nome,
                score = e.Snake.Score,
                escudo = e.Snake.EscudoAtivo,
                perfil = new { cor = e.Perfil.Cor, emoji = e.Perfil.Emoji, tag = e.Perfil.Tag },
                segmentos = e.Snake.Segmentos.Select(p => new { x = p.X, y = p.Y }).ToList()
            }).ToList()
        };
    }

    // ============================================================
    // BOT DE IA (Aula 4)
    // ============================================================
    private void BotTick(EstadoJogador bot)
    {
        if (_rede == null) return;

        // 1) Extrai as features do estado atual do bot.
        var features = ExtractFeatures(bot.Snake, _comida);

        // 2) Roda a rede neural (forward pass em C#).
        var saida = _rede.Run(features);

        // 3) A ação é o índice do maior valor de saída (0=esq, 1=frente, 2=dir).
        int acao = 0;
        for (int i = 1; i < saida.Length; i++)
            if (saida[i] > saida[acao]) acao = i;

        // 4) Converte a ação relativa em direção absoluta.
        bot.Snake.Direcao = VirarRelativo(bot.Snake.Direcao, acao);
    }

    // ============================================================
    // EXTRAÇÃO DE FEATURES (Aula 3 — TODO 1)
    // ============================================================
    // Retorna 9 valores (0f ou 1f) descrevendo o que a cobra "vê" agora.
    public float[] ExtractFeatures(Snake cobra, Ponto comida)
    {
        var f = new float[9];
        var cabeca = cobra.Segmentos[0];

        // TODO 1 (Aula 3): preencha as 9 features (cada uma 0f ou 1f).
        // DICAS:
        //   - "frente/esquerda/direita" são RELATIVAS à direção atual.
        //     Use VirarRelativo(cobra.Direcao, 0) para a esquerda e
        //     VirarRelativo(cobra.Direcao, 2) para a direita.
        //   - Use Delta(direcao) para virar uma direção em deslocamento (dx,dy).
        //   - Use PerigoEm(x, y) para saber se uma célula tem parede ou cobra.
        //
        //   f[0] perigo à FRENTE      f[1] perigo à ESQUERDA   f[2] perigo à DIREITA
        //   f[3] indo "cima"          f[4] indo "baixo"
        //   f[5] indo "direita"       f[6] indo "esquerda"
        //   f[7] comida na mesma linha OU coluna que a cabeça
        //   f[8] distância Manhattan até a comida < metade do comprimento da cobra
        //
        // Exemplo numérico: cabeça em (5,5), indo "direita", comida em (9,5).
        //   -> frente = (6,5); esquerda relativa = "cima" = (5,4); direita = "baixo" = (5,6)
        //   -> f[5]=1 (indo direita); f[7]=1 (mesma linha y=5)

        return f; // por enquanto devolve tudo 0 (o jogo roda, a IA fica "burra")
    }

    // Há perigo nesta célula? (fora da grade ou ocupada por qualquer cobra)
    private bool PerigoEm(int x, int y)
    {
        if (x < 0 || x >= COLUNAS || y < 0 || y >= LINHAS) return true;
        foreach (var e in _jogadores.Values)
            if (e.Snake.Ativa)
                foreach (var seg in e.Snake.Segmentos)
                    if (seg.X == x && seg.Y == y) return true;
        if (_bot != null && _bot.Snake.Ativa)
            foreach (var seg in _bot.Snake.Segmentos)
                if (seg.X == x && seg.Y == y) return true;
        return false;
    }

    // ============================================================
    // HELPERS DE DIREÇÃO
    // ============================================================
    // Deslocamento (dx, dy) de cada direção (y cresce para baixo).
    private static (int, int) Delta(string direcao) => direcao switch
    {
        "cima" => (0, -1),
        "baixo" => (0, 1),
        "esquerda" => (-1, 0),
        "direita" => (1, 0),
        _ => (0, 0)
    };

    // Aplica uma ação relativa: 0 = virar à esquerda, 1 = seguir frente, 2 = virar à direita.
    private static readonly string[] Horario = { "cima", "direita", "baixo", "esquerda" };
    private static string VirarRelativo(string direcao, int acao)
    {
        int idx = Array.IndexOf(Horario, direcao);
        if (acao == 1) return direcao;             // frente
        if (acao == 2) return Horario[(idx + 1) % 4]; // direita (sentido horário)
        return Horario[(idx + 3) % 4];             // esquerda (anti-horário)
    }

    // Descobre qual ação relativa leva de 'anterior' para 'atual'.
    private static int AcaoRelativa(string anterior, string atual)
    {
        if (atual == anterior) return 1;
        if (atual == VirarRelativo(anterior, 2)) return 2;
        if (atual == VirarRelativo(anterior, 0)) return 0;
        return 1; // qualquer outro caso (não deveria ocorrer): considera "frente"
    }

    // ============================================================
    // COMIDA E RESPAWN
    // ============================================================
    private void GerarComida()
    {
        for (int tentativa = 0; tentativa < 200; tentativa++)
        {
            int x = _rnd.Next(COLUNAS), y = _rnd.Next(LINHAS);
            if (!PerigoEm(x, y)) // posição livre
            {
                _comida = new Ponto { X = x, Y = y };
                return;
            }
        }
        _comida = new Ponto { X = _rnd.Next(COLUNAS), Y = _rnd.Next(LINHAS) };
    }

    private void Respawn(Snake s)
    {
        int x = 3 + _rnd.Next(COLUNAS - 6);
        int y = 3 + _rnd.Next(LINHAS - 6);
        s.Segmentos = new List<Ponto>
        {
            new() { X = x,     Y = y },
            new() { X = x - 1, Y = y },
            new() { X = x - 2, Y = y }
        };
        s.Direcao = "direita";
        s.UltimaDirecao = "direita";
        s.Score = 0;
        s.ContadorComidas = 0;
        s.Ativa = true;
        s.EscudoAtivo = true;       // escudo pós-respawn
        s.TicksEscudo = TICKS_ESCUDO;
    }

    // Gera uma cor estável (sempre a mesma) a partir do nome do jogador.
    private static string CorPorHash(string nome)
    {
        int hash = 0;
        foreach (char c in nome) hash = c + ((hash << 5) - hash);
        int r = (hash & 0xFF0000) >> 16;
        int g = (hash & 0x00FF00) >> 8;
        int b = (hash & 0x0000FF);
        // Clareia um pouco para ficar visível no fundo escuro.
        r = (r + 128) / 2; g = (g + 128) / 2; b = (b + 128) / 2;
        return $"#{r:X2}{g:X2}{b:X2}";
    }

    // ============================================================
    // ENVIO PARA OS CLIENTES
    // ============================================================
    private readonly SemaphoreSlim _envioLock = new(1, 1);

    public async Task EnviarParaTodosAsync(object mensagem)
    {
        var json = JsonSerializer.Serialize(mensagem);
        var bytes = Encoding.UTF8.GetBytes(json);

        List<WebSocket> destinos;
        lock (_lock) { destinos = _jogadores.Keys.ToList(); }

        // Um envio de cada vez evita escrever no mesmo socket em paralelo.
        await _envioLock.WaitAsync();
        try
        {
            foreach (var ws in destinos)
            {
                if (ws.State != WebSocketState.Open) continue;
                try
                {
                    await ws.SendAsync(new ArraySegment<byte>(bytes),
                        WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch { /* socket caiu, ignora */ }
            }
        }
        finally { _envioLock.Release(); }
    }

    // Broadcast do leaderboard (chamado pelo ScoreController após salvar um score).
    public void BroadcastLeaderboard(object leaderboard)
    {
        _ = EnviarParaTodosAsync(new { tipo = "leaderboard", lista = leaderboard });
    }

    // ============================================================
    // PERSISTÊNCIA DAS JOGADAS (Aula 3)
    // ============================================================
    private async Task SalvarMovesAsync(List<Move> moves)
    {
        try
        {
            using var escopo = _scopeFactory.CreateScope();
            var db = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Moves.AddRange(moves);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine("[GameLoop] Erro ao salvar jogadas: " + ex.Message);
        }
    }
}

// Pronto para a Aula 4 — versão completa (cumulativa das Aulas 2, 3 e 4)
