Ray marching é uma técnica de renderização usada principalmente para criar imagens de cenas 3D complexas, 
como aquelas geradas por fractais ou superfícies implícitas. Ao contrário do ray tracing tradicional, 
onde os raios seguem linhas retas e são rastreados até que atinjam um objeto, 
no ray marching o raio avança em pequenos passos, 
verificando em cada ponto se ele colidiu com a superfície do objeto.
 Essa técnica é eficiente para renderizar superfícies implícitas, como aquelas definidas por funções matemáticas, 
 pois permite calcular a distância até o objeto em cada passo, otimizando o processo de renderização.

PCSS (Percentage-Closer Soft Shadows) é uma técnica de sombreamento usada em gráficos 3D para criar sombras suaves que imitam as sombras do mundo real. Em vez de gerar sombras com bordas nítidas, como acontece com sombras simples, o PCSS calcula a suavidade das sombras com base na distância entre o objeto que projeta a sombra e a superfície onde a sombra é lançada. Quanto mais longe a superfície está da fonte de luz, mais difusa (ou suave) a sombra se torna, criando um efeito realista de transição suave entre luz e sombra. Isso é útil para simular sombras naturais em cenas 3D.

PCSS e Ray Marching são técnicas usadas em gráficos 3D, mas com propósitos diferentes: o PCSS é especializado em criar sombras suaves e realistas ao calcular a suavidade com base na distância entre o objeto e a superfície de projeção, enquanto o Ray Marching é utilizado para renderizar superfícies complexas ao avançar um raio em pequenos passos até encontrar uma colisão. O Ray Marching facilita a criação de sombras suaves porque, ao avançar em passos incrementais e calcular distâncias, ele pode naturalmente simular a penumbra e a transição gradual entre luz e sombra, resultando em um efeito de sombra difusa, similar ao PCSS.


Sim, o PCSS (Percentage-Closer Soft Shadows) cria várias sombras para simular o efeito de soft shadow. Ele faz isso gerando múltiplas amostras de sombras em diferentes pontos dentro da área de penumbra (a região de transição entre sombra completa e luz total). Essas amostras são usadas para calcular a suavidade da sombra com base na proximidade dos objetos em relação à fonte de luz. Quanto mais longe um ponto estiver da luz, mais difusas e suaves serão as sombras, resultando em uma transição suave entre áreas iluminadas e sombreadas.