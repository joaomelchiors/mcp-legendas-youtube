# Revisão de segurança

Feita em 2026-11-11 com o código aberto, item por item. Versão do projeto: 0.1.0; Node 24.18.0; yt-dlp 2026.10.26.

## Resumo

| #   | Item                                              | Resultado                                                      |
| --- | ------------------------------------------------- | -------------------------------------------------------------- |
| 1   | O MCP só executa o yt-dlp, do jeito seguro        | **ok**                                                         |
| 2   | Os nomes de faixa e o idioma passam por validação | **ok**                                                         |
| 3   | As pastas temporárias são apagadas                | **ok**                                                         |
| 4   | Arquivos gravados só nas pastas certas            | **corrigido**: o gravador agora recusa nomes que saem da pasta |
| 5   | O que vai para o log                              | **ok**, com uma observação                                     |
| 6   | Dependências (`npm audit`)                        | **ok** para o que roda; avisos só nas ferramentas de teste     |
| 7   | Conteúdo do vídeo no contexto do Claude           | **mitigado**                                                   |

## 1. Execução de programas

- O MCP executa **um só programa**, o yt-dlp, e nenhum outro. Ele é procurado em `YT_DLP_PATH` ou na pasta privada `~/.mcp-legendas-youtube/`, **nunca no PATH**.
- **Sem shell** (`shell: false`, `src/infra/engine/command-runner.ts:23`): os argumentos chegam ao yt-dlp exatamente como foram montados; nada como `&&`, `|` ou `$VAR` é interpretado.
- **Argumentos em lista**, montados só por nós (`src/infra/engine/ytDlpArguments-builder.ts`); sempre com `--ignore-config` (nenhum arquivo de configuração do yt-dlp no computador muda o comportamento) e `--no-cache-dir`.
- **`--` antes da URL** (linhas 28 e 44): nada depois dele é lido como opção.
- **A URL é remontada a partir do ID** (linha 50), e o ID só passa se tiver exatamente 11 letras, números, `_` ou `-` (`src/domain/urlVideo-vo.ts:13`). O link que o usuário manda nunca chega inteiro ao yt-dlp.
- **Tempo limite** de 90 s por execução; ao passar, o processo é encerrado (`command-runner.ts:29`).
- O MCP **não acessa a rede** por conta própria: quem fala com o YouTube é só o yt-dlp. O único acesso à rede do nosso código é o do instalador (`npm run instalar`), que baixa do GitHub oficial do yt-dlp a versão fixa e a lista de checksums (`src/infra/install/`).

`YT_DLP_PATH` pode apontar para qualquer programa. Isso é aceito de propósito: quem define a variável é o próprio usuário, na configuração do MCP.

## 2. Validação do que chega

- **Idioma que o usuário envia** (o campo `idioma` da ferramenta): vazio, que significa o idioma original, ou um único código (`pt`, `pt-BR`, `zh-Hans`), conferido por `src/domain/language-vo.ts:15`. Listas, `all` (linha 43) e códigos terminados em `-orig`, como `en-orig` (linha 44), são **recusados na entrada**.
- **Isso não impede o MCP de baixar uma faixa `-orig`.** Quem escolhe a `-orig` é a nossa regra de seleção (`src/domain/trackSelection-service.ts`), nunca o usuário: sem idioma, depois da manual, ela usa a `<idioma original>-orig` (linha 70); com idioma, se não houver manual, usa a `<idioma>-orig` (linha 38). O nome da faixa escolhida vem da própria consulta ao YouTube e ainda passa pela validação do item abaixo.
- **Nome da faixa** enviado ao yt-dlp: só letras, números e hífens (`ytDlpArguments-builder.ts:19`); qualquer outra coisa é recusada antes de executar.

## 3. Arquivos temporários

Cada download usa uma pasta temporária própria (`src/infra/engine/ytDlp-engine.ts:45`), apagada no `finally` (linha 49), com ou sem erro. O MCP só **lê** arquivos dessa pasta (linhas 62 e 81).

## 4. Arquivos gravados

| Quem grava   | Onde                                                               | Nome                                                                  |
| ------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| A ferramenta | `legendas/` na pasta em que o Claude foi aberto, ou `LEGENDAS_DIR` | `data_título_idioma_ID.md`, montado só com letras, números, `-` e `_` |
| O canário    | `canario/` na pasta do projeto                                     | `ultima-execucao.json`, fixo                                          |
| O instalador | `~/.mcp-legendas-youtube/`                                         | `yt-dlp.exe` (ou `yt-dlp`), fixo, só depois de conferir o checksum    |

O instalador confere o checksum **na memória, antes de gravar**: um arquivo que não confere nunca chega ao disco. O arquivo certo é gravado com outro nome e só então renomeado, então nunca fica um yt-dlp pela metade.

**Achado e corrigido nesta revisão:** o gravador (`src/infra/storage/folderFile-writer.ts`, antes `transcriptFile-writer.ts`) confiava que o nome vinha limpo. Hoje vem, porque o `TranscriptFileName` só usa caracteres seguros. Mas, se um dia outro código chamasse o gravador com `../fora.md`, ele gravaria fora da pasta; o teste escrito antes da correção mostrou isso (o arquivo caiu na pasta de teste, um nível acima). Agora o gravador **recusa** qualquer nome que não seja só um nome de arquivo (vazio, `.`, `..`, com `/` ou `\`, com letra de unidade ou caminho completo), com `FILE_WRITE_FAILED` e o motivo no log (linhas 19 e 32). Oito testes cobrem isso.

## 5. Log

O log vai para a saída de erro do MCP, que o Claude Code guarda no próprio computador (pasta em [o-youtube-mudou.md](o-youtube-mudou.md), passo 2). Ele registra:

- onde o MCP procurou o yt-dlp e a pasta das legendas (caminhos locais, com o nome da pasta do usuário);
- cada chamada, com o link e o idioma **exatamente como chegaram** (`src/infra/mcp/getTranscript-tool.ts:51`), em `JSON.stringify`, então quebras de linha e aspas não bagunçam o log;
- o resultado (idioma, tipo, código de erro), o caminho do arquivo salvo e as linhas `ERROR:` do yt-dlp.

Não registra o texto da legenda, nem senhas, tokens ou cookies (o MCP não usa nenhum). **Observação:** o log fica só no computador; se for compartilhado, ele mostra os links pedidos e o nome da pasta do usuário.

## 6. Dependências

| Comando                                    | Resultado                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm audit --omit=dev` (o que roda no MCP) | **0 vulnerabilidades**. A única dependência é `@modelcontextprotocol/sdk` 1.32.2                                               |
| `npm audit` (tudo)                         | 19 avisos: 3 baixos e 16 moderados, **todos na cadeia do Jest** (`deepmerge`, `glob`, `minimatch`), **nenhum alto ou crítico** |

Os avisos do Jest **não afetam o MCP**: o Jest só roda nos testes, no computador do desenvolvedor, com arquivos do próprio projeto. A "correção" oferecida pelo `npm audit fix --force` seria rebaixar o Jest para a versão 25, muito mais antiga, o que não faz sentido. Decisão: aceitar e rever quando sair uma versão nova do Jest.

O `deepmerge` não tem versão corrigida publicada (a 4.3.1 é a mais nova). Forçar versões novas de `glob` e `minimatch` dentro do Jest (`overrides`) foi avaliado e descartado: tiraria 18 avisos, mas faria o Jest rodar com versões que ele não testou.

**No instalador:** o `npm run instalar` roda o `npm install` sem a auditoria completa (`--no-audit`), para não mostrar como problema de quem instala os avisos das ferramentas de teste. Em seguida, ele roda `npm run auditoria` (`npm audit --omit=dev --audit-level=high`): confere **só o que o MCP executa**, mostra o resultado e **para a instalação** se aparecer uma vulnerabilidade alta ou crítica.

## 7. Conteúdo do vídeo

Título, canal e legenda são escritos por terceiros. A resposta da ferramenta os coloca entre marcadores, depois de um aviso de que são conteúdo e não instruções. É uma **mitigação**: as outras camadas são o próprio Claude, que trata resultado de ferramenta como informação, e as permissões do Claude Code, que pedem aprovação antes de executar ações.

## Limites conhecidos

- O checksum do instalador protege contra arquivo corrompido ou trocado no caminho, não contra um ataque ao próprio GitHub do yt-dlp.
- O título vai para o arquivo Markdown como está. Um título com Markdown ou HTML aparece formatado no editor; o Obsidian não executa scripts em notas, mas vale saber.
- A saída do yt-dlp é lida inteira na memória; a consulta tem alguns megabytes, sem risco prático.
