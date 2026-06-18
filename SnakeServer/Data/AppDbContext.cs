// ============================================================
// AppDbContext.cs — a "ponte" entre o C# e o banco SQLite.
// Cada DbSet vira uma tabela. O EF Core cuida do SQL para a gente.
// ============================================================

using Microsoft.EntityFrameworkCore;
using SnakeServer.Models;

namespace SnakeServer.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> opcoes) : base(opcoes) { }

    public DbSet<Player> Players => Set<Player>();
    public DbSet<GameSession> GameSessions => Set<GameSession>();
    public DbSet<Move> Moves => Set<Move>();   // usado a partir da Aula 3

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // Só configura aqui se ninguém já configurou (o Program.cs configura).
        // Garante que, mesmo criando o contexto "na mão", ele aponta para game.db.
        if (!optionsBuilder.IsConfigured)
        {
            optionsBuilder.UseSqlite("Data Source=game.db");
        }
    }
}

// Pronto para a Aula 2 — versão completa
