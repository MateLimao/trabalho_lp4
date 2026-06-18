// ============================================================
// Move.cs (Aula 3) — uma "jogada": o estado do jogo num instante (features)
// e a ação que o jogador tomou. É a matéria-prima para treinar a IA.
// ============================================================

namespace SnakeServer.Models;

public class Move
{
    public int Id { get; set; }
    public string NomeJogador { get; set; } = "";

    // As 9 features do instante, guardadas como texto JSON (ex: "[1,0,0,...]").
    public string FeaturesJson { get; set; } = "";

    // Ação tomada: 0 = virar esquerda, 1 = seguir frente, 2 = virar direita.
    public int Acao { get; set; }

    public int ScoreNaqueleInstante { get; set; }
    public DateTime Quando { get; set; } = DateTime.UtcNow;
}

// Pronto para a Aula 3 — versão completa
