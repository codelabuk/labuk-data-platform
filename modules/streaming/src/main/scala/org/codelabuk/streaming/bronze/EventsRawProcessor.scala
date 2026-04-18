package org.codelabuk.streaming.bronze

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions.{col, current_timestamp, to_date}
import org.apache.spark.sql.streaming.Trigger

object EventsRawProcessor {

  def run(spark: SparkSession): Unit = {

    val kafkaDF = spark.readStream.format("kafka")
      .option("kafka.bootstrap.servers", "labuk-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092")
      .option("subscribe", "raw-events")
      .option("startingOffsets", "earliest")
      .option("failOnDataLoss", "false")
      .option("maxOffsetsPerTrigger", "1000")
      .load()
    val bronzeDF = kafkaDF.selectExpr(
        "CAST(key AS STRING) as kafka_key",
        "CAST(value AS STRING) as event_json",
        "topic as kafka_topic",
        "partition as kafka_partition",
        "offset s kafka_offset",
        "timestamp ad kafka_timestamp"
      )
      .withColumn("ingestion_timestamp", current_timestamp())
      .withColumn("partition_date", to_date(col("kafka_timestamp")))

    val query = bronzeDF.writeStream
      .format("iceberg")
      .outputMode("append")
      .trigger(Trigger.ProcessingTime("10 seconds"))
      .option("path", "iceberg.bronze.raw_events")
      .option("fanout-enabled", "true")
      .start()

    println("[Bronze] Streaming query started")
    println("[Bronze] Checkpoint location: s3a://checkpoints/bronze-raw-events")
    println("[Bronze] Micro-batches every 10 seconds")
    query.awaitTermination()
  }

}
