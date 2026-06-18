// ============================================================
// GameSession.cs — uma partida terminada: quem jogou e quanto fez.
// É a tabela consultada para montar o leaderboard.
// ============================================================

namespace SnakeServer.Models;

public class GameSession
{
    public int Id { get; set; }
    public string NomeJogador { get; set; } = "";
    public int Score { get; set; }

    // Dados de perfil para o leaderboard mostrar emoji, tag e cor.
    public string Emoji { get; set; } = "🐍";
    public string Tag { get; set; } = "";
    public string Cor { get; set; } = "";

    public DateTime Quando { get; set; } = DateTime.UtcNow;
}

// Pronto para a Aula 2 — versão completa
