ThisBuild / organization := "org.codelabuk"
ThisBuild / version      := "0.1.0-SNAPSHOT"
ThisBuild / scalaVersion := "2.12.18"

// Assembly merge strategy
ThisBuild / assemblyMergeStrategy := {
  case PathList("META-INF", xs @ _*) => MergeStrategy.discard
  case PathList("reference.conf") => MergeStrategy.concat
  case x => MergeStrategy.first
}

lazy val root = (project in file("."))
  .aggregate(common, producer, streaming)
  .settings(
    name := "labuk-data-platform",
    publish / skip := true
  )

// Common module for spark jobs
lazy val common = (project in file("modules/common"))
  .settings(
    name := "labuk-common",
    libraryDependencies ++= Seq(
      "com.typesafe" % "config" % "1.4.3",
      "org.json4s" %% "json4s-jackson" % "4.0.7" ,
      "org.scalatest" %% "scalatest" % "3.2.17" % Test
    )
  )

lazy val producer = (project in file("modules/producer"))
  .settings(
    name := "labuk-producer",
    libraryDependencies ++= Seq(
      "dev.zio" %% "zio" % "2.0.21",
      "dev.zio" %% "zio-streams" % "2.0.21",
      "dev.zio" %% "zio-json" % "0.6.2",
      "org.apache.kafka" % "kafka-clients" % "3.6.0"

    ),
    assembly / assemblyJarName := "labuk-producer.jar",
    assembly / mainClass := Some("org.codelabuk.producer.EventGenerator")
  )


lazy val streaming = (project in file("modules/streaming"))
  .dependsOn(common)
  .settings(
    name := "labuk-streaming",
    libraryDependencies ++= Seq(
      "org.apache.spark" %% "spark-sql" % "3.5.3" % Provided,
      "org.apache.spark" %% "spark-sql-kafka-0-10" % "3.5.3",
      "org.apache.iceberg" %% "iceberg-spark-runtime-3.5" % "1.5.0" % Provided
    ),
    assembly / assemblyJarName := "labuk-streaming.jar",
    assembly / mainClass := Some("org.codelabuk.streaming.OrchestratorMain")
  )