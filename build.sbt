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
  .aggregate(common, streaming)
  .settings(
    name := "labuk-data-platform",
    publish / skip := true
  )

// Common module
lazy val common = (project in file("modules/common"))
  .settings(
    name := "labuk-common",
    libraryDependencies ++= Seq(
      "com.typesafe" % "config" % "1.4.3",
      "org.json4s" %% "json4s-jackson" % "4.0.7" ,
      "org.scalatest" %% "scalatest" % "3.2.17" % Test
    )
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
    assembly / mainClass := Some("org.labuk.streaming.Main")  // Fixed package name
  )