A implementação de soft shadows em ray marching envolve realizar o ray marching a partir do ponto de interseção em direção à luz, mas em vez de parar no primeiro obstáculo, continua-se por uma certa distância. Durante este processo, registra-se quão próximo o raio passa de obstáculos (Ray Marching). Esta informação é usada para calcular um fator de penumbra, que é então aplicado à intensidade da sombra. Isso cria uma transição suave entre áreas completamente sombreadas e iluminadas, resultando em sombras mais naturais e realistas.




Para implementar sombras suaves (soft shadows) usando ray marching, você pode usar a técnica de "shadow penumbra" que calcula a quantidade de luz bloqueada ao longo do caminho do raio. A ideia é amostrar várias vezes ao longo do raio de sombra e calcular a quantidade de oclusão.

Passos para Implementação
Calcular a Sombra:

Para cada ponto na cena, lance um raio em direção à luz.
Amostre várias vezes ao longo do raio para verificar a presença de objetos.
Implementar a Função de Sombra Suave:

Use uma função que retorna um valor de sombra suave baseado na quantidade de oclusão.
Integrar a Função de Sombra no Shader:

Modifique o shader de fragmento para usar a função de sombra suave.
Pseudocódigo
Função de Sombra Suave:

Lance um raio do ponto de superfície em direção à luz.
Amostre várias vezes ao longo do raio.
Calcule a quantidade de oclusão.
Shader de Fragmento:

Use a função de sombra suave para calcular a cor final do fragmento.

Função softShadow:

Lança um raio do ponto de superfície em direção à luz.
Amostra várias vezes ao longo do raio.
Calcula a quantidade de oclusão e retorna um valor de sombra suave


Mudança no FS:

Calcula a direção do raio a partir da câmera.
Usa ray marching para encontrar a interseção com a superfície.
Calcula a normal da superfície.
Usa a função softShadow para calcular a sombra suave.
Aplica a sombra suave ao cálculo de iluminação difusa.


Essa implementação cria sombras suaves ao amostrar várias vezes ao longo do raio de sombra, resultando em penumbras realistas. 