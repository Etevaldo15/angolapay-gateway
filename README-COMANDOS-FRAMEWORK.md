# Forçar a geração do Cliente Prisma

npx prisma generate

Nota:

1. Pressiona Ctrl + Shift + P (ou Cmd + Shift + P no Mac).
2. Digita: TypeScript: Restart TS server (ou "Reiniciar servidor TS").
3. Pressiona Enter.

# Instalar bibliotecas de validação do NestJS

npm install class-validator class-transformer

# Instalar a biblioteca uuid

npm install uuid
npm install -D @types/uuid

# Instalar Dependências para trabalhar com Kafka na framework

npm install @nestjs/schedule kafkajs

# Instalar o Driver Adapter e o cliente PostgreSQL

npm install @prisma/adapter-pg pg

# Abrir Prisma Studio para visualizar a base de dados conctada

npx prisma studio

# Testar o Fluxo Completo (Opcional, mas Recomendado)

- Cria um pagamento de teste (via Postman, Insomnia ou curl):

curl -X POST http://localhost:3000/api/v1/payments \
-H "Content-Type: application/json" \
-H "x-merchant-id: merchant-test-001" \
-d '{
"externalReference": "ORDER-001",
"idempotencyKey": "idem-key-001",
"amount": 25000,
"currency": "AOA",
"paymentMethod": "MULTICAIXA_EXPRESS"
}'

- Verifica na Base de Dados

docker exec -it angolapay-postgres psql -U angolapay_user -d angolapay_db

Executa QUERY

SELECT * FROM "OutboxEvent" WHERE published = true;

## Matar processos node.js

killall -9 node

# Ou no Linux/Windows, se o acima não funcionar:

# Linux: pkill -f node

# Windows: taskkill /F /IM node.exe

---

curl -m 5 -X POST http://localhost:3000/api/v1/payments \
-H "Content-Type: application/json" \
-H "x-merchant-id: merchant-test-001" \
-d '{
"externalReference": "ORDER-TESTE-003",
"idempotencyKey": "idem-key-teste-003",
"amount": 5000,
"currency": "AOA",
"paymentMethod": "MULTICAIXA_EXPRESS"
}'

# Executar o Script de Simulação de pagamento da EMIS /BANCO

npx ts-node simulator/trigger-payment-success.ts MCX-1789992278074-cbe73523 MULTICAIXA_EXPRESS

MCX-1790697629052-8d7a9750

npx ts-node simulator/trigger-payment-success.ts MCX-1790697629052-8d7a9750 MULTICAIXA_EXPRESS

# Inspecionar as Chaves do Redis no container

docker exec -it angolapay-redis redis-cli KEYS "simulator:express:*"

---

curl -X POST http://localhost:3000/api/v1/payments \
-H "Content-Type: application/json" \
-H "x-merchant-id: merchant-test-001" \
-d '{
"externalReference": "ORDER-REDIS-TEST-001",
"idempotencyKey": "idem-key-redis-001",
"amount": 6000,
"currency": "AOA",
"paymentMethod": "MULTICAIXA_EXPRESS"
}'
