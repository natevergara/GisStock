# FlowStock

App web estática para **contagem visual de estoque** de produtos a partir de CSVs exportados do Bling ERP.

A app permite carregar um CSV de um produto, ver as variações de forma visual, contar estoque por **cor e tamanho**, editar quantidades em uma matriz intuitiva e exportar um CSV pronto para reimportar no Bling.

Não usa backend, banco de dados nem servidor próprio. Tudo roda no navegador.

## Objetivo

Reduzir a fricção de contar inventário físico de roupas.

Em vez de editar um CSV manualmente, a app transforma o arquivo do Bling em uma interface visual:

```txt
CSV do Bling (1 produto)
  ↓
Matriz Cor × Tamanho
  ↓
Contagem física editável
  ↓
CSV corrigido para o Bling
```

## Funcionalidades principais

- Carregamento de CSV de produto exportado do Bling.
- Validação de colunas mínimas necessárias.
- Validação de códigos vazios ou duplicados.
- Editor em matriz **Cor × Tamanho**.
- Inputs grandes para contagem física.
- Imagem do produto no cabeçalho com fallback silencioso.
- Busca por cor.
- Marcação visual de quantidades modificadas.
- Botão "Zerar tudo" com confirmação para resetar todo o estoque a 0.
- Autosave local por produto.
- Exportação de CSV compatível com Bling.
- Processamento 100% local no navegador.

## Stack

- **Build**: Vite
- **Framework**: Preact + TypeScript
- **Estado**: Zustand
- **CSV**: PapaParse
- **Validação**: Zod
- **Estilos**: Tailwind CSS
- **PWA**: vite-plugin-pwa
- **Deploy**: GitHub Pages + GitHub Actions

## Setup local

```bash
npm install
npm run dev      # desenvolvimento local em http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve dist/ localmente
```

## Deploy

O deploy é executado automaticamente pelo GitHub Actions ao fazer push em `main`.

Workflow:

```txt
.github/workflows/deploy.yml
```

O workflow faz:

```txt
checkout
setup-node
npm install
npm run build
upload-pages-artifact
deploy-pages
```

URL pública:

```txt
https://flowstock.nathanielvergara.com
```

## Fluxo de uso

1. Abrir a app.
2. Selecionar o CSV exportado do Bling (um produto por arquivo).
3. Contar estoque na matriz **Cor × Tamanho**.
4. Editar quantidades diretamente nos inputs.
5. Usar "Zerar tudo" se precisar resetar antes de contar.
6. Exportar o CSV corrigido.
7. Reimportar o CSV no Bling.

## Formato esperado do CSV

A app espera um CSV de produto do Bling com delimitador `;` e colunas mínimas:

```txt
Código
Código Pai
Descrição
Estoque
URL Imagens Externas
```

A app não hardcodea todas as colunas do CSV. Ao carregar o arquivo, captura dinamicamente `meta.fields` do PapaParse e usa essa ordem como fonte de verdade para exportar.

**Restrição:** o arquivo deve conter exatamente um produto pai. Arquivos com múltiplos produtos pai são rejeitados.

## Matriz Cor × Tamanho

As variações são organizadas usando o campo `Descrição`.

Formato esperado nas variações:

```txt
COR:Azul Escuro;TAMANHO:G
COR:Branco;TAMANHO:GG
COR:Preto;TAMANHO:M
```

A app extrai:

```txt
COR      → cor da linha
TAMANHO  → coluna de tamanho
```

Exemplo visual:

```txt
Cor / Tamanho       M      G      GG
Amarelo Manteiga   [0]    [0]    [0]
Azul Escuro        [9]    [8]    [0]
Branco             [5]   [33]   [31]
Preto              [0]   [30]   [60]
```

Cada célula atualiza o campo `Estoque` da variação correspondente.

## Exportação CSV

A exportação é pensada para voltar ao Bling com o mínimo de mudança possível.

Regras atuais:

- Preserva a ordem original de colunas usando `meta.fields`.
- Preserva a ordem original de linhas.
- Exporta com delimitador `;`.
- Usa `quotes: true` para proteger células com vírgulas, HTML ou caracteres especiais.
- Usa `\r\n` como quebra de linha.
- Adiciona BOM UTF-8 no início.
- Só modifica a coluna `Estoque`.
- `Estoque` é exportado em formato compatível com Bling: `10,00`, `0,00`, `35,00`.

Exemplo:

```txt
UI:       8
Export:   8,00
```

## Persistência local

A app salva alterações no `localStorage` por produto.

Características:

- Não salva o CSV completo.
- Salva overrides de `Estoque` por variação.
- Salva quais variações foram modificadas.
- Ao carregar um novo CSV, limpa as sessões anteriores para evitar misturar dados antigos.
- Nenhuma informação é enviada a qualquer servidor.

## Privacidade

Tudo ocorre localmente no navegador:

```txt
O CSV não é enviado a um backend.
Não há banco de dados.
Não há APIs externas.
Não há servidor próprio.
```

## Estrutura do projeto

```txt
src/
├── main.tsx
├── app.tsx                     # Alterna entre Upload e Editor
├── index.css                   # Tailwind + ajustes mobile
├── types.ts                    # CsvRow, CsvMeta, ParentGroup, StoredSession
├── schema.ts                   # Validação de colunas, códigos e estrutura
├── lib/
│   ├── csv.ts                  # parseCsv + exportCsv
│   ├── grouping.ts             # buildGroups + firstImageUrl
│   ├── parseDescricao.ts       # COR/TAMANHO → objeto estruturado
│   └── storage.ts              # localStorage por parentCode
├── store/
│   └── useStockStore.ts        # Estado global + ações de estoque
└── components/
    ├── UploadScreen.tsx        # Carregamento inicial do CSV
    ├── EditorScreen.tsx        # Tela de contagem (cabeçalho + busca + matriz)
    ├── StockMatrix.tsx         # Matriz Cor × Tamanho
    └── ExportButton.tsx        # Exportação do CSV
```

## Validação

O arquivo é rejeitado se:

- Faltam colunas obrigatórias → `Arquivo de ERP não compatível. Faltam colunas: ...`
- Há linhas sem `Código` → informa quais linhas
- Há códigos duplicados → lista os códigos repetidos
- Não há nenhum produto pai
- Há mais de um produto pai → `Este editor é otimizado para um produto por arquivo`
- O produto pai não tem variações

## Decisões de produto

### Um produto por arquivo

O editor é otimizado para contar estoque de um produto de cada vez. Arquivos com múltiplos produtos pai são rejeitados na validação.

### Sem backend

A app não precisa de servidor para resolver o problema atual. O fluxo completo roda no navegador: parsear CSV, editar, persistir localmente e exportar.

### Sem modos de edição

O fluxo atual é único:

```txt
Ver estoque atual → escrever contagem física → exportar
```

Menos decisões para o usuário, menos risco operacional.

### Matriz em vez de lista

Para roupas, o estoque se entende melhor como combinação de cor e tamanho. Por isso o editor principal usa uma matriz **Cor × Tamanho** em vez de uma lista longa de SKUs.

## Limitações conhecidas

- A matriz depende de que as variações usem descrições com `COR:` e `TAMANHO:`.
- Se um CSV vier com outro padrão de descrição, essas variações podem ser agrupadas como `Sem cor` ou `ÚNICO`.
- A app não se conecta diretamente ao Bling; trabalha com CSV manual.
- Não há controle multiusuário pois tudo é local.

## Recomendação de teste antes de usar em produção

Para cada mudança importante em `lib/csv.ts` ou no store:

1. Carregar um CSV real do Bling.
2. Exportar sem modificar nada.
3. Comparar colunas, linhas e valores.
4. Editar 2 ou 3 estoques.
5. Exportar novamente.
6. Confirmar que só mudou `Estoque`.

## Estado atual

Editor visual de estoque para um produto por vez a partir de CSV do Bling, otimizado para uso rápido no navegador, sem backend e com exportação compatível com Bling.
