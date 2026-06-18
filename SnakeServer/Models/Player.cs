// ============================================================
// Player.cs — representa um jogador conhecido pelo banco.
// ============================================================

namespace SnakeServer.Models;

public class Player
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

// Pronto para a Aula 2 — versão completa
