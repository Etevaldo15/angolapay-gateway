# 🇦🇴 AngolaPay Gateway API

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apache-kafka)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

**AngolaPay Gateway** é uma API de integração de pagamentos de nível enterprise, desenhada para orquestrar métodos de pagamento locais de Angola (Multicaixa Express, Referência Multicaixa e é-Kwanza).

Construída com foco em **resiliência, consistência de dados e segurança**, a arquitetura utiliza padrões avançados de sistemas distribuídos para garantir que nenhuma transação financeira é perdida, mesmo em cenários de falha de rede ou indisponibilidade de provedores.

---

### 🎯 Propósito e Contexto do Projeto

Inspirado nos principais gateways de pagamento do mercado angolano (como **Pay4All** e **ProxyPay**), este projeto serve como uma **Implementação de Referência (Reference Implementation)** e um estudo de caso prático de engenharia de software.

O objetivo principal não é apenas fornecer uma API funcional, mas sim **desmistificar a complexidade arquitetural** por trás de um gateway de pagamentos moderno. Este repositório foi desenhado para desenvolvedores, arquitetos de software e entusiastas de sistemas distribuídos que desejam compreender, na prática, como resolver desafios reais de engenharia financeira, tais como:

- **Consistência Eventual:** Como garantir que o estado do pagamento seja sincronizado entre a base de dados e o message broker sem perder dados (Outbox Pattern).
- **Tolerância a Falhas:** Como o sistema se comporta e recupera quando um provedor externo (ex: rede Multicaixa) está em baixo ou lento (Retry com Dead Letter Queue).
- **Idempotência:** Como prevenir cobranças duplicadas em cenários de retry de rede, um requisito crítico em qualquer sistema financeiro.
- **Desacoplamento:** Como utilizar o Adapter Pattern para integrar múltiplos provedores (Express, Referência, é-Kwanza) sem poluir a lógica de negócio central.

Este projeto funciona como um "mapa" para quem deseja transitar de arquiteturas monolíticas simples para **sistemas distribuídos resilientes e prontos para produção**.

---

## 🏗️ Arquitetura e Padrões de Design

Este projeto não é apenas uma API REST; é um sistema orientado a eventos (Event-Driven) preparado para microserviços.

### Diagrama de Fluxo (End-to-End)

```mermaid
sequenceDiagram
    participant Merchant as Comerciante (ERP/Loja)
    participant API as API Gateway (NestJS)
    participant DB as PostgreSQL (Outbox)
    participant Kafka as Apache Kafka
    participant Consumer as Payment Consumer
    participant Provider as Provedor (Simulado via Redis)
    participant Webhook as Webhook Handler

    Merchant->>API: 1. POST /payments (Idempotency-Key)
    API->>DB: 2. Transação Atómica (Payment + Outbox Event)
    API-->>Merchant: 3. 201 Created (Status: CREATED)

    loop Outbox Worker (Polling)
        DB->>Kafka: 4. Publica evento 'payment.created'
    end

    Kafka->>Consumer: 5. Consome evento
    Consumer->>Provider: 6. Chama Adaptador (Express/Ref/é-Kwanza)
    Provider-->>Consumer: 7. Retorna ProviderReference (QR/Ref)
    Consumer->>DB: 8. Atualiza Status para PENDING + Novo Outbox Event

    Note over Merchant,Webhook: O cliente paga no ATM/App

    Merchant->>Webhook: 9. POST /webhooks/provider (Simulação do Banco)
    Webhook->>Provider: 10. Valida no Redis
    Webhook->>DB: 11. Atualiza Status para SUCCESS + Outbox Event
```

# 🚀 Padrões de Arquitetura e Engenharia de Software

Este documento detalha os principais padrões de arquitetura, segurança e resiliência implementados no ecossistema deste projeto para garantir consistência, isolamento de domínio e alta disponibilidade.

---

## 🛠️ Padrões Implementados

### 📭 Outbox Pattern

- **Problema:** Evita o cenário de _Dual Write_ (escrever na base de dados e publicar num broker de mensajaria sem uma transação unificada).
- **Solução:** Garante a **consistência eventual** absoluta entre a base de dados relacional e o Apache Kafka, assegurando que os eventos são publicados apenas se a transação de negócio for concluída com sucesso.

### 🔌 Adapter Pattern

- **Problema:** Acoplamento do core do negócio a APIs externas de terceiros que podem mudar frequentemente.
- **Solução:** **Desacopla o núcleo da aplicação** das especificidades técnicas e payloads de cada provedor financeiro ou regulador (ex: EMIS, BNA, etc.), facilitando a substituição ou adição de novos parceiros.

### 🔐 OAuth2 (Client Credentials)

- **Problema:** Necessidade de autenticação segura, escalável e sem intervenção humana para fluxos entre sistemas (B2B).
- **Solução:** Implementação de um fluxo seguro baseado em **JSON Web Tokens (JWT)**, controlo de acessos por **scopes granulares** e políticas robustas de **rotação de segredos**.

### 🔄 Idempotência

- **Problema:** Risco de cobranças ou transações duplicadas causadas por _retries_ automáticos em caso de instabilidade de rede.
- **Solução:** Proteção total através do cabeçalho **`Idempotency-Key`**, garantindo que a mesma operação enviada múltiplas vezes resulte num único processamento real.

### 💀 Dead Letter Queue (DLQ)

- **Problema:** Mensagens corrompidas ou falhas permanentes que travam o processamento das filas de eventos (cenário de _poison pill_).
- **Solução:** Mecanismo de **retry controlado com contagem de tentativas**. Caso o limite seja atingido, o evento é movido para uma DLQ isolada, evitando loops infinitos e degradação do cluster Kafka.

### 🕵️ Distributed Tracing

- **Problema:** Dificuldade em rastrear o fluxo de uma requisição num ambiente distribuído ou assíncrono.
- **Solução:** Injeção e propagação automática de um **`Correlation-ID`** em todos os logs, chamadas HTTP e eventos de mensajaria, simplificando o _troubleshooting_ e a observabilidade.

---

## 💻 Tecnologias Relevantes

- **Mensajaria:** Apache Kafka
- **Autenticação:** OAuth2 / JWT
- **Base de Dados:** PostgreSQL / Redis
- **Observabilidade:** Prometheus / Grafana Loki

## 📂 Estrutura do Projeto

A arquitetura do **angolapay-gateway** segue rigorosamente o princípio de **Separação de Responsabilidades (SoC - Separation of Concerns)**. O código está organizado para isolar a infraestrutura técnica, as regras de negócio (domínio) e as ferramentas de suporte/simulação externa.

```text
angolapay-gateway/
├── prisma/                 # Schema do banco de dados e migrations (OR/M)
├── simulator/              # Scripts e ferramentas de simulação externa (ex: triggers de webhook)
├── src/
│   ├── infrastructure/     # Detalhes técnicos e integrações com o mundo exterior
│   │   ├── database/       # Inicialização e gestão do PrismaService
│   │   ├── kafka/          # Configurações, Producers e Consumers de eventos
│   │   ├── redis/          # Cliente e gestão de cache/bloqueios no Redis
│   │   └── providers/      # Adapters e Factory dos provedores (EMIS, BNA, etc.)
│   │
│   ├── modules/            # O Core da aplicação dividido por Domínios (Bounded Contexts)
│   │   ├── auth/           # Mecanismos de OAuth2, geração de JWT e Guards de segurança
│   │   ├── merchants/      # Regras de negócio e gestão de comerciantes/clientes B2B
│   │   ├── payments/       # Fluxo core de pagamentos e o Worker do Outbox Pattern
│   │   └── webhooks/       # Endpoints para receção de confirmações assíncronas externas
│   │
│   └── shared/             # Recursos partilhados globalmente (Ex: Middlewares de Correlation ID)
│
├── docker-compose.yml      # Orquestração da infraestrutura local (Postgres, Kafka, Redis)
└── package.json            # Gestão de dependências e scripts do ecossistema Node.js
```

### 🧱 Divisão de Camadas Básica

- **`infrastructure/`**: Contém tudo o que é utilitário técnico. Se decidirmos trocar o Prisma por outro ORM ou o Kafka por outro broker, as alterações concentram-se aqui.
- **`modules/`**: O coração do ecossistema. Cada pasta representa um contexto bem definido da aplicação, garantindo que as regras de negócio de pagamentos não se misturem com a gestão de comerciantes.
- **`shared/`**: Componentes transversais que servem todas as camadas, como filtros de exceção globais, validadores ou interceptores de logs.

## 🛠️ Tech Stack

O ecossistema do projeto foi construído utilizando tecnologias modernas, fortemente tipadas e preparadas para ambientes de alta concorrência:

- **Runtime & Framework:** Node.js com **NestJS** (Arquitetura modular e escalável)
- **Linguagem:** **TypeScript** configurado em _Strict Mode_ (Máxima segurança em tempo de compilação)
- **Banco de Dados:** **PostgreSQL** com **Prisma ORM** (Modelagem de dados robusta e migrações tipadas)
- **Message Broker:** **Apache Kafka** através da biblioteca **KafkaJS** (Mensajaria assíncrona de alta performance)
- **Cache & Estado Distribuído:** **Redis** (Controlo de idempotência e cache rápido)
- **Autenticação:** **Passport.js**, **JWT** e **Bcrypt** (Segurança B2B e hashing avançado)
- **Documentação:** **Swagger (OpenAPI)** (Documentação interativa de rotas e payloads)
- **Infraestrutura:** **Docker** e **Docker Compose** (Contentorização completa do ambiente)

---

## 🚀 Como Executar o Projeto

### 📋 Pré-requisitos

Antes de começar, certifica-te de que tens instalado na tua máquina:

- **Node.js** (Versão 18 ou superior)
- **Docker** & **Docker Compose**

### ⚙️ Passo a Passo para Execução

1. **Clonar o Repositório:**

   ```bash
   git clone https://github.com
   cd angolapay-gateway
   ```

2. **Instalar as Dependências:**

   ```bash
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Cria um ficheiro `.env` na raiz do projeto com base no ficheiro de exemplo:

   ```bash
   cp .env.example .env
   ```

4. **Subir a Infraestrutura (Postgres, Kafka, Redis):**

   ```bash
   docker-compose up -d
   ```

5. **Executar as Migrations do Banco de Dados:**
   Gera as tabelas necessárias no PostgreSQL através do Prisma:

   ```bash
   npx prisma migrate dev
   ```

6. **Iniciar a Aplicação:**

   ```bash
   # Ambiente de Desenvolvimento (com live reload)
   npm run start:dev

   # Ambiente de Produção
   npm run build
   npm run start:prod
   ```

7. **Aceder à Documentação:**
   Com a aplicação a rodar, podes testar os endpoints através da interface do Swagger em:
   `http://localhost:3000/api` _(ou a porta definida no teu .env)_

## 🚀 Guia de Instalação e Execução

Siga os passos abaixo para configurar o ambiente de desenvolvimento local.

### 1. Configuração do Ambiente

Clone o repositório e instale as dependências do projeto:

```bash
git clone https://github.com/<teu-usuario>/angolapay-gateway.git
cd angolapay-gateway
npm install
```

### 2. Subir a Infraestrutura Core

Inicie os contentores do **PostgreSQL, Kafka e Redis** em segundo plano:

```bash
docker-compose up -d
```

### 3. Configurar Variáveis de Ambiente

Crie um ficheiro `.env` na raiz do projeto com base no modelo abaixo:

```env
# Conexões com a Infraestrutura
DATABASE_URL="postgresql://angolapay_user:angolapay_secret@localhost:5433/angolapay_db"
KAFKA_BROKERS="localhost:9092"
REDIS_URL="redis://localhost:6380"

# Segurança e Autenticação
JWT_SECRET="altere-para-uma-chave-secreta-forte"
JWT_EXPIRES_IN="1h"
ADMIN_API_KEY="chave-mestra-para-criar-comerciantes"
```

### 3. Inicializar a Base de Dados e Iniciar a API

Sincronize o schema do Prisma com o banco de dados, gere os clientes de tipagem e inicialize o servidor em modo de desenvolvimento:

```bash
npx prisma db push
npx prisma generate
npm run start:dev
```

---

### 4. (Opcional) Subir a Stack de Monitorização

Para visualizar métricas em tempo real, sobe os serviços de observabilidade:

```bash
cd monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

- **Grafana:** [http://localhost:3001](http://localhost:3001) (Credenciais: `admin` / `admin123`)
- **Prometheus:** [http://localhost:9090](http://localhost:9090)

## 📊 Observabilidade e Métricas de Negócio

O gateway expõe um endpoint padronizado em `/api/v1/metrics` que é recolhido pelo Prometheus. As principais métricas de negócio implementadas são:

1. **`payment_processed_total` (Counter):** Total de pagamentos processados, segmentados por método de pagamento e status final.
2. **`webhook_processing_duration_seconds` (Histogram):** Latência de processamento dos webhooks, permitindo calcular percentis (P50, P90, P99) para monitoramento de performance.

### 🖼️ Dashboard no Grafana

![Dashboard do Grafana](assets/grafana-dashboard.png)

### 🖼️ Prometheus Metrics

![Dashboard do Grafana](assets/prometheus-metrics.png)

## 📚 Documentação da API (Swagger)

A API possui documentação viva e interativa através do Swagger. Com a aplicação em execução, aceda ao endereço abaixo para consultar todos os endpoints, esquemas e payloads disponíveis:

👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

---

## 🧪 Roteiro de Teste (End-to-End)

Para testar o fluxo transacional completo de ponta a ponta na sua máquina local, siga este roteiro sequencial:

1. **Criar Comerciante:** Submeta um `POST /api/v1/merchants` incluindo o cabeçalho `x-admin-api-key` com o valor definido no seu `.env`.
2. **Autenticar:** Faça um `POST /auth/token` enviando no corpo (body) o `clientId` e `clientSecret` gerados para o comerciante.
3. **Autorizar no Swagger:** Copie o token JWT retornado, clique no botão **"Authorize"** no topo da página do Swagger e cole o token para desbloquear os endpoints protegidos.
4. **Criar Pagamento:** Envie um `POST /api/v1/payments` para dar início à transação.
5. **Simular Confirmação do Banco:** Para validar a receção assíncrona do webhook, execute o script do simulador passando a referência gerada e o canal de pagamento (ex: `MULTICAIXA_EXPRESS`):
   ```bash
   npx ts-node simulator/trigger-payment-success.ts <providerReference> MULTICAIXA_EXPRESS
   ```

---

## 🗺️ Roadmap (Próximas Fases)

O desenvolvimento do gateway está estruturado em fases incrementais de maturidade, segurança e robustez transacional. Abaixo encontras o progresso atual do ecossistema:

- [x] **Core Transactional Flow:** Autenticação OAuth2, Outbox Pattern, Kafka, Adapters e Tracing distribuído.
- [x] **Webhook Simulation & State Machine:** Simulação de confirmação de pagamento e máquina de estados (`CREATED` ➡️ `PENDING` ➡️ `SUCCESS`).
- [ ] **Fase 2: Production Webhooks & Security:** Integração real com APIs de provedores, validação de assinatura HMAC nos payloads, controlo estrito de idempotência e sistema de retry de webhooks para comerciantes com _exponential backoff_.
- [ ] **Fase 3: Reconciliation Engine:** Leitura, parser e processamento automatizado de ficheiros de acerto bancário (_Settlement Files_) para deteção, auditoria e resolução de discrepâncias financeiras.
- [ ] **Fase 4: Settlements & Ledger:** Motor dinâmico de cálculo de taxas de intermediação (MDR), geração de ficheiros de repasse em lote (_payout batch_) e implementação de razão contabilístico (_Ledger_) com partida dobrada.
- [ ] **Fase 5: Observability:** Monitorização em tempo real, dashboards com métricas de negócio (taxa de conversão, TPS, volume financeiro) e alertas inteligentes com **Prometheus**, **Grafana** e **OpenTelemetry**.
