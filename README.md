# Relatório semanal de PRs

Dois workflows do GitHub Actions trabalham juntos:

1. **`hourly-snapshot.yml`** (de hora em hora, todo santo dia) — tira uma
   "foto" do status atual de cada task atribuída a você no GitHub Projects e
   grava em `data/status-log.json`, commitado de volta neste repositório.
2. **`weekly-report.yml`** (terça de manhã) — lê o histórico acumulado por
   esses snapshots, cruza com as PRs do GitHub (pra saber se teve pedido de
   alteração) e manda o e-mail.

## Por que dois workflows, e por que existe um "snapshot horário"

O GitHub Projects (v2) não guarda histórico de quando um item mudou de
status — só o status atual. Por isso o `hourly-snapshot.yml` existe: ele
mesmo constrói esse histórico, comparando o status de agora com o da última
foto. A consequência principal: **a contagem de tempo só começa a valer a
partir do momento em que você ativar esse workflow** — ele não recupera o
passado. A frequência é de hora em hora (não diária) porque boa parte das
tasks é resolvida em horas ou minutos — um snapshot diário perderia esse
tipo de mudança rápida quase todas as vezes.

## Horas úteis, não horas corridas

O tempo de cada task (`Dev`, `Review`, `pós-alteração`) é calculado somando
só o que cai dentro do **expediente**: segunda a sexta, 08:00–11:45 e
13:15–18:00 (horário de Brasília). Isso vale pra qualquer intervalo, mesmo
que ele atravesse a noite, o almoço ou o fim de semana — só a parte dentro
do expediente conta. Essa regra está isolada em `src/business-hours.js`.

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
| `GH_PAT` | GitHub → Settings → Developer settings → Personal access tokens (fine-grained). Precisa de: leitura de **Contents**, **Issues** e **Pull requests** no repositório do projeto, e permissão de organização **Projects: Read** (pra ler o Projects v2 via GraphQL). |
| `PROJECT_ORG` | login da organização (ex: `datachamp-processamentos-e-servicos`) |
| `PROJECT_NUMBER` | número do Project (veja o passo 2) |
| `REPORT_GITHUB_OWNER` | dono do repositório onde as PRs são abertas |
| `REPORT_GITHUB_REPO` | nome desse repositório |
| `REPORT_GITHUB_USERNAME` | seu usuário no GitHub (usado tanto pra filtrar tasks atribuídas a você quanto autor das PRs) |
| `GMAIL_USER` | seu e-mail do Gmail |
| `GMAIL_APP_PASSWORD` | Conta Google → Segurança → Verificação em duas etapas (precisa estar ativa) → Senhas de app |
| `BOSS_EMAIL` | e-mail do seu chefe |

O workflow horário também precisa da permissão `contents: write` pra
commitar o snapshot de volta — isso já está declarado no
`hourly-snapshot.yml`, não precisa configurar nada extra além dos secrets
acima.

### 4. Ajustar nomes de status ou expediente (se necessário)
Em `src/config.js`, o objeto `STATUS` espera os nomes exatos do seu board
(`"A Fazer"`, `"Em progresso"`, `"Aguardando PR"`, `"Feito"`). Em
`src/business-hours.js`, o array `WORK_WINDOWS` define o expediente — ajuste
se o horário de trabalho mudar.

### 5. Testar localmente
```
cp .env.example .env
# preencha o .env com valores reais
npm run start        # roda o snapshot uma vez (não commita automaticamente fora do Actions)
npm test              # roda os testes da lógica de cálculo
```

### 6. Ativar de verdade
Depois do push:
1. Rode o `hourly-snapshot.yml` manualmente (Actions → Run workflow) pelo
   menos duas vezes antes de confiar no relatório — ele precisa de pelo
   menos duas fotos pra detectar uma transição.
2. Rode o `weekly-report.yml` manualmente uma vez pra conferir o e-mail
   antes de deixar o cron rodar sozinho.

## Limitações conhecidas (fora do escopo atual)
- Considera apenas **um** repositório do GitHub e **um** Project.
- A precisão da duração por status é de **~1 hora** (o intervalo entre
  snapshots), não o minuto exato da mudança.
- Se uma mudança de status acontecer fora do expediente, ela só é detectada
  no snapshot seguinte, mas o tempo contado corretamente exclui essas horas.
