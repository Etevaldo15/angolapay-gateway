# Comandos Docker imporratntes para troubleshooting

- 1. Primeiro verifica as redes do pgAdmin

docker inspect pgadmin --format='{{json .NetworkSettings.Networks}}'

docker inspect angolapay-postgres --format='{{json .NetworkSettings.Networks}}'

- Conectar o pgAdmin a rede do PostgresSQL do container que criamos

docker network connect angolapay-gateway_angolapay-net pgadmin

Nota: Isso não reinicia nem recria o pgAdmin e não afeta os outros bancos.

# Criar o Tópico no Kafka via docker command terminal

docker exec -it angolapay-kafka kafka-topics \
--bootstrap-server localhost:9092 \
--create \
--topic angolapay-payments \
--partitions 3 \
--replication-factor 1

# Aceder ao Kafka UI no browser contido no Docker

http://localhost:8085

## Validação de volumes de container no docker

# 1. Listar todos os volumes e filtrar pelo nome do nosso volume

docker volume ls | grep angolapay_kafka_data

# 2. Inspecionar os detalhes do volume (confirma a criação e o caminho no host)

docker volume inspect angolapay_kafka_data

# 3. Verificar se o volume está efetivamente montado no container do Kafka

docker inspect angolapay-kafka --format='{{json .Mounts}}' | grep angolapay_kafka_data
