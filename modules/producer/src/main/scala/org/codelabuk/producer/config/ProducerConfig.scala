package org.codelabuk.producer.config

case class ProducerConfig(
                         kafkaBootstrapServers: String,
                         topic: String,
                         eventsPerSeconds: Int
                         )

object ProducerConfig {

  def fromEnv: ProducerConfig = ProducerConfig(
    kafkaBootstrapServers = sys.env.getOrElse(
      "KAFKA_BOOTSTRAP_SERVERS", "labuk-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092"
    ),
    topic = sys.env.getOrElse("KAFKA_TOPIC", "raw-events"),
    eventsPerSeconds = sys.env.getOrElse("EVENTS_PER_SECONDS", "10").toInt
  )
}