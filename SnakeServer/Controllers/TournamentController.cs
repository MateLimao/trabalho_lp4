// ============================================================
// TournamentController.cs (Aula 4) — modo torneio com countdown.
//   POST /api/torneio/iniciar  começa 180s de contagem regressiva
//   POST /api/torneio/parar    encerra o torneio
// A cada segundo faz broadcast do tempo restante e do top-3 ao vivo.
// ============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnakeServer.Data;

namespace SnakeServer.Controllers;

[ApiController]
[Route("api/torneio")]
public class TournamentController : ControllerBase
{
    // Flag global que o GameLoop pode consultar para saber se há torneio rolando.
    public static bool ModoTorneioAtivo = false;

    private static System.Threading.Timer? _timer;
    private static int _tempoRestante;

    private readonly GameLoop _gameLoop;
    private readonly IServiceScopeFactory _scopeFactory;

    public TournamentController(GameLoop gameLoop, IServiceScopeFactory scopeFactory)
    {
        _gameLoop = gameLoop;
        _scopeFactory = scopeFactory;
    }

    [HttpPost("iniciar")]
    public IActionResult Iniciar()
    {
        // TODO 3 (Aula 4): montar o timer de contagem regressiva.
        //   1) ModoTorneioAtivo = true; _tempoRestante = 180;
        //   2) _timer?.Dispose();
        //   3) Capture 'gl = _gameLoop' e 'sf = _scopeFactory' em variáveis locais.
        //   4) Crie um System.Threading.Timer que a cada 1000ms:
        //        - faça _tempoRestante--;
        //        - pegue o top-3: var top3 = ObterTop3(sf);
        //        - envie a todos: gl.EnviarParaTodosAsync(new { tipo="torneio", tempoRestante=_tempoRestante, top3 });
        //        - se _tempoRestante <= 0: pare o timer, ModoTorneioAtivo=false,
        //          e envie new { tipo="torneio_fim" }.
        ModoTorneioAtivo = true;
        _tempoRestante = 180;

        return Ok(new { ok = true });
    }

    [HttpPost("parar")]
    public IActionResult Parar()
    {
        _timer?.Dispose();
        _timer = null;
        ModoTorneioAtivo = false;
        _ = _gameLoop.EnviarParaTodosAsync(new { tipo = "torneio_fim" });
        return Ok(new { ok = true });
    }

    // Top-3 do banco para mostrar no overlay do torneio.
    private static object ObterTop3(IServiceScopeFactory sf)
    {
        using var escopo = sf.CreateScope();
        var db = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
        return db.GameSessions
            .OrderByDescending(s => s.Score)
            .Take(3)
            .Select(s => new { nome = s.NomeJogador, score = s.Score, emoji = s.Emoji, tag = s.Tag })
            .ToList();
    }
}

// Pronto para a Aula 4 — versão completa
