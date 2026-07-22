from pyspark.sql import SparkSession


def main():
    spark = SparkSession.builder.appName("Sol2").getOrCreate()

    df = spark.read.format("parquet")
           .option("mergeSchema",True)
           .load("s3://bucket-name/path/to/file")
