/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Script de Simulação Externa
 * Este script simula o comportamento do Provedor (EMIS/Banco)
 * chamando o nosso Webhook após o cliente efetuar o pagamento.
 *
 * Uso: npx ts-node simulator/trigger-payment-success.ts <PROVIDER_REFERENCE> <PROVIDER_NAME>
 * Exemplo: npx ts-node simulator/trigger-payment-success.ts MCX-1789992278074-cbe73523 MULTICAIXA_EXPRESS
 */

const providerReference = process.argv[2];
const providerName = process.argv[3] || 'MULTICAIXA_EXPRESS';

if (!providerReference) {
  console.error('❌ Erro: Deves fornecer a providerReference.');
  console.log(
    'Uso: npx ts-node simulator/trigger-payment-success.ts <PROVIDER_REFERENCE> [MULTICAIXA_EXPRESS|REFERENCE|E_KWANZA]',
  );
  process.exit(1);
}

const webhookUrl = 'http://localhost:3000/api/v1/webhooks/provider';

const payload = {
  providerReference,
  providerName,
  status: 'SUCCESS',
  externalTransactionId: `EXT-TX-${Date.now()}`,
};

console.log(
  `📡 A simular chamada do provedor (${providerName}) para o nosso Webhook...`,
);
console.log(`Payload:`, JSON.stringify(payload, null, 2));

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async (response) => {
    if (response.ok) {
      console.log(
        '✅ Sucesso! O nosso sistema recebeu e processou a confirmação de pagamento.',
      );
    } else {
      const errorText = await response.text();
      console.error(`❌ Falha! Status: ${response.status}`, errorText);
    }
  })
  .catch((error) => {
    console.error('❌ Erro de rede ao contactar o webhook:', error.message);
  });
