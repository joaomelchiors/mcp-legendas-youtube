# Origem das saídas do yt-dlp usadas como fixtures

Saídas reais do yt-dlp (cópia local, versão 2026.10.26), sem login nem cookies.

## Consultas (`-J`), gravadas em 2026-11-11

Comando: `yt-dlp --ignore-config --no-cache-dir --skip-download -J --encoding utf-8 <url>`.
O JSON foi **reduzido** aos campos que o MCP usa (`id`, `title`, `language`, `duration`, `channel`, `upload_date`, `subtitles`, `automatic_captions`), mantendo a estrutura do yt-dlp (`{código: [{ext, name}]}`) e **sem nenhuma URL** (as originais são assinadas e carregam dados da nossa rede). O `.stderr.txt` de cada uma é a saída de erro real (só avisos).

| Arquivo | Vídeo | O que testa |
|---|---|---|
| `info-ted.json` | TED `iG9CE55wbtY` | 64 manuais (traduções humanas), 163 automáticas, `en-orig`; `upload_date` no formato `20070107` |
| `info-video-pt.json` | `OhCXEo3lE4A` | idioma `pt-BR`, nenhuma manual, 158 automáticas com `pt-orig` **e** `en-orig` |
| `info-sem-legenda.json` | clipe do U2 `ZhCezZQqxx4` | nenhuma legenda; idioma nulo; o título tem um caractere `�` que veio assim mesmo com `--encoding utf-8` (provavelmente já está no título do YouTube) |
| `info-idioma-nulo.json` | "Me at the zoo" `jNQXAC9IVRw` | idioma nulo; manuais `en` e `de`; automáticas sem `-orig` |

## Saídas de erro

| Arquivo | De onde veio | O que testa |
|---|---|---|
| `erro-video-indisponivel.stderr.txt` | consulta de um ID que não existe | `ERROR: [youtube] xxxxxxxxxxx: This video is unavailable` |
| `erro-429.stderr.txt` | download da faixa `pt` pedindo manual e automática juntas | `ERROR: Unable to download video subtitles for 'pt': HTTP Error 429: Too Many Requests`, com os dois avisos conhecidos antes |
| `sem-legenda-no-idioma.stdout.txt` e `.stderr.txt` | download pedindo um idioma que o vídeo não tem | `There are no subtitles for the requested languages` com código 0 |

## Vídeos com restrição (2026-11-11, 19:44 a 19:46, a partir do Brasil)

Mesmo comando das consultas acima, um vídeo por caso, com pausa de 6 s entre eles. Nos cinco erros, o yt-dlp terminou com **código 1** e escreveu **`null`** na saída padrão; a saída de erro trouxe **só a linha `ERROR:`**, sem os avisos de sempre.

| Arquivo | Vídeo | Linha `ERROR:` (resumida) |
|---|---|---|
| `erro-agendada.stderr.txt` | live agendada da CNN Brasil `Br4gZq_MsUI` | `This live event will begin in 4 days.` |
| `erro-membros.stderr.txt` | Linus Tech Tips `CNbsMah32Ss` | `This video is available to this channel's members on level: ...` |
| `erro-idade.stderr.txt` | trailer da Paramount `JM1G0BXHQyU` | `Sign in to confirm your age. This video may be inappropriate for some users. ...` (segue sugerindo cookies; **não usamos**) |
| `erro-privado.stderr.txt` | vídeo do canal do João `ONqJXjLjiK0` | `Private video. If the owner of this video has granted you access, please sign in. ...` |
| `erro-excluido.stderr.txt` | vídeo do canal do João `HQ0oIljPFqU` | `Video unavailable. This video has been removed by the uploader` (diferente do ID inexistente: `This video is unavailable`) |
| `info-ao-vivo.json` | NASA, Estação Espacial ao vivo, `ROboUHfPUrU` | **sem erro**, código 0: `live_status` `is_live`, `duration` e `language` nulos, nenhuma manual, uma automática `en` (sem `-orig`). Reduzido como os outros, com o campo `live_status` a mais. Da faixa `en` só o nome foi guardado; o formato `vtt` foi posto para manter a estrutura (o MCP só lê os nomes) |

Não colhido: **bloqueio por região** (nenhum vídeo bloqueado no Brasil foi encontrado).

Os avisos de "JavaScript runtime" e "impersonation" aparecem em quase todas as saídas e **não são erros**.
