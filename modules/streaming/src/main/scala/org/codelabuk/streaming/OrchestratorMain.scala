package org.codelabuk.streaming

import org.apache.spark.sql.SparkSession
import org.codelabuk.streaming.bronze.EventsRawProcessor

object OrchestratorMain {
  def main(args: Array[String]): Unit = {
    val jobName = if (args.nonEmpty) args(0) else "bronze"
    println(s"[OrchestratorMain] Initializing Sparksession for job: $jobName")

    val spark = SparkSession.builder()
      .appName(s"labuk-streaming-$jobName")
      .getOrCreate()
    println(s"[Main] Spark version: ${spark.version}")
    println(s"[Main] Starting job: $jobName")

    jobName match {
      case "bronze" =>
        println("[Main] Launching Bronze layer job (Kafka → Iceberg)")
        EventsRawProcessor.run(spark)

      case _ =>
        println(s"[Main] ERROR: Unknown job name: $jobName")
        println("[Main] Valid jobs: bronze, silver, gold")
        sys.exit(1)
    }
  }
}
