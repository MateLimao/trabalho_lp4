// ============================================================
// NeuralNet.cs (Aula 4) — roda a rede neural treinada, em C# puro.
// Lê o brain.json exportado pelo brain.js e faz o "forward pass" na mão,
// sem nenhuma biblioteca de IA. É só multiplicação, soma e a função sigmoid.
// ============================================================

using System.Text.Json;

namespace SnakeServer;

// Uma camada da rede: para cada neurônio j, um conjunto de pesos (um por
// entrada i) e um bias. saida[j] = sigmoid( Σ entrada[i]*Pesos[j][i] + Biases[j] )
public class Camada
{
    public float[][] Pesos = Array.Empty<float[]>();
    public float[] Biases = Array.Empty<float>();
}

public class NeuralNet
{
    private readonly List<Camada> _camadas = new();

    // Lê o arquivo brain.json e monta as camadas.
    public NeuralNet(string caminhoJson)
    {
        var texto = File.ReadAllText(caminhoJson);
        using var doc = JsonDocument.Parse(texto);
        var raiz = doc.RootElement;

        // O brain.js guarda as camadas em "layers". A primeira (índice 0) é a
        // camada de entrada e não tem pesos — começamos da camada 1.
        var layers = raiz.GetProperty("layers");
        for (int l = 1; l < layers.GetArrayLength(); l++)
        {
            var layer = layers[l];

            // Os neurônios vêm como propriedades "0", "1", "2", ...
            var neuronios = new List<(float bias, float[] pesos)>();
            int j = 0;
            while (layer.TryGetProperty(j.ToString(), out var neuronio))
            {
                float bias = neuronio.GetProperty("bias").GetSingle();

                // Os pesos vêm como objeto { "0": w0, "1": w1, ... }.
                var pesosObj = neuronio.GetProperty("weights");
                var listaPesos = new List<float>();
                int i = 0;
                while (pesosObj.TryGetProperty(i.ToString(), out var peso))
                {
                    listaPesos.Add(peso.GetSingle());
                    i++;
                }

                neuronios.Add((bias, listaPesos.ToArray()));
                j++;
            }

            var camada = new Camada
            {
                Biases = neuronios.Select(n => n.bias).ToArray(),
                Pesos = neuronios.Select(n => n.pesos).ToArray()
            };
            _camadas.Add(camada);
        }
    }

    // Função de ativação: "amassa" qualquer número para o intervalo (0, 1).
    private static float Sigmoid(float x)
    {
        return 1f / (1f + MathF.Exp(-x));
    }

    // TODO 1 (Aula 4): forward pass — passa a entrada por todas as camadas.
    public float[] Run(float[] entrada)
    {
        // DICA — fórmula de cada neurônio j de uma camada:
        //   saida[j] = Sigmoid( Σ( entrada[i] * Pesos[j][i] ) + Biases[j] )
        //
        // PASSOS:
        //   1) Comece com 'atual = entrada'.
        //   2) Para cada camada em _camadas:
        //        - crie 'saida' do tamanho de camada.Biases.Length;
        //        - para cada neurônio j: some bias + (entradas * pesos), aplique Sigmoid;
        //        - faça 'atual = saida' (a saída vira a entrada da próxima camada).
        //   3) Devolva 'atual'.

        return new float[] { 0f, 0f, 0f }; // por enquanto: 3 saídas zeradas
    }
}

// Pronto para a Aula 4 — versão completa
