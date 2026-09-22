# Relatório semanal de PRs

Dois workflows do GitHub Actions trabalham juntos:

1. **`daily-snapshot.yml`** (seg a sex, fim do dia) — tira uma "foto" do status
   atual de cada task atribuída a você no GitHub Projects e grava em
   `data/status-log.json`, commitado de volta neste repositório.
2. **`weekly-report.yml`** (terça de manhã) — lê o histórico acumulado por
   esses snapshots, cruza com as PRs do GitHub (pra saber se teve pedido de
   alteração) e manda o e-mail.

## Por que dois workflows, e por que existe um "snapshot diário"

O GitHub Projects (v2) não guarda histórico de quando um item mudou de
status — só o status atual. Diferente de ferramentas como o Linear, não dá
pra perguntar pra API "quando essa task entrou em Em progresso?". Por isso
o `daily-snapshot.yml` existe: ele mesmo constrói esse histórico, comparando
o status de hoje com o de ontem, todo dia útil. A consequência principal:
**a contagem de tempo só começa a valer a partir do dia em que você ativar
esse workflow** — ele não recupera o passado.

## Setup

### 1. Instalar dependências
```
npm install
```

### 2. Descobrir o número do Project
Abra o Project no navegador — a URL tem o formato
`github.com/orgs/SEU_ORG/projects/NUMERO`. Esse número é o `PROJECT_NUMBER`.

### 3. Secrets necessários (Settings → Secrets and variables → Actions)

| Secret | Onde conseguir |
|---|---|
| `GH_PAT` | GitHub → Settings → Developer settings → Personal access tokens (fine-grained). Precisa de: leitura de **Pull requests** e **Contents** no repositório do projeto, e permissão de organização **Projects: Read** (pra ler o Projects v2 via GraphQL). |
| `PROJECT_ORG` | login da organização (ex: `datachamp-processamentos-e-servicos`) |
| `PROJECT_NUMBER` | número do Project (veja o passo 2) |
| `REPORT_GITHUB_OWNER` | dono do repositório onde as PRs são abertas |
| `REPORT_GITHUB_REPO` | nome desse repositório |
| `REPORT_GITHUB_USERNAME` | seu usuário no GitHub (usado tanto pra filtrar tasks atribuídas a você quanto autor das PRs) |
| `GMAIL_USER` | seu e-mail do Gmail |
| `GMAIL_APP_PASSWORD` | Conta Google → Segurança → Verificação em duas etapas (precisa estar ativa) → Senhas de app |
| `BOSS_EMAIL` | e-mail do seu chefe |

O workflow diário também precisa da permissão `contents: write` pra commitar
o snapshot de volta — isso já está declarado no `daily-snapshot.yml`, não
precisa configurar nada extra além dos secrets acima.

### 4. Ajustar nomes de status (se necessário)
Em `src/config.js`, o objeto `STATUS` espera os nomes exatos do seu board
(`"A Fazer"`, `"Em progresso"`, `"Aguardando PR"`, `"Feito"`). Ajuste se o
seu Project usar nomes diferentes.

### 5. Testar localmente
```
cp .env.example .env
# preencha o .env com valores reais
npm run start        # roda o snapshot uma vez (não commita automaticamente fora do Actions)
npm test              # roda os testes da lógica de cálculo
```

### 6. Ativar de verdade
Depois do push:
1. Rode o `daily-snapshot.yml` manualmente (Actions → Run workflow) por
   alguns dias — ou pelo menos duas vezes — antes de confiar no relatório,
   já que ele precisa de pelo menos duas fotos pra detectar uma transição.
2. Rode o `weekly-report.yml` manualmente uma vez pra conferir o e-mail
   antes de deixar o cron rodar sozinho.

## Limitações conhecidas (fora do escopo atual)
- Considera apenas **um** repositório do GitHub e **um** Project.
- O tempo é calculado em **dias corridos**, sem descontar fins de semana.
- A precisão da duração por status é de **~1 dia** (o intervalo entre
  snapshots), não a hora exata da mudança.
- Se uma mudança de status acontecer no fim de semana, ela só é detectada
  no snapshot de segunda-feira.
