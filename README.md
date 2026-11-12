# mcp-legendas-youtube

Servidor MCP local que entrega ao Claude a **legenda de um vídeo do YouTube** como texto, e guarda uma cópia em Markdown.

Quem busca a legenda é o [yt-dlp](https://github.com/yt-dlp/yt-dlp), um programa público e mantido. O MCP escolhe a melhor legenda, organiza o texto e explica os erros.

## O que ele faz

- Uma ferramenta só: **`get_transcript`**, com dois campos:
  - `url`: o link do vídeo (`youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`) ou só o ID de 11 caracteres;
  - `idioma` (opcional): **um** código, como `pt`, `pt-BR` ou `en`. Vazio = idioma original do vídeo.
- **Prefere a legenda revisada por pessoas** (manual). Sem ela, usa a automática do idioma original do vídeo e **avisa** que é automática.
- Pedindo outro idioma: manual nesse idioma; senão, a automática original nele; senão, a tradução automática do YouTube. Se a tradução falhar, entrega a do idioma original, com aviso.
- A resposta traz título, canal, link, data de publicação, duração e o tipo de legenda, e o texto corrido com **marcas de tempo** em 10%, 25%, 50%, 75% e 90% do vídeo.
- **Salva um arquivo `.md`** com a mesma legenda (detalhes em [Onde ficam os arquivos](#onde-ficam-os-arquivos)).

## O que ele não faz

- **Não usa conta do YouTube**: sem login e sem cookies. Por isso não pega vídeo privado, só para membros ou com restrição de idade. Nesses casos, ele explica o motivo e para.
- **Não contorna bloqueios** (verificação anti-robô, excesso de pedidos, proteção de cópia).
- **Não cria legenda**: só traz a que já existe no YouTube. Vídeo sem legenda continua sem legenda.
- Não baixa vídeo nem áudio.

## Requisitos

- **Node.js 18 ou mais novo** (`node --version`).
- **Claude Code**.
- Windows, macOS ou Linux (no Linux e no macOS, processador x64 ou arm64).
- Python **não** é necessário: o yt-dlp vem como um executável pronto.
- **Git**, para baixar o projeto (ou uma cópia da pasta, veja abaixo).

## Instalação

### 1. Baixe o projeto

O repositório é público: o `git clone` não pede login.

```bash
git clone https://github.com/joaomelchiors/mcp-legendas-youtube.git
```

```bash
cd mcp-legendas-youtube
```

Escolha uma pasta fixa: o registro no Claude aponta para ela. Se mover a pasta depois, remova e registre de novo.

**Sem GitHub:** copie a pasta do projeto **sem** `node_modules/`, `dist/`, `coverage/`, `canario/` e `legendas/`, e siga daqui.

### 2. Instale

Na pasta do projeto, rode:

```bash
npm run instalar
```

Ele faz, em ordem:

1. `npm install` e o build;
2. cria a pasta privada do MCP, `~/.mcp-legendas-youtube/` (no Windows, `%USERPROFILE%\.mcp-legendas-youtube\`);
3. baixa do **GitHub oficial do yt-dlp** a versão fixa do projeto e a lista de checksums dessa versão;
4. **confere o checksum** e só então grava o yt-dlp. Se não conferir, descarta o arquivo e não instala nada;
5. roda o yt-dlp com `--version` para confirmar;
6. mostra o **comando de registro** já com o caminho completo.

O yt-dlp fica **só nessa pasta privada**. Ele não vai para o PATH nem fica disponível para outros programas.

Se o yt-dlp certo já estiver na pasta, nada é baixado de novo.

### 3. Registre no Claude Code

Copie o comando que o instalador mostrou. Ele tem este formato:

```bash
claude mcp add --scope user mcp-legendas-youtube -- node "<pasta do projeto>/dist/index.js"
```

`--scope user` registra para o seu usuário: o MCP funciona em qualquer pasta onde você abrir o Claude. Depois, **abra uma conversa nova** no Claude.

**Variáveis opcionais** entram com `-e`, **depois do nome e logo antes do `--`**:

- `LEGENDAS_DIR`: pasta fixa para os arquivos `.md` (veja [Onde ficam os arquivos](#onde-ficam-os-arquivos));
- `YT_DLP_PATH`: um yt-dlp em outro lugar, em vez do da pasta privada.

```bash
claude mcp add --scope user mcp-legendas-youtube -e LEGENDAS_DIR="<pasta>" -- node "<pasta do projeto>/dist/index.js"
```

Para mudar o registro depois, remova e registre de novo:

```bash
claude mcp remove --scope user mcp-legendas-youtube
```

## Como usar

Peça ao Claude em linguagem normal. Exemplos:

- "Pegue a legenda deste vídeo: https://youtu.be/iG9CE55wbtY"
- "Quero a legenda em português de https://www.youtube.com/watch?v=iG9CE55wbtY"
- "Resuma este vídeo a partir da legenda: https://youtu.be/..."

O Claude converte o nome do idioma ("português") no código (`pt`).

Se não houver legenda no idioma pedido, a resposta lista as legendas que existem, para você escolher.

### Onde ficam os arquivos

- Cada legenda vira um arquivo em **`legendas/`, dentro da pasta onde o Claude foi aberto**.
- Nome do arquivo: `data_título_idioma_ID.md`, por exemplo `2007-01-07_do-schools-kill-creativity-sir-ken-robinson-ted_pt-BR_iG9CE55wbtY.md`.
- Pedir o mesmo vídeo no mesmo idioma de novo **substitui** o arquivo (não duplica).
- Para guardar sempre na mesma pasta (por exemplo, um cofre do Obsidian), registre com a variável **`LEGENDAS_DIR`** (exemplo em [Registre no Claude Code](#3-registre-no-claude-code)).
- A primeira linha da resposta diz onde o arquivo foi salvo. Se não deu para salvar, a legenda vem do mesmo jeito, com um aviso no lugar.

### Conteúdo de terceiros

Título, canal e legenda são escritos por quem publicou o vídeo. A resposta os coloca entre marcadores, com um aviso de que são conteúdo e não instruções. Mesmo assim, desconfie de uma legenda que "peça" alguma coisa ao Claude.

## Manutenção

O YouTube muda de tempos em tempos, e aí o yt-dlp precisa de atualização.

- **Canário**: um teste rápido e real, com um vídeo do TED, que diz se o YouTube ou o yt-dlp mudou. Leva uns 20 segundos e faz só 2 pedidos ao YouTube.

  ```bash
  npm run canario
  ```

  Termina com `Resultado: OK` ou `Resultado: FALHOU na etapa N`, e guarda um resumo em `canario/ultima-execucao.json`.

- **Parou de funcionar?** Siga o guia [docs/o-youtube-mudou.md](docs/o-youtube-mudou.md): canário, qual etapa falhou, onde fica o log do MCP, como atualizar o yt-dlp e o que significa cada erro.

- **Atualizar o yt-dlp**: troque a versão no `package.json`, em `"config": { "ytDlpVersion": "..." }`, pela nova (veja em `https://github.com/yt-dlp/yt-dlp/releases`). Feche o Claude (o MCP usa o arquivo), rode `npm run instalar` e depois `npm run canario`.

- **Atualizar o projeto** (por exemplo, nos outros computadores, depois que a versão nova foi enviada ao repositório): feche o Claude e rode, na pasta do projeto:

  ```bash
  git pull
  ```

  ```bash
  npm run instalar
  ```

## Limites

- Só legendas que **já existem** no YouTube.
- Sem login: **sem** vídeo privado, de membros ou com restrição de idade.
- Live agendada ou em andamento: a legenda só existe depois que a transmissão termina.
- **Excesso de pedidos**: o YouTube pode bloquear por um tempo (erro 429). A saída é esperar, não insistir.
- **Depende do yt-dlp**: quando o YouTube muda, o MCP volta a funcionar quando sai uma versão nova do yt-dlp.
- Cada execução do yt-dlp tem limite de 90 segundos.

## Uso pessoal e termos do YouTube

Este projeto é para **uso pessoal e local**: obter a legenda de vídeos públicos para estudo e anotação, sem redistribuir o conteúdo e sem oferecer como serviço.

Os **termos de uso do YouTube** continuam valendo para quem usa. A licença deste projeto cobre só o código: ela não autoriza baixar conteúdo de ninguém. Use com responsabilidade. Isto não é orientação jurídica.

## Segurança

Revisão completa, item por item, em [docs/seguranca.md](docs/seguranca.md). Em resumo:

- o MCP só executa o yt-dlp, sem shell e com argumentos montados por ele;
- só grava em `legendas/` (ou `LEGENDAS_DIR`), em `canario/` e, na instalação, na pasta privada do yt-dlp;
- o instalador só baixa do GitHub oficial do yt-dlp e confere o checksum antes de gravar.

## Desenvolvimento

```bash
npm test
```

```bash
npm run test:cobertura
```

```bash
npm run tipos:testes
```

```bash
npm run build
```

- `npm test`: todos os testes (Jest), sem internet e sem o yt-dlp real.
- `npm run test:cobertura`: os testes com o relatório de cobertura.
- `npm run tipos:testes`: confere os tipos dos testes.
- `npm run build`: compila para `dist/`.

Organização do código (`src/`):

- `domain/`: as regras (que legenda escolher, os erros), sem depender do yt-dlp;
- `infra/engine/`: o yt-dlp (argumentos, leitura das saídas, legenda VTT);
- `infra/mcp/`: a ferramenta, o servidor MCP e os textos da resposta;
- `infra/storage/`: o arquivo `.md` salvo;
- `infra/canary/` e `infra/install/`: o canário e o instalador;
- `index.ts`, `canary.ts` e `install.ts`: os pontos de entrada.

## Licença

[MIT](LICENSE), © 2026 João Marcos Melchiors.

O yt-dlp tem a própria licença (Unlicense). Ele é baixado do projeto oficial na instalação e não vem junto com este código.
