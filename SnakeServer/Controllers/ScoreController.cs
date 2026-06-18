// ============================================================
// ScoreController.cs — API REST de scores e leaderboard.
//   POST /api/score        salva uma partida e atualiza o ranking ao vivo
//   GET  /api/leaderboard  devolve o top-10
// ============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnakeServer.Data;
using SnakeServer.Models;

namespace SnakeServer.Controllers;

[ApiController]
[Route("api")]
public class ScoreController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GameLoop _gameLoop;

    // Injeção de dependência: o ASP.NET entrega o banco e o GameLoop prontos.
    public ScoreController(AppDbContext db, GameLoop gameLoop)
    {
        _db = db;
        _gameLoop = gameLoop;
    }

    // Corpo esperado no POST (o cliente manda nome, score e dados de perfil).
    public class ScoreDto
    {
        public string Nome { get; set; } = "";
        public int Score { get; set; }
        public string Emoji { get; set; } = "🐍";
        public string Tag { get; set; } = "";
        public string Cor { get; set; } = "";
    }

    [HttpPost("score")]
    public async Task<IActionResult> PostScore([FromBody] ScoreDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Nome))
            return BadRequest("O nome do jogador é obrigatório.");

        // TODO 2 (Aula 2): salvar a partida no banco.
        //   1) Crie um GameSession com NomeJogador, Score, Emoji, Tag e Cor (do dto).
        var sessao = new GameSession {
        NomeJogador = dto.Nome,
        Score = dto.Score,
        Emoji = dto.Emoji,
        Tag = dto.Tag,
        Cor = dto.Cor
        };
        //   2) _db.GameSessions.Add(sessao);
        _db.GameSessions.Add(sessao);
        //   3) await _db.SaveChangesAsync();
        await _db.SaveChangesAsync();
        //   4) Atualize o ranking ao vivo:
        var top = await ObterTop10();
        _gameLoop.BroadcastLeaderboard(top);
        return Ok(new { ok = true });
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard()
    {
        // TODO 3 (Aula 2): consultar e devolver o top-10.
        //   Use o método auxiliar ObterTop10() (logo abaixo) e devolva com Ok(...).
        return Ok(new List<object>()); // por enquanto devolve lista vazia
    }

    // Consulta os 10 maiores scores já salvos.
    private async Task<List<object>> ObterTop10()
    {
        var lista = await _db.GameSessions
            .OrderByDescending(s => s.Score)
            .Take(10)
            .Select(s => new
            {
                nome = s.NomeJogador,
                score = s.Score,
                emoji = s.Emoji,
                tag = s.Tag,
                cor = s.Cor
            })
            .ToListAsync();

        return lista.Cast<object>().ToList();
    }
}

// Pronto para a Aula 2 — versão completa
