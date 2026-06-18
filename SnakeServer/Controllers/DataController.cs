// ============================================================
// DataController.cs (Aula 3) — exporta o dataset e recebe o modelo treinado.
//   GET  /api/export  baixa um CSV com todas as jogadas (para treinar)
//   POST /api/model   recebe o brain.json treinado e salva em wwwroot/model/
// ============================================================

using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnakeServer.Data;

namespace SnakeServer.Controllers;

[ApiController]
[Route("api")]
public class DataController : ControllerBase
{
    private readonly AppDbContext _db;

    public DataController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var jogadas = await _db.Moves.OrderBy(m => m.Id).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("features0,features1,features2,features3,features4,features5,features6,features7,features8,acao,score");

        foreach (var m in jogadas)
        {
            // FeaturesJson é algo como "[1,0,0,1,...]". Reconvertendo para números.
            var feats = JsonSerializer.Deserialize<float[]>(m.FeaturesJson) ?? new float[9];
            sb.Append(string.Join(",", feats.Select(f => ((int)f).ToString())));
            sb.Append(',').Append(m.Acao);
            sb.Append(',').Append(m.ScoreNaqueleInstante);
            sb.AppendLine();
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        // O File(...) já adiciona o cabeçalho Content-Disposition: attachment.
        return File(bytes, "text/csv", "dataset.csv");
    }

    [HttpPost("model")]
    public async Task<IActionResult> SalvarModelo()
    {
        using var leitor = new StreamReader(Request.Body);
        var json = await leitor.ReadToEndAsync();

        // Valida que o JSON parece um modelo do brain.js.
        try
        {
            using var doc = JsonDocument.Parse(json);
            var raiz = doc.RootElement;
            bool temLayers = raiz.TryGetProperty("layers", out _);
            bool temTamanhos = raiz.TryGetProperty("sizes", out _)
                               || raiz.TryGetProperty("outputSize", out _);
            if (!temLayers || !temTamanhos)
                return BadRequest("JSON do modelo inválido (faltam 'layers'/'sizes').");
        }
        catch
        {
            return BadRequest("JSON inválido.");
        }

        var pasta = Path.Combine("wwwroot", "model");
        Directory.CreateDirectory(pasta);
        await System.IO.File.WriteAllTextAsync(Path.Combine(pasta, "brain.json"), json);

        return Ok(new { ok = true, mensagem = "Modelo salvo!" });
    }
}

// Pronto para a Aula 3 — versão completa
