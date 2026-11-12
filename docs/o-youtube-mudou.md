# O YouTube mudou: o que fazer

Guia curto para quando o MCP parar de trazer legendas. Siga os passos em ordem e pare no primeiro que resolver.

> **Regra:** o MCP só **explica** bloqueios (login, idade, membros, verificação anti-robô); nunca os contorna. Se a saída para um erro for "usar cookies" ou "fingir ser outro programa", ela não serve para este projeto.

## 1. Rode o canário

Na pasta do projeto:

```bash
npm run canario
```

Ele testa o YouTube de verdade com o vídeo do TED, em 3 etapas, e termina com `Resultado: OK` ou `Resultado: FALHOU na etapa N`. Leva uns 20 segundos e faz só 2 pedidos ao YouTube.

- **OK:** o YouTube e o yt-dlp estão bem. O problema está no vídeo pedido (veja a tabela de erros no fim) ou na internet. Pare aqui.
- **FALHOU:** siga para o passo 2.

## 2. Leia qual etapa falhou

A linha `[FALHOU]` diz a etapa, o código do erro e a mensagem. As linhas do yt-dlp que começam com `ERROR:` aparecem logo acima, no próprio terminal.

| Etapa                  | O que costuma ser                                                                                            | Próximo passo                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1. versão do yt-dlp    | `ENGINE_NOT_FOUND`: o `yt-dlp.exe` não está em `%USERPROFILE%\.mcp-legendas-youtube\` (nem em `YT_DLP_PATH`) | Passo 3 (instalar de novo)                                |
| 2. consulta do vídeo   | `RATE_LIMITED`: o YouTube bloqueou por excesso de pedidos                                                    | **Espere** (uma hora ou mais) e rode de novo. Não insista |
| 2. consulta do vídeo   | `ENGINE_FAILED`, `ENGINE_OUTPUT`, ou "esperava ..., veio ..."                                                | O YouTube mudou: passo 3                                  |
| 3. download da legenda | `ENGINE_OUTPUT`, `VTT_PARSE`, ou poucos trechos                                                              | O formato da legenda mudou: passo 3                       |

**Quando o problema aparece no Claude, e não no canário:** o log do MCP fica em
`%LOCALAPPDATA%\claude-cli-nodejs\Cache\<pasta do projeto>\mcp-logs-mcp-legendas-youtube\`.
Abra o arquivo `.jsonl` mais recente e procure por `Server stderr`: lá estão as linhas do MCP (onde procurou o yt-dlp, a pasta das legendas, cada chamada e as linhas `ERROR:` do yt-dlp). Esse caminho foi observado no Claude Code em 2026-11-11 e pode mudar em versões futuras.

## 3. Atualize o yt-dlp

Quase sempre, quando o YouTube muda, a equipe do yt-dlp publica uma correção em poucos dias.

1. **Veja a versão instalada:**
   ```powershell
   & "$env:USERPROFILE\.mcp-legendas-youtube\yt-dlp.exe" --version
   ```
2. **Veja a última publicada:** na página de versões do projeto, `https://github.com/yt-dlp/yt-dlp/releases/latest` (ou em `https://pypi.org/project/yt-dlp/`). Se for a mesma, pule para o passo 5.
3. **Baixe dois arquivos** da página da versão nova, sempre do GitHub oficial: `yt-dlp.exe` e `SHA2-256SUMS` (a lista de checksums).
4. **Confira o checksum**, na pasta onde baixou:
   ```powershell
   $esperado = (Select-String -Path .\SHA2-256SUMS -Pattern ' yt-dlp.exe$').Line.Split(' ')[0]
   $obtido = (Get-FileHash .\yt-dlp.exe -Algorithm SHA256).Hash
   $esperado -eq $obtido
   ```
   Tem que aparecer `True`. Se aparecer `False`, **apague o arquivo** e não use: ele não é o publicado pelo projeto.
5. **Troque o arquivo** em `%USERPROFILE%\.mcp-legendas-youtube\` pelo novo. Não coloque o yt-dlp no PATH: ele é só do MCP.

**Atalho:** o `npm run instalar` faz os passos 3 a 5 sozinho, sempre com a versão anotada no `package.json` (`"config": { "ytDlpVersion": ... }`). Para atualizar, troque esse número pela versão nova, feche o Claude (o MCP usa o arquivo) e rode `npm run instalar`. Se o checksum não conferir, ele descarta o arquivo e não instala nada.

## 4. Rode o canário de novo

```bash
npm run canario
```

Se der OK, rode também o teste ponta a ponta, que pede uma legenda pelo próprio MCP (servidor, yt-dlp e YouTube reais) e confere o arquivo `.md`:

```bash
npm run e2e
```

Se os dois derem OK, abra uma conversa nova no Claude (o MCP reinicia e passa a usar o yt-dlp novo). Pronto.

## 5. Se continuar falhando

1. **Compare o resumo com a fotografia boa.** O canário guarda `canario/ultima-execucao.json`. A fotografia de quando tudo funcionava é `test/fixtures/ytdlp/info-ted.json` (título, idioma `en`, 64 manuais, 163 automáticas, `en-orig`, duração 1203 s). O que mudou entre os dois mostra onde o YouTube mexeu.
2. **Procure se já é um problema conhecido** nas issues do yt-dlp no GitHub, pelo texto da linha `ERROR:`.
3. **Espere a correção** do yt-dlp e volte ao passo 3. Mudar o nosso código só faz sentido se o yt-dlp passar a responder de outro jeito de forma permanente; nesse caso, grave uma fixture nova e ajuste os testes primeiro.

## Os erros e o que cada um quer dizer

Estas são as mensagens que o MCP mostra no Claude. Só `ENGINE_*`, `TIMEOUT`, `RATE_LIMITED`, `VTT_PARSE` e `UNEXPECTED` podem indicar que o YouTube ou o yt-dlp mudou; os outros são do próprio vídeo.

| Código                     | Quer dizer                                  | O que fazer                                  |
| -------------------------- | ------------------------------------------- | -------------------------------------------- |
| `INVALID_URL`              | O link não é de um vídeo do YouTube         | Mandar o link certo                          |
| `INVALID_LANGUAGE`         | O idioma não é um código como `pt` ou `en`  | Mandar o código                              |
| `VIDEO_UNAVAILABLE`        | O ID não existe                             | Conferir o link                              |
| `VIDEO_REMOVED`            | O autor excluiu o vídeo                     | Nada a fazer                                 |
| `VIDEO_PRIVATE`            | Vídeo privado                               | Nada a fazer (o MCP não usa conta)           |
| `MEMBERS_ONLY`             | Só para membros do canal                    | Nada a fazer (o MCP não usa conta)           |
| `AGE_RESTRICTED`           | Restrito por idade, pede login              | Nada a fazer (o MCP não usa conta)           |
| `LIVE_NOT_STARTED`         | Live agendada, ainda não começou            | Pedir depois que a live acontecer e terminar |
| `LIVE_IN_PROGRESS`         | Live acontecendo agora                      | Pedir depois que terminar                    |
| `NO_CAPTIONS`              | O vídeo não tem nenhuma legenda             | Nada a fazer                                 |
| `NO_CAPTIONS_FOR_LANGUAGE` | Não há legenda no idioma pedido             | Escolher um da lista que o MCP mostra        |
| `RATE_LIMITED`             | Excesso de pedidos (429)                    | Esperar; não tentar de novo agora            |
| `TIMEOUT`                  | O yt-dlp passou de 90 s                     | Tentar mais tarde; se repetir, canário       |
| `ENGINE_NOT_FOUND`         | yt-dlp não encontrado                       | Passo 3                                      |
| `ENGINE_FAILED`            | Erro do yt-dlp que não conhecemos           | Canário e log (passos 1 e 2)                 |
| `ENGINE_OUTPUT`            | O yt-dlp respondeu algo inesperado          | Canário (passo 1)                            |
| `VTT_PARSE`                | Não conseguimos ler o arquivo da legenda    | Canário (passo 1)                            |
| `FILE_WRITE_FAILED`        | A legenda veio, mas o arquivo não foi salvo | Ver a pasta `legendas/` ou `LEGENDAS_DIR`    |
| `UNEXPECTED`               | Erro inesperado no nosso código             | Log (passo 2)                                |
| `RESULT_UNDEFINED`         | Erro interno (proteção)                     | Log (passo 2)                                |
