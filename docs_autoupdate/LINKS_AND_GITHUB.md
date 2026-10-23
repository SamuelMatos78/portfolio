# Links de teleporte e Git Stats

## Compartilhar destinos

Acrescente `#tp=<id>` ao endereço publicado:

```text
https://SEU-DOMINIO/#tp=derisor
https://SEU-DOMINIO/#tp=about
https://SEU-DOMINIO/#tp=curriculum
https://SEU-DOMINIO/#tp=initiatives
```

Substitua o domínio pelo endereço real. IDs novos registrados pelo helper funcionam automaticamente. A URL passa pelo mesmo intérprete e registro do terminal. `?tp=<id>` também é aceito na entrada e convertido ao formato com hash; parâmetros como UTM são preservados.

Os links da navegação da Home e do cabeçalho são âncoras reais: permitem copiar endereço e abrir em outra aba. Clique normal navega sem recarregar. Os demais botões de viagem atualizam o endereço ao executar `tp`. Voltar/avançar do navegador e recarregar reabrem o destino. Destinos inexistentes geram o erro normal e preservam a cena atual.

O fragmento não exige rewrites na Vercel. Fragmentos comuns, como `#about-preview`, não viram comandos. A URL só executa navegação `tp`, não comandos arbitrários.

Use `CommandLink` para uma navegação com endereço copiável:

```tsx
<CommandLink command="tp pdfall">Conhecer pdfall</CommandLink>
```

Para abrir o terminal, limpar saída e voltar pelo histórico da aplicação, continue usando `CommandButton`. Não use comandos que não sejam de viagem em `CommandLink`. Os cards existentes mantêm seus componentes e estilos.

## Estatísticas do GitHub

`src/data/github.json` configura conta e exclusão de forks. `src/data/github-stats.json` guarda uma coleta real com data, contagens e bytes por linguagem. Versione o snapshot para servir a página/PDF sem chamadas externas no navegador.

```sh
npm run github:update
```

O comando consulta o perfil público, pagina os repositórios do usuário e soma suas linguagens. Não usa nem grava tokens. Só substitui o snapshot após uma coleta completa e válida. Erros de rede/limite preservam o arquivo anterior.

`npm run build` tenta atualizar os dados. Se a API estiver indisponível, usa o último snapshot válido da mesma conta/escopo, conservando sua data. Sem dados válidos, falha. `npm run dev` usa o snapshot local; rode `github:update` para renová-lo durante o desenvolvimento.

O quadro aparece no Sobre mim completo e no currículo; o PDF recebe um resumo com data. As linguagens declaradas pelo autor permanecem. A distribuição do GitHub mede **bytes de código**, não proficiência, tempo de experiência ou autoria de todas as linhas. O escopo atual inclui repositórios públicos próprios, sem forks; não inclui trabalho privado nem todos os projetos de organizações onde o autor contribui.

Não são presumidos commits ou contribuições privadas. Fonte: [API oficial do GitHub](https://docs.github.com/en/rest/repos/repos#list-repository-languages).

## Tema da Home

O preto/dourado usa `.domain-shell--home` em `src/App.css` e regras de apresentação em `src/pages/Home.css`. A classe existe só na Home. As cores dos cards de projetos, generais, iniciativas e carrossel continuam nos estilos/dados originais. Não altere tokens globais para recolorir esses cards sem uma nova solicitação do autor.
