# CONTEXTO MESTRE — SAMUEL OLIVEIRA MATOS

**Finalidade:** Fornecer informações profissionais, acadêmicas e técnicas para LLMs responsáveis por preencher e organizar o portfólio pessoal de Samuel Oliveira Matos.

**Atualização:** Outubro de 2026.

## 1. IDENTIDADE E VISÃO GERAL

**Nome:** Samuel Oliveira Matos  
**GitHub:** https://github.com/SamuelMatos78  
**LinkedIn:** https://www.linkedin.com/in/samuel-oliveira-matos-a9b753237

Samuel é um desenvolvedor brasileiro e estudante de Engenharia de Software na PUC Minas, com experiência profissional em tecnologia, inteligência artificial, automação, algoritmos de decisão e engenharia de sistemas.

Sua formação começou em Engenharia da Computação, migrando posteriormente para Engenharia de Software. Seu período acadêmico está associado aos anos de 2022–2027.

Seu perfil combina experiência profissional em empresas reais, participação em iniciativas de inovação e desenvolvimento de projetos independentes de caráter experimental e científico.

Possui interesse especial por programação de baixo nível, desempenho computacional, sistemas inteligentes, otimização, arquiteturas reutilizáveis e soluções algorítmicas para problemas complexos.

Sua abordagem técnica é orientada à investigação, comparação de métodos e eliminação de complexidade desnecessária.

## 2. EXPERIÊNCIA PROFISSIONAL E CONQUISTAS

### 2.1. Quero Meus Direitos — 2 anos

Samuel trabalhou durante aproximadamente dois anos na **Quero Meus Direitos**, startup brasileira de tecnologia jurídica.

A empresa desenvolve soluções para facilitar o acesso a serviços e direitos jurídicos, utilizando automação e inteligência artificial.

**Conquista de destaque — Google for Startups Accelerator 2026**

Samuel informa que integrou a equipe campeã do Google Accelerate de 2026, representando a Quero Meus Direitos.

A Quero Meus Direitos foi selecionada para o Google for Startups Accelerator: Brazil 2026, integrando uma turma de 11 startups.

O programa oferece acesso a especialistas do Google, mentoria tecnológica e suporte ao desenvolvimento de soluções inovadoras, incluindo inteligência artificial.

**Referências:**

Google for Startups:  
https://startup.google.com.br/programs/accelerator/brazil/

LinkedIn da publicação:  
https://pt.linkedin.com/posts/quero-meus-direitos_googleforstartups-legaltech-ia-activity-7458550345783271424-BiWY

**Nota de precisão:** A seleção da empresa para o programa é publicamente documentada. O título de equipe campeã é uma informação fornecida diretamente por Samuel, sem verificação independente adicional. Não atribuir a ele liderança técnica, autoria específica de funcionalidades ou premiação individual sem evidências.

### 2.2. EMATER — 8 meses

Samuel trabalhou durante aproximadamente oito meses na EMATER.

Essa experiência integra seu histórico profissional.

O cargo, as atribuições específicas e as tecnologias utilizadas ainda não foram detalhados. Não inventar responsabilidades ou resultados.

### 2.3. Projeto Celesto — Fundador

**Início informado:** Março de 2025.

Samuel consta como fundador do Projeto Celesto.

A iniciativa está relacionada à aplicação de automação e computação na busca por corpos celestes e outras atividades astronômicas.

O projeto demonstra interesse em aplicações científicas de tecnologia, para além de sistemas comerciais e desenvolvimento web.

Ainda não existem informações verificadas suficientes para descrever sua arquitetura ou atribuir descobertas astronômicas ao projeto.

## 3. PRINCIPAIS PROJETOS PÚBLICOS

### 3.1. H-Suppression — Arquitetura de decisão algorítmica

**Repositório:**  
https://github.com/SamuelMatos78/H-supression

**Tecnologias:** C11, Python, CMake, algoritmos de decisão, benchmarking e análise de desempenho.

H-Suppression é um projeto de pesquisa experimental sobre arquiteturas de decisão capazes de avaliar ações admissíveis sem necessariamente expandir árvores temporais de estados sucessores.

A arquitetura combina:
- Avaliação matemática das ações disponíveis.
- Priorização lexicográfica de objetivos.
- Supressão de alternativas equivalentes.
- Seleção incremental de candidatos.
- Modelagem probabilística.
- Redução de trabalho redundante.
- Decisões auditáveis.

O experimento compara a abordagem com implementações de referência de MCTS, Expectimax, alfa-beta e algoritmos locais especializados.

**Dados do experimento publicado:**
- 2.016 partidas sintéticas.
- 40.320 decisões registradas.
- 2.688 medições de escala.
- 119 controles locais.
- Nove decisões analisadas com pequenos oráculos.
- Zero ações inválidas registradas.
- Zero sucessores hipotéticos expandidos pelo H-Suppression.

**Resultados selecionados:**

Contra o MCTS implementado no experimento, H-Suppression venceu 32 de 32 partidas determinísticas em cada regime avaliado.

Em uma medição com cenário de recursos compartilhados e orçamento de 4.096 avaliações, foram registrados aproximadamente:

| Algoritmo | Tempo |
|---|---:|
| H-Suppression | 2,37 ms |
| Greedy | 6,91 ms |
| Expectimax | 14,33 ms |
| MCTS | 4.046,46 ms |

Os valores pertencem a um cenário sintético específico, com implementação e condições descritas no repositório. Não devem ser apresentados como superioridade universal.

O estudo também documenta resultados negativos, empates, limitações de generalização e situações em que algoritmos especializados convencionais superam a arquitetura.

A pesquisa investiga a hipótese de que, em determinados problemas, uma representação matemática adequada pode evitar parte do custo de busca temporal.

**Relação com Derrisor:** H-Suppression fornece uma base experimental para investigar decisões algorítmicas aplicáveis ao projeto Derrisor, um agente de Balatro.

**Natureza do trabalho:** Pesquisa experimental de arquitetura algorítmica, com código-fonte, testes, relatórios, dados e procedimentos de reprodução.

**Documentação:**

Relatório:  
https://github.com/SamuelMatos78/H-supression/blob/main/RELATORIO.md

Metodologia:  
https://github.com/SamuelMatos78/H-supression/blob/main/METODOLOGIA.md

Limitações:  
https://github.com/SamuelMatos78/H-supression/blob/main/LIMITACOES.md

### 3.2. 3IAsParaVencer2048

**Repositório:**  
https://github.com/SamuelMatos78/3IAsParaVencer2048

**Tecnologias:** C, algoritmos, inteligência artificial e heurísticas.

Projeto de desenvolvimento e comparação de três agentes capazes de jogar 2048.

As abordagens incluem:
- Monte Carlo.
- Circular Brain.
- MacroIA, que combina características das anteriores.

Explora estratégias de decisão, modelagem de estados, aleatoriedade e avaliação de ações.

Representa o interesse de Samuel em criar mecanismos inteligentes especializados sem depender necessariamente de modelos de linguagem.

### 3.3. Existential Prompt Benchmark

**Repositório:**  
https://github.com/SamuelMatos78/existential-prompt-benchmark

**Tecnologias:** Python, LLMs, benchmarking, engenharia de prompts e avaliação adversarial.

Pesquisa experimental voltada à comparação de estratégias de prompting em modelos de linguagem.

**Características:**
- Quatro modelos avaliados.
- Três estilos de prompt.
- 240 conversas simuladas.
- Cenários comerciais e adversariais.
- Análise de robustez e comportamento.
- Avaliação de diferentes estratégias de persuasão.
- Investigação de violações de regras de negócio e alucinações.

O projeto demonstra preocupação com experimentação e avaliação mensurável de sistemas de inteligência artificial.

Seus resultados mostram vantagens e limitações de diferentes estratégias, em vez de presumir a superioridade de um único método.

### 3.4. pdfall

**Repositório:**  
https://github.com/SamuelMatos78/pdfall

**Tecnologias:** Python, PyMuPDF, Tesseract, PaddleOCR e CLI.

Biblioteca de processamento e extração de conteúdo de arquivos PDF.

Utiliza diferentes mecanismos conforme as características e a qualidade do conteúdo.

**Características:**
- Extração híbrida.
- OCR.
- Mecanismos de fallback.
- Interface de linha de comando.
- Estrutura reutilizável.
- Documentação.
- Estratégias para documentos com diferentes formatos.

O projeto exemplifica o desenvolvimento de ferramentas que transformam problemas recorrentes em componentes de software reutilizáveis.

### 3.5. TestesE

**Repositório:**  
https://github.com/SamuelMatos78/TestesE

**Tecnologias:** Java.

Repositório destinado a exercícios, testes e experimentações técnicas.

Inclui implementações que exploram conceitos de programação, lógica e tratamento de erros.

### Repositórios adicionais

**Catálogo público atualizado:**  
https://github.com/SamuelMatos78?tab=repositories

O catálogo do GitHub deve ser consultado para identificar novos projetos e alterações nas implementações existentes.

## 4. PROJETOS ADICIONAIS CONHECIDOS

Os projetos desta seção foram descritos por Samuel em conversas técnicas. Nem todos possuem repositórios públicos identificados.

### 4.1. Derrisor — Agente inteligente para Balatro

Projeto de desenvolvimento de um sistema algorítmico autônomo capaz de jogar Balatro.

**Características:**
- Motor decisório em C.
- Integração com Python.
- Estruturação de estados e ações.
- Modelagem de cartas e modificadores.
- Avaliação probabilística.
- Heurísticas especializadas.
- Investigação de estratégias de decisão sem expansão temporal extensiva.
- Separação entre o motor de decisão e a interpretação do ambiente.
- Estudos de competitividade e eficiência.

O Derrisor investiga como um algoritmo especializado pode tomar decisões complexas utilizando informações disponíveis ao jogador, sem conhecimento privilegiado do futuro.

O projeto está relacionado à investigação arquitetural H-Suppression.

Não apresentar os resultados sintéticos do H-Suppression como provas de desempenho competitivo em partidas reais de Balatro.

### 4.2. Portfólio pessoal interativo

Projeto em React destinado à apresentação profissional e técnica.

**Características planejadas:**
- Navegação imersiva.
- Terminal interativo.
- Ambientes visuais específicos para projetos.
- Áreas de conquistas e experiências.
- Componentes reutilizáveis.
- Organização orientada a JSON.
- Presets visuais configuráveis.
- Transições contínuas.
- Conteúdo dinâmico.
- Arquitetura extensível.
- Possibilidade de exibir benchmarks e informações de projetos.

A proposta combina identidade visual própria, engenharia frontend e apresentação de projetos técnicos.

### 4.3. ReColhe

Projeto acadêmico de desenvolvimento de software.

Possui planejamento em sprints, histórias de usuário e divisão de responsabilidades.

Samuel é o principal responsável pelo desenvolvimento backend, embora outros integrantes também possam contribuir nessa camada.

### 4.4. AuraMed

Projeto de aplicação web desenvolvido com Java e Spring Boot.

Inclui estrutura de controllers, modelos, repositórios e páginas web.

Explora arquitetura backend, integração de componentes e persistência.

### 4.5. Secure Login

Projeto com Java, Spring Boot e tecnologias relacionadas à autenticação.

Inclui funcionalidades e estudos envolvendo:
- Cadastro de usuários.
- Autenticação.
- Recuperação de senha.
- Validação de entradas.
- Persistência.
- Spring Security.
- Thymeleaf.
- Integração com serviços de e-mail.

## 5. COMPETÊNCIAS E TECNOLOGIAS

### 5.1. Linguagens

Linguagens declaradas ou utilizadas em projetos conhecidos:

- C.
- C++.
- Java.
- Python.
- C#.
- JavaScript.

A experiência em cada linguagem possui diferentes níveis de profundidade. Não atribuir senioridade específica sem evidências.

### 5.2. Desenvolvimento e engenharia

Tecnologias e ferramentas conhecidas:

- Spring Boot.
- Maven.
- React.
- Node.js.
- Git.
- GitHub.
- Linux.
- Ubuntu.
- Docker.
- APIs REST.
- SQL.
- JSON.
- CMake.
- GCC.
- Clang.
- Testes automatizados.
- Processamento de documentos.
- OCR.
- Ferramentas CLI.
- Automação de navegadores.

### 5.3. Inteligência artificial

Áreas de conhecimento e experimentação:

- Modelos de linguagem.
- Inferência local.
- Modelos Mixture of Experts.
- Quantização.
- Engenharia de prompts.
- Benchmarking de modelos.
- Avaliação adversarial.
- Integração de APIs de IA.
- Sistemas de agentes.
- Algoritmos de decisão.
- Monte Carlo.
- MCTS.
- Expectimax.
- Heurísticas especializadas.
- Otimização de desempenho.
- Processamento probabilístico.

Possui experiência experimental com famílias de modelos como Qwen e Mistral, utilizando ferramentas como llama.cpp.

### 5.4. Engenharia de sistemas

Interesses e competências demonstradas:

- Arquitetura de software.
- Algoritmos.
- Programação de baixo nível.
- Desempenho computacional.
- Modularização.
- Abstrações reutilizáveis.
- Modelagem matemática.
- Comparação experimental de algoritmos.
- Sistemas autônomos.
- Automação.
- Otimização sob restrições computacionais.

### 5.5. Idiomas

- Português brasileiro.
- Inglês avançado, conforme LinkedIn.

## 6. PERFIL TÉCNICO E FILOSOFIA DE ENGENHARIA

As características abaixo representam padrões identificados em trabalhos e conversas, não resultados de testes psicológicos.

### 6.1. Orientação ao resultado

Samuel costuma começar pela compreensão do resultado esperado.

Questiona processos intermediários e busca identificar etapas que possam ser eliminadas.

Prefere arquiteturas que alcancem um resultado diretamente quando isso é possível, em vez de simplesmente otimizar uma sequência tradicional de operações.

### 6.2. Preferência por abstrações

Demonstra interesse em representar problemas complexos com regras fundamentais reutilizáveis.

Valoriza soluções que generalizam para diferentes cenários.

Tende a priorizar compreensão de mecanismos em vez de memorização de implementações isoladas.

### 6.3. Interesse por baixo nível

Possui afinidade com sistemas operacionais, programação em C, controle de recursos, desempenho e ferramentas próximas à infraestrutura computacional.

Interessa-se por compreender o funcionamento interno de mecanismos que frequentemente são tratados como caixas-pretas.

### 6.4. Criatividade arquitetural

Demonstra disposição para investigar soluções alternativas quando elas apresentam vantagens técnicas.

Entre as características recorrentes:
- Simplificação de estruturas.
- Eliminação de etapas.
- Reutilização de componentes.
- Automação de trabalho repetitivo.
- Separação de responsabilidades.
- Modularidade.
- Experimentação algorítmica.
- Arquitetura orientada a dados.

A criatividade é particularmente visível em projetos de mecanismos decisórios, automação e interfaces configuráveis.

### 6.5. Validação competitiva e experimentação

Samuel demonstra interesse em avaliar implementações por meio de comparações concretas.

Procura estabelecer condições equivalentes para comparar diferentes algoritmos e estratégias.

Valoriza:
- Benchmarks.
- Métricas de desempenho.
- Experimentos reproduzíveis.
- Análise de limitações.
- Testes adversariais.
- Comparação com métodos existentes.
- Identificação de condições em que uma abordagem perde para outra.

O H-Suppression e o Existential Prompt Benchmark são exemplos públicos dessa orientação.

O H-Suppression é particularmente representativo por preservar resultados negativos, descrever controles experimentais e discutir os limites das conclusões.

O perfil técnico de Samuel combina criatividade arquitetural e interesse por comprovação experimental. Seus projetos apresentam uma linha recorrente de investigação: como alcançar decisões mais eficientes por meio de representações, algoritmos e arquiteturas adequadas ao problema.
