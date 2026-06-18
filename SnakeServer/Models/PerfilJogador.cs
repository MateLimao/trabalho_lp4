// ============================================================
// PerfilJogador.cs — a identidade visual que cada aluno define no config.js.
// Recebe CONFIG.cor_multiplayer, CONFIG.emoji_cobra e CONFIG.tag_jogador.
// É o que faz a cobra de cada um aparecer diferente para todo mundo.
// ============================================================

namespace SnakeServer.Models;

public class PerfilJogador
{
    public string Cor { get; set; } = "";
    public string Emoji { get; set; } = "🐍";
    public string Tag { get; set; } = "";

    public PerfilJogador() { }

    public PerfilJogador(string cor, string emoji, string tag)
    {
        Cor = cor;
        Emoji = emoji;
        Tag = tag;
    }
}

// Pronto para a Aula 2 — versão completa
