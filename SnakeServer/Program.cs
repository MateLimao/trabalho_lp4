// ============================================================
// Program.cs — ponto de entrada do servidor (um único processo serve tudo)
// Serve os arquivos do jogo (wwwroot), a API REST e o WebSocket do multiplayer.
// ============================================================

using Microsoft.EntityFrameworkCore;
using SnakeServer;
using SnakeServer.Data;

var builder = WebApplication.CreateBuilder(args);

// Banco SQLite via EF Core — o arquivo game.db é criado sozinho.
builder.Services.AddDbContext<AppDbContext>(opcoes =>
    opcoes.UseSqlite("Data Source=game.db"));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// O GameLoop é único (Singleton): existe um só para todos os jogadores.
builder.Services.AddSingleton<GameLoop>();

// Escuta em todas as interfaces de rede, na porta 5000, para os alunos
// acessarem pelo IP do professor.
builder.WebHost.UseUrls("http://0.0.0.0:5000");

var app = builder.Build();

// Cria o banco e as tabelas no primeiro start (sem precisar de migrations).
using (var escopo = app.Services.CreateScope())
{
    var db = escopo.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Servir o jogo: UseDefaultFiles faz "/" abrir index.html automaticamente.
app.UseDefaultFiles();
app.UseStaticFiles();

// Liga o suporte a WebSocket (com "ping" a cada 30s para não cair a conexão).
app.UseWebSockets(new WebSocketOptions
{
    KeepAliveInterval = TimeSpan.FromSeconds(30)
});

app.MapControllers();

var gameLoop = app.Services.GetRequiredService<GameLoop>();

// Rota do multiplayer: aceita a conexão WebSocket e entrega ao GameLoop.
app.Map("/ws", async (HttpContext context) =>
{
    if (context.WebSockets.IsWebSocketRequest)
    {
        var ws = await context.WebSockets.AcceptWebSocketAsync();
        await gameLoop.HandleAsync(ws);
    }
    else
    {
        context.Response.StatusCode = 400; // não era um pedido de WebSocket
    }
});

app.Run();

// Pronto para a Aula 2 — versão completa (vale para 2, 3 e 4)
